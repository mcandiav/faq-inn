import * as XLSX from 'xlsx';

const QUESTION_HEADER = /^(pregunta|question|q|pergunta)$/i;
const ANSWER_HEADER = /^(respuesta|answer|a|resposta)$/i;

function cellText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function isHeaderRow(question, answer) {
  return QUESTION_HEADER.test(question) && ANSWER_HEADER.test(answer);
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

  const items = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) {
      continue;
    }

    const question = cellText(row[0]);
    const answer = cellText(row[1]);

    if (!question && !answer) {
      continue;
    }

    if (isHeaderRow(question, answer)) {
      continue;
    }

    if (!question || !answer) {
      const error = new Error(
        `Fila ${i + 1}: debe tener pregunta (columna A) y respuesta (columna B)`
      );
      error.row = i + 1;
      throw error;
    }

    items.push({ question, answer, row: i + 1 });
  }

  return items;
}
