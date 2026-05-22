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
  question_type: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
  category: string | null;
  difficulty: "easy" | "medium" | "hard" | "very_hard";
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
 *
 * Supported question_type values:
 *   multiple_choice  → kolom A, B, C, D wajib; correct_answer = A/B/C/D
 *   true_false       → correct_answer = A (Benar) / B (Salah)
 *   binary           → correct_answer = A (Ya) / B (Tidak)
 *   checkbox         → kolom A, B, C, D; correct_answers = comma-separated e.g. "A,C"
 *   essay            → tidak ada opsi/jawaban
 *
 * Kolom wajib: question_text (atau Pertanyaan), question_type
 * Kolom opsional: category/Kategori, difficulty (easy/medium/hard/very_hard), points/nilai
 */
export function parseArchiveQuestionsExcel(buffer: ArrayBuffer): ParsedArchiveQuestion[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No sheet found in the Excel file");

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  if (rows.length === 0) throw new Error("No data found in the Excel file");

  return rows.map((row, index) => {
    const rowNum = index + 2;
    const questionText = String(
      row.Pertanyaan ?? row.pertanyaan ?? row.question_text ?? row.Question ?? row.question ?? ""
    ).trim();
    if (!questionText) throw new Error(`Row ${rowNum}: question_text / Pertanyaan wajib diisi`);

    const category = String(
      row.Kategori ?? row.kategori ?? row.category ?? row.Category ?? ""
    ).trim() || null;

    const rawDifficulty = String(row.difficulty ?? row.Difficulty ?? row.tingkat ?? "medium").trim().toLowerCase();
    const difficulty: "easy" | "medium" | "hard" | "very_hard" =
      rawDifficulty === "easy"      || rawDifficulty === "mudah"          ? "easy"
      : rawDifficulty === "hard"    || rawDifficulty === "sulit"          ? "hard"
      : rawDifficulty === "very_hard" || rawDifficulty === "sangat_sulit" || rawDifficulty === "very hard" ? "very_hard"
      : "medium";

    const points = Number(row.points ?? row.Points ?? row.nilai ?? 10);

    const rawType = String(row.question_type ?? row.type ?? row.tipe ?? "multiple_choice").trim().toLowerCase();
    type AQType = "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
    const questionType: AQType =
      rawType === "true_false"  || rawType === "true/false"  || rawType === "tf"        ? "true_false"
      : rawType === "binary"    || rawType === "ya/tidak"    || rawType === "yes/no"    ? "binary"
      : rawType === "checkbox"  || rawType === "check"       || rawType === "multi"     ? "checkbox"
      : rawType === "essay"     || rawType === "uraian"                                 ? "essay"
      : "multiple_choice";

    // ── Essay ─────────────────────────────────────────────
    if (questionType === "essay") {
      return {
        question_text: questionText,
        question_type: "essay" as const,
        category,
        difficulty,
        default_points: isNaN(points) ? 10 : points,
        options: [],
      };
    }

    // ── True/False ────────────────────────────────────────
    if (questionType === "true_false") {
      const ans = String(row.Jawaban ?? row.jawaban ?? row.correct_answer ?? row.answer ?? "").trim().toUpperCase();
      if (!["A", "B"].includes(ans)) throw new Error(`Row ${rowNum}: true_false → correct_answer harus A (Benar) atau B (Salah)`);
      return {
        question_text: questionText,
        question_type: "true_false" as const,
        category,
        difficulty,
        default_points: isNaN(points) ? 10 : points,
        options: [
          { option_text: "Benar", option_label: "A", is_correct: ans === "A" },
          { option_text: "Salah", option_label: "B", is_correct: ans === "B" },
        ],
      };
    }

    // ── Binary ────────────────────────────────────────────
    if (questionType === "binary") {
      const ans = String(row.Jawaban ?? row.jawaban ?? row.correct_answer ?? row.answer ?? "").trim().toUpperCase();
      if (!["A", "B"].includes(ans)) throw new Error(`Row ${rowNum}: binary → correct_answer harus A (Ya) atau B (Tidak)`);
      return {
        question_text: questionText,
        question_type: "binary" as const,
        category,
        difficulty,
        default_points: isNaN(points) ? 10 : points,
        options: [
          { option_text: "Ya",    option_label: "A", is_correct: ans === "A" },
          { option_text: "Tidak", option_label: "B", is_correct: ans === "B" },
        ],
      };
    }

    // ── Checkbox ──────────────────────────────────────────
    if (questionType === "checkbox") {
      const optA = String(row.A ?? row.option_a ?? "").trim();
      const optB = String(row.B ?? row.option_b ?? "").trim();
      const optC = String(row.C ?? row.option_c ?? "").trim();
      const optD = String(row.D ?? row.option_d ?? "").trim();
      if (!optA || !optB) throw new Error(`Row ${rowNum}: checkbox → minimal opsi A dan B wajib diisi`);
      const rawCA = String(row.correct_answers ?? row.Jawaban ?? row.jawaban ?? row.correct_answer ?? "").trim().toUpperCase();
      if (!rawCA) throw new Error(`Row ${rowNum}: checkbox → kolom correct_answers wajib diisi (contoh: "A,C")`);
      const labels = rawCA.split(",").map((s) => s.trim()).filter(Boolean);
      const invalid = labels.filter((l) => !["A", "B", "C", "D"].includes(l));
      if (invalid.length > 0) throw new Error(`Row ${rowNum}: correct_answers berisi label tidak valid: ${invalid.join(", ")}`);
      const rawOpts = [
        { text: optA, label: "A" },
        { text: optB, label: "B" },
        { text: optC, label: "C" },
        { text: optD, label: "D" },
      ];
      return {
        question_text: questionText,
        question_type: "checkbox" as const,
        category,
        difficulty,
        default_points: isNaN(points) ? 10 : points,
        options: rawOpts.filter((o) => o.text !== "").map((o) => ({
          option_text: o.text,
          option_label: o.label,
          is_correct: labels.includes(o.label),
        })),
      };
    }

    // ── Multiple Choice (default) ─────────────────────────
    const optA = String(row.A ?? row.option_a ?? "").trim();
    const optB = String(row.B ?? row.option_b ?? "").trim();
    const optC = String(row.C ?? row.option_c ?? "").trim();
    const optD = String(row.D ?? row.option_d ?? "").trim();
    if (!optA || !optB || !optC || !optD) throw new Error(`Row ${rowNum}: multiple_choice → opsi A, B, C, D wajib diisi`);
    const correctRaw = String(row.Jawaban ?? row.jawaban ?? row.correct_answer ?? row.answer ?? "").trim().toUpperCase();
    if (!["A", "B", "C", "D"].includes(correctRaw)) {
      throw new Error(`Row ${rowNum}: correct_answer tidak valid "${correctRaw}". Harus A, B, C, atau D`);
    }
    return {
      question_text: questionText,
      question_type: "multiple_choice" as const,
      category,
      difficulty,
      default_points: isNaN(points) ? 10 : points,
      options: [
        { option_text: optA, option_label: "A", is_correct: correctRaw === "A" },
        { option_text: optB, option_label: "B", is_correct: correctRaw === "B" },
        { option_text: optC, option_label: "C", is_correct: correctRaw === "C" },
        { option_text: optD, option_label: "D", is_correct: correctRaw === "D" },
      ],
    };
  });
}

