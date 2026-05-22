import * as XLSX from "xlsx";

export interface ParsedQuestion {
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
  category: string | null;
  difficulty: "easy" | "medium" | "hard";
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  /** For single-choice types (multiple_choice, true_false, binary) */
  correct_answer: "A" | "B" | "C" | "D";
  /** For checkbox type: comma-separated correct labels, e.g. "A,C" */
  correct_answers: string;
  points: number;
}

export interface ParsedParticipant {
  name: string;
  nik: string;
  jabatan?: string | null;
  sub_dept?: string | null;
}

export interface ParsedArchiveQuestion {
  question_text: string;
  question_type: "multiple_choice";
  category: string | null;
  difficulty: "easy" | "medium" | "hard";
  default_points: number;
  options: { option_text: string; option_label: string; is_correct: boolean }[];
}

/**
 * Parse an Excel file for questions.
 *
 * Required columns: question_text, correct_answer, points
 * For multiple_choice: option_a, option_b, option_c, option_d
 * For true_false:      question_type = "true_false", correct_answer = A (Benar) or B (Salah)
 * Optional columns:   question_type, category, difficulty
 *
 * Templates available: see README.
 */
export function parseQuestionsExcel(buffer: ArrayBuffer): ParsedQuestion[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No sheet found in the Excel file");

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  if (rows.length === 0) throw new Error("No data found in the Excel file");

  return rows.map((row, index) => {
    const questionText = String(row.question_text ?? row.Question ?? row.question ?? row.Pertanyaan ?? row.pertanyaan ?? "").trim();
    const correctRaw = String(row.correct_answer ?? row.answer ?? row.Answer ?? row.Jawaban ?? row.jawaban ?? "").trim().toUpperCase();
    const points = Number(row.points ?? row.Points ?? 10);

    const rawType = String(row.question_type ?? row.type ?? "multiple_choice").trim().toLowerCase();
    type QType = "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
    const questionType: QType =
      rawType === "true_false" || rawType === "true/false" || rawType === "tf" ? "true_false"
      : rawType === "binary" || rawType === "ya/tidak" || rawType === "yes/no" ? "binary"
      : rawType === "checkbox" || rawType === "check" || rawType === "multi" ? "checkbox"
      : rawType === "essay" || rawType === "uraian" ? "essay"
      : "multiple_choice";

    const rawDifficulty = String(row.difficulty ?? row.Difficulty ?? "medium").trim().toLowerCase();
    const difficulty: "easy" | "medium" | "hard" =
      rawDifficulty === "easy" || rawDifficulty === "mudah"
        ? "easy"
        : rawDifficulty === "hard" || rawDifficulty === "sulit"
        ? "hard"
        : "medium";

    const category = String(row.category ?? row.Category ?? row.kategori ?? "").trim() || null;

    if (!questionText) throw new Error(`Row ${index + 2}: Missing question text`);

    // ── Essay: no options needed ──────────────────────────────
    if (questionType === "essay") {
      return {
        question_text: questionText,
        question_type: "essay",
        category,
        difficulty,
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "A" as const,
        correct_answers: "",
        points: isNaN(points) ? 10 : points,
      };
    }

    // ── True/False: A = Benar, B = Salah ─────────────────────
    if (questionType === "true_false") {
      if (!["A", "B"].includes(correctRaw)) {
        throw new Error(
          `Row ${index + 2}: Untuk soal true_false, correct_answer harus A (Benar) atau B (Salah)`
        );
      }
      return {
        question_text: questionText,
        question_type: "true_false",
        category,
        difficulty,
        option_a: "Benar",
        option_b: "Salah",
        option_c: "",
        option_d: "",
        correct_answer: correctRaw as "A" | "B",
        correct_answers: "",
        points: isNaN(points) ? 10 : points,
      };
    }

    // ── Binary: A = Ya, B = Tidak ─────────────────────────────
    if (questionType === "binary") {
      if (!["A", "B"].includes(correctRaw)) {
        throw new Error(
          `Row ${index + 2}: Untuk soal binary, correct_answer harus A (Ya) atau B (Tidak)`
        );
      }
      return {
        question_text: questionText,
        question_type: "binary",
        category,
        difficulty,
        option_a: "Ya",
        option_b: "Tidak",
        option_c: "",
        option_d: "",
        correct_answer: correctRaw as "A" | "B",
        correct_answers: "",
        points: isNaN(points) ? 10 : points,
      };
    }

    // ── Checkbox: multiple correct (correct_answers = comma-separated e.g. "A,C") ──
    if (questionType === "checkbox") {
      const cbOptA = String(row.option_a ?? row.A ?? row.a ?? "").trim();
      const cbOptB = String(row.option_b ?? row.B ?? row.b ?? "").trim();
      const cbOptC = String(row.option_c ?? row.C ?? row.c ?? "").trim();
      const cbOptD = String(row.option_d ?? row.D ?? row.d ?? "").trim();
      if (!cbOptA || !cbOptB) throw new Error(`Row ${index + 2}: Soal checkbox minimal butuh opsi A dan B`);
      const rawCA = String(row.correct_answers ?? row.correct_answer ?? row.Jawaban ?? "").trim().toUpperCase();
      if (!rawCA) throw new Error(`Row ${index + 2}: Soal checkbox butuh kolom correct_answers (contoh: "A,C")`);
      const labels = rawCA.split(",").map((s) => s.trim()).filter(Boolean);
      const invalid = labels.filter((l) => !["A", "B", "C", "D"].includes(l));
      if (invalid.length > 0) throw new Error(`Row ${index + 2}: correct_answers berisi label tidak valid: ${invalid.join(", ")}`);
      return {
        question_text: questionText,
        question_type: "checkbox",
        category,
        difficulty,
        option_a: cbOptA,
        option_b: cbOptB,
        option_c: cbOptC,
        option_d: cbOptD,
        correct_answer: "A" as const,
        correct_answers: rawCA,
        points: isNaN(points) ? 10 : points,
      };
    }

    // ── Multiple Choice (default) ─────────────────────────────
    const optA = String(row.option_a ?? row.A ?? row.a ?? "").trim();
    const optB = String(row.option_b ?? row.B ?? row.b ?? "").trim();
    const optC = String(row.option_c ?? row.C ?? row.c ?? "").trim();
    const optD = String(row.option_d ?? row.D ?? row.d ?? "").trim();

    if (!optA || !optB || !optC || !optD) throw new Error(`Row ${index + 2}: Opsi A, B, C, D wajib diisi untuk soal pilihan ganda`);
    if (!["A", "B", "C", "D"].includes(correctRaw)) {
      throw new Error(`Row ${index + 2}: correct_answer tidak valid "${correctRaw}". Harus A, B, C, atau D`);
    }

    return {
      question_text: questionText,
      question_type: "multiple_choice",
      category,
      difficulty,
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      correct_answer: correctRaw as "A" | "B" | "C" | "D",
      correct_answers: "",
      points: isNaN(points) ? 10 : points,
    };
  });
}

