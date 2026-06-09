import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const DEFAULT_PASSWORD = "user123";

export async function POST(req: NextRequest) {
  // Verify the caller is an authenticated admin
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

  try {
    const body = await req.json();
    const { participantId } = body as { participantId: string };

    if (!participantId) {
      return NextResponse.json({ success: false, message: "Missing participantId" }, { status: 400 });
    }

    // Get the participant's auth user_id
    const { data: participant, error: pError } = await supabaseAdmin
      .from("participants")
      .select("user_id, name")
      .eq("id", participantId)
      .single();

    if (pError || !participant?.user_id) {
      return NextResponse.json({ success: false, message: "Participant not found" }, { status: 404 });
    }

    // Reset password via admin API (bypasses RLS and auth restrictions)
    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
      participant.user_id,
      { password: DEFAULT_PASSWORD }
    );

    if (resetError) {
      return NextResponse.json({ success: false, message: resetError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Password ${participant.name} berhasil direset ke "${DEFAULT_PASSWORD}"`,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