/**
 * Generate a downloadable XLSX template for Bank Soal import.
 * Returns an ArrayBuffer that can be turned into a Blob for browser download.
 */
export function generateArchiveTemplateBuffer(): ArrayBuffer {
  const headers = [
    "question_text",
    "question_type",
    "category",
    "difficulty",
    "points",
    "A",
    "B",
    "C",
    "D",
    "correct_answer",
    "correct_answers",
  ];

  const examples = [
    // multiple_choice
    ["Ibukota negara Indonesia adalah ...", "multiple_choice", "Geografi", "easy", 10, "Jakarta", "Bandung", "Surabaya", "Bali", "A", ""],
    ["Organ yang berfungsi memompa darah adalah ...", "multiple_choice", "Biologi", "medium", 10, "Paru-paru", "Lambung", "Jantung", "Hati", "C", ""],
    // true_false
    ["Matahari terbit dari arah timur", "true_false", "Sains", "easy", 5, "", "", "", "", "A", ""],
    ["Bumi berbentuk datar", "true_false", "Sains", "easy", 5, "", "", "", "", "B", ""],
    // binary
    ["Apakah air mendidih pada suhu 100°C di tekanan normal?", "binary", "Fisika", "medium", 5, "", "", "", "", "A", ""],
    ["Apakah semua logam bersifat magnetis?", "binary", "Fisika", "medium", 5, "", "", "", "", "B", ""],
    // checkbox (multiple correct)
    ["Manakah yang termasuk benua di dunia?", "checkbox", "Geografi", "medium", 15, "Asia", "Atlantis", "Eropa", "Narnia", "", "A,C"],
    ["Pilih gas yang termasuk gas mulia:", "checkbox", "Kimia", "hard", 15, "Helium", "Oksigen", "Argon", "Nitrogen", "", "A,C"],
    // essay
    ["Jelaskan proses terjadinya fotosintesis pada tumbuhan!", "essay", "Biologi", "hard", 25, "", "", "", "", "", ""],
    ["Uraikan dampak pemanasan global terhadap kehidupan laut.", "essay", "Lingkungan", "very_hard", 30, "", "", "", "", "", ""],
  ];

  const sheetData = [headers, ...examples];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column widths
  ws["!cols"] = [
    { wch: 55 }, // question_text
    { wch: 18 }, // question_type
    { wch: 14 }, // category
    { wch: 12 }, // difficulty
    { wch: 7  }, // points
    { wch: 20 }, // A
    { wch: 20 }, // B
    { wch: 20 }, // C
    { wch: 20 }, // D
    { wch: 15 }, // correct_answer
    { wch: 16 }, // correct_answers
  ];

  // Panduan sheet
  const guide = [
    ["PANDUAN IMPORT EXCEL — BANK SOAL"],
    [""],
    ["Kolom wajib:", "question_text, question_type"],
    ["Kolom opsional:", "category, difficulty, points (default: 10)"],
    [""],
    ["NILAI difficulty yang valid:"],
    ["easy", "Mudah"],
    ["medium", "Sedang (default)"],
    ["hard", "Sulit"],
    ["very_hard", "Sangat Sulit"],
    [""],
    ["TIPE SOAL & ATURAN:"],
    [""],
    ["multiple_choice", "Isi kolom A, B, C, D (wajib semua)", "Isi correct_answer dengan satu huruf: A / B / C / D"],
    ["true_false", "Tidak perlu isi kolom A-D (otomatis Benar/Salah)", "correct_answer: A = Benar, B = Salah"],
    ["binary", "Tidak perlu isi kolom A-D (otomatis Ya/Tidak)", "correct_answer: A = Ya, B = Tidak"],
    ["checkbox", "Isi kolom A, B, C, D (minimal A dan B)", "correct_answers: huruf yang benar dipisah koma, misal: A,C atau A,B,D"],
    ["essay", "Tidak perlu isi kolom A-D maupun correct_answer/correct_answers", "Soal akan dinilai manual oleh supervisor/admin"],
    [""],
    ["CATATAN:"],
    ["- Gunakan sheet pertama di file Excel sebagai data soal"],
    ["- Nama kolom header harus tepat seperti contoh di sheet Template"],
    ["- Satu file bisa berisi campuran berbagai tipe soal sekaligus"],
  ];

  const wsGuide = XLSX.utils.aoa_to_sheet(guide);
  wsGuide["!cols"] = [{ wch: 20 }, { wch: 50 }, { wch: 60 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.utils.book_append_sheet(wb, wsGuide, "Panduan");

  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