/**
 * Parse an Excel file for participants.
 * Expected columns: name, email
 */
export function parseParticipantsExcel(buffer: ArrayBuffer): ParsedParticipant[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No sheet found in the Excel file");

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  if (rows.length === 0) throw new Error("No data found in the Excel file");

  return rows.map((row, index) => {
    const name = String(row.name ?? row.Name ?? row.nama ?? "").trim();
    const nik = String(row.nik ?? row.NIK ?? row.Nik ?? "").trim();

    if (!name) throw new Error(`Row ${index + 2}: Missing name`);
    if (!nik) throw new Error(`Row ${index + 2}: Missing NIK`);

    const jabatan = String(row.jabatan ?? row.Jabatan ?? row.position ?? row.Position ?? "").trim() || null;
    const sub_dept = String(row.sub_dept ?? row["Sub Dept"] ?? row.subdept ?? row.SubDept ?? row.sub_department ?? "").trim() || null;

    return { name, nik, jabatan, sub_dept };
  });
}

/**
 * Parse an Excel file for archive (Bank Soal) questions.
 * Supported columns: Kategori/category, Pertanyaan/question_text, A, B, C, D, Jawaban/correct_answer
 * Optional: difficulty (default: medium), points (default: 10)
 */
export function parseArchiveQuestionsExcel(buffer: ArrayBuffer): ParsedArchiveQuestion[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No sheet found in the Excel file");

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  if (rows.length === 0) throw new Error("No data found in the Excel file");

  return rows.map((row, index) => {
    const questionText = String(
      row.Pertanyaan ?? row.pertanyaan ?? row.question_text ?? row.Question ?? row.question ?? ""
    ).trim();
    const correctRaw = String(
      row.Jawaban ?? row.jawaban ?? row.correct_answer ?? row.answer ?? row.Answer ?? ""
    ).trim().toUpperCase();

    const category = String(
      row.Kategori ?? row.kategori ?? row.category ?? row.Category ?? ""
    ).trim() || null;

    const rawDifficulty = String(row.difficulty ?? row.Difficulty ?? row.tingkat ?? "medium").trim().toLowerCase();
    const difficulty: "easy" | "medium" | "hard" =
      rawDifficulty === "easy" || rawDifficulty === "mudah" ? "easy"
      : rawDifficulty === "hard" || rawDifficulty === "sulit" ? "hard"
      : "medium";

    const points = Number(row.points ?? row.Points ?? row.nilai ?? 10);

    if (!questionText) throw new Error(`Row ${index + 2}: Missing question text (Pertanyaan)`);

    const optA = String(row.A ?? row.option_a ?? "").trim();
    const optB = String(row.B ?? row.option_b ?? "").trim();
    const optC = String(row.C ?? row.option_c ?? "").trim();
    const optD = String(row.D ?? row.option_d ?? "").trim();

    if (!optA || !optB || !optC || !optD) throw new Error(`Row ${index + 2}: Missing answer options (A, B, C, D)`);
    if (!["A", "B", "C", "D"].includes(correctRaw)) {
      throw new Error(`Row ${index + 2}: Invalid answer key "${correctRaw}". Must be A, B, C, or D`);
    }

    const options = [
      { option_text: optA, option_label: "A", is_correct: correctRaw === "A" },
      { option_text: optB, option_label: "B", is_correct: correctRaw === "B" },
      { option_text: optC, option_label: "C", is_correct: correctRaw === "C" },
      { option_text: optD, option_label: "D", is_correct: correctRaw === "D" },
    ];

    return {
      question_text: questionText,
      question_type: "multiple_choice" as const,
      category,
      difficulty,
      default_points: isNaN(points) ? 10 : points,
      options,
    };
  });
}
