import * as XLSX from "xlsx";

export interface ParsedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  points: number;
}

export interface ParsedParticipant {
  name: string;
  nik: string;
}

/**
 * Parse an Excel file for questions.
 * Expected columns: question_text, option_a, option_b, option_c, option_d, correct_answer, points
 */
export function parseQuestionsExcel(buffer: ArrayBuffer): ParsedQuestion[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No sheet found in the Excel file");

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  if (rows.length === 0) throw new Error("No data found in the Excel file");

  return rows.map((row, index) => {
    const questionText = String(row.question_text ?? row.Question ?? row.question ?? "").trim();
    const optA = String(row.option_a ?? row.A ?? row.a ?? "").trim();
    const optB = String(row.option_b ?? row.B ?? row.b ?? "").trim();
    const optC = String(row.option_c ?? row.C ?? row.c ?? "").trim();
    const optD = String(row.option_d ?? row.D ?? row.d ?? "").trim();
    const correctRaw = String(row.correct_answer ?? row.answer ?? row.Answer ?? "").trim().toUpperCase();
    const points = Number(row.points ?? row.Points ?? 10);

    if (!questionText) throw new Error(`Row ${index + 2}: Missing question text`);
    if (!optA || !optB || !optC || !optD) throw new Error(`Row ${index + 2}: Missing options`);
    if (!["A", "B", "C", "D"].includes(correctRaw)) {
      throw new Error(`Row ${index + 2}: Invalid correct_answer "${correctRaw}". Must be A, B, C, or D`);
    }

    return {
      question_text: questionText,
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      correct_answer: correctRaw as "A" | "B" | "C" | "D",
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

    return { name, nik };
  });
}
