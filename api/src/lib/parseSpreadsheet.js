import * as XLSX from 'xlsx';

const QUESTION_HEADER = /^(pregunta|question|q|pergunta)$/i;
const ANSWER_HEADER = /^(respuesta|answer|a|resposta)$/i;
const KEYWORDS_HEADER = /^(keywords|keyword|palabras clave|palavras-chave|tags)$/i;

function cellText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function headerKind(text) {
  const value = cellText(text);
  if (!value) {
    return null;
  }
  if (QUESTION_HEADER.test(value)) {
    return 'question';
  }
  if (ANSWER_HEADER.test(value)) {
    return 'answer';
  }
  if (KEYWORDS_HEADER.test(value)) {
    return 'keywords';
  }
  return null;
}

function detectColumnMap(rows) {
  const fallback = { question: 0, answer: 1, keywords: 2 };

  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) {
      continue;
    }

    const detected = {};
    for (let col = 0; col < row.length; col++) {
      const kind = headerKind(row[col]);
      if (kind && detected[kind] === undefined) {
        detected[kind] = col;
      }
    }

    if (detected.question !== undefined && detected.answer !== undefined) {
      return {
        question: detected.question,
        answer: detected.answer,
        keywords: detected.keywords ?? fallback.keywords,
        startIndex: i + 1,
      };
    }
  }

  return { ...fallback, startIndex: 0 };
}

function readMappedRow(row, colMap) {
  return {
    question: cellText(row[colMap.question]),
    answer: cellText(row[colMap.answer]),
    keywords: cellText(row[colMap.keywords]),
  };
}

export function parseSpreadsheetBuffer(buffer, filename = '') {
  const lower = filename.toLowerCase();
  const readOptions = { type: 'buffer', raw: false };
  if (lower.endsWith('.csv')) {
    readOptions.bookType = 'csv';
  }

  const workbook = XLSX.read(buffer, readOptions);
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return [];
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
  });

  const colMap = detectColumnMap(rows);
  const items = [];

  for (let i = colMap.startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) {
      continue;
    }

    const { question, answer, keywords } = readMappedRow(row, colMap);

    if (!question && !answer && !keywords) {
      continue;
    }

    if (!question || !answer) {
      const error = new Error(
        `Fila ${i + 1}: debe tener pregunta (columna A) y respuesta (columna B)`
      );
      error.row = i + 1;
      throw error;
    }

    // Categoría no se importa: queda «Sin categoría» vía createFaqRecord.
    items.push({ question, answer, keywords, row: i + 1 });
  }

  return items;
}
