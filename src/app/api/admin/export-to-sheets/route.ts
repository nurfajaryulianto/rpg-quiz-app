import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { google } from "googleapis";

// ============================================================
// POST /api/admin/export-to-sheets
// Admin-only. Exports one batch's results to Google Sheets.
// Body: { batchId: string, spreadsheetId?: string }
// Env vars needed:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY   (the full PEM key)
//   GOOGLE_SPREADSHEET_ID                (fallback if not in body)
// ============================================================

export async function POST(req: NextRequest) {
  // ── Auth guard ──────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const accessToken = authHeader?.replace("Bearer ", "");
  if (!accessToken) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  if (authError || !user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { data: caller } = await supabaseAdmin
    .from("participants")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (caller?.role !== "admin") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  // ── Parse body ──────────────────────────────────────────
  let batchId: string;
  let spreadsheetId: string;
  try {
    const body = await req.json();
    batchId = body.batchId;
    spreadsheetId = body.spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID || "";
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  if (!batchId) {
    return NextResponse.json({ success: false, message: "Missing batchId" }, { status: 400 });
  }
  if (!spreadsheetId) {
    return NextResponse.json(
      { success: false, message: "No spreadsheet ID provided. Set GOOGLE_SPREADSHEET_ID env var or pass spreadsheetId in request." },
      { status: 400 }
    );
  }

  // ── Validate Google credentials ─────────────────────────
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!serviceAccountEmail || !privateKeyRaw) {
    return NextResponse.json(
      { success: false, message: "Google service account credentials not configured" },
      { status: 500 }
    );
  }

  // Vercel stores env vars with literal \n; replace back to actual newlines
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  // ── Fetch data from Supabase ─────────────────────────────
  const [batchRes, questionsRes, sessionsRes] = await Promise.all([
    supabaseAdmin.from("batches").select("name").eq("id", batchId).single(),
    supabaseAdmin
      .from("questions")
      .select("id, question_text, category, options(option_label, is_correct)")
      .eq("batch_id", batchId)
      .order("order_index", { ascending: true }),
    supabaseAdmin
      .from("exam_sessions")
      .select("participant_id, score, finished_at, participants(name, nik, jabatan, sub_dept)")
      .eq("batch_id", batchId)
      .eq("status", "completed")
      .order("score", { ascending: false }),
  ]);

  if (batchRes.error) return NextResponse.json({ success: false, message: batchRes.error.message }, { status: 500 });
  if (questionsRes.error) return NextResponse.json({ success: false, message: questionsRes.error.message }, { status: 500 });
  if (sessionsRes.error) return NextResponse.json({ success: false, message: sessionsRes.error.message }, { status: 500 });

  const batchName = (batchRes.data as { name: string }).name;
  const rawQuestions = (questionsRes.data ?? []) as {
    id: string;
    question_text: string;
    category: string | null;
    options: { option_label: string; is_correct: boolean }[];
  }[];
  const rawSessions = (sessionsRes.data ?? []) as {
    participant_id: string;
    score: number;
    finished_at: string | null;
    participants: { name: string; nik: string | null; jabatan: string | null; sub_dept: string | null } | null;
  }[];

  // Build question info with correct label
  const questions = rawQuestions.map((q) => ({
    id: q.id,
    // Truncate to 50 chars for column header readability
    header: q.question_text.length > 50 ? q.question_text.slice(0, 47) + "..." : q.question_text,
    correctLabel: q.options.find((o) => o.is_correct)?.option_label ?? "?",
  }));

  // Build answer map: participantId → questionId → optionLabel
  let answerMap = new Map<string, Map<string, string>>();
  if (rawSessions.length > 0) {
    const participantIds = rawSessions.map((s) => s.participant_id);

    // Fetch answers (selected_option_id) + options (id, option_label) in one join
    const { data: answersData, error: answersError } = await supabaseAdmin
      .from("answers")
      .select("participant_id, question_id, selected_option_id, options(id, option_label)")
      .eq("batch_id", batchId)
      .in("participant_id", participantIds);

    if (answersError) return NextResponse.json({ success: false, message: answersError.message }, { status: 500 });

    for (const ans of answersData ?? []) {
      const a = ans as unknown as {
        participant_id: string;
        question_id: string;
        selected_option_id: string | null;
        options: { id: string; option_label: string } | null;
      };
      const label = a.options?.option_label ?? "-";
      if (!answerMap.has(a.participant_id)) answerMap.set(a.participant_id, new Map());
      answerMap.get(a.participant_id)!.set(a.question_id, label);
    }
  }

  // ── Build sheet rows ─────────────────────────────────────
  // Row 0: Header
  const headerRow = [
    "Timestamp", "Nama", "NIK", "Jabatan", "Sub-Dept", "Score",
    ...questions.map((q) => q.header),
  ];

  // Row 1: Answer key
  const keyRow = [
    "", "Kunci Jawaban", "", "", "", "",
    ...questions.map((q) => q.correctLabel),
  ];

  // Rows 2+: Per participant
  const dataRows = rawSessions.map((s) => {
    const p = s.participants;
    const pAnswers = answerMap.get(s.participant_id);
    return [
      s.finished_at ? new Date(s.finished_at).toLocaleString("id-ID") : "-",
      p?.name ?? "-",
      p?.nik ?? "-",
      p?.jabatan ?? "-",
      p?.sub_dept ?? "-",
      s.score,
      ...questions.map((q) => pAnswers?.get(q.id) ?? "-"),
    ];
  });

  const allRows = [headerRow, keyRow, ...dataRows];

  // ── Google Sheets API ───────────────────────────────────
  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const sheetTitle = batchName.replace(/[^a-zA-Z0-9 _-]/g, "_").slice(0, 100);

  // Get existing sheets
  const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = spreadsheetMeta.data.sheets ?? [];
  const existingSheet = existingSheets.find((sh) => sh.properties?.title === sheetTitle);

  let sheetId: number;

  if (existingSheet) {
    sheetId = existingSheet.properties!.sheetId!;
    // Clear existing data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${sheetTitle}'`,
    });
  } else {
    // Add new sheet tab
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetTitle } } }],
      },
    });
    sheetId = addRes.data.replies?.[0]?.addSheet?.properties?.sheetId ?? 0;
  }

  // Write data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetTitle}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: allRows },
  });

  // Bold the header and key rows
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 2 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat.bold",
          },
        },
      ],
    },
  });

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  return NextResponse.json({ success: true, url, sheetTitle });
}
