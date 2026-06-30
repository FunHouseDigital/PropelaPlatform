/**
 * csv.js — the single, framework-agnostic CSV builder for the whole app.
 *
 * Every CSV export path (analytics/reports builders, the Export Center, the
 * audit log, notification history, settings data export) routes through this
 * module so escaping is defined in exactly one place. Do NOT re-introduce
 * bespoke per-component escaping — call escapeCsvField()/toCsv() instead. This
 * mirrors the existing src/lib/ precedent (exportGuard.js, secureRandom.js) of
 * keeping security-sensitive serialization logic out of components.
 *
 * Two distinct concerns are handled here, in this order:
 *
 *   1. CSV FORMULA / FUNCTION INJECTION (the security fix).
 *      Spreadsheet apps (Excel, Google Sheets, LibreOffice) treat any cell
 *      whose first character is one of  =  +  -  @  TAB (0x09)  CR (0x0D)
 *      as a *formula*, not text. Since our cells are built from raw record
 *      data (nurse names, free-text notes, details fields, etc.), an attacker
 *      who plants e.g.  =HYPERLINK("http://evil","click")  or
 *      =cmd|'/c calc'!A1  into a record achieves formula execution / data
 *      exfiltration the moment a staff member opens the export.
 *
 *      Mitigation (OWASP-recommended): if a field starts with one of those
 *      trigger characters, prefix the value with a single quote ('). A leading
 *      apostrophe tells the spreadsheet "treat this cell as literal text", so
 *      the formula is never evaluated — it is shown verbatim instead. The
 *      apostrophe is invisible-as-data only inside the spreadsheet's text
 *      coercion; in the raw CSV it is a normal character that lands inside the
 *      cell. We apply this to header cells too, since headers are sometimes
 *      derived from user-controlled field names.
 *
 *   2. RFC-4180 QUOTING (correctness, not security).
 *      A field that contains a comma, double-quote, CR or LF (or has
 *      surrounding whitespace worth preserving) must be wrapped in double
 *      quotes, with any embedded double-quote doubled (" -> ""). Otherwise the
 *      delimiter/newline would bleed into adjacent columns/rows.
 *
 * ORDER MATTERS: we compute the formula-prefixed value FIRST, then apply the
 * RFC-4180 quoting around it. That guarantees the protective ' ends up *inside*
 * the quotes, i.e. inside the cell, so it actually defeats formula evaluation
 * (a ' that landed outside the quotes would not be part of the cell value).
 *
 * Benign data is untouched: ordinary names, dates, numbers and emails contain
 * none of the trigger/quoting characters, so they pass through verbatim and
 * existing spreadsheets / round-trips keep working.
 */

/**
 * Characters that make a spreadsheet interpret a cell as a formula when they
 * appear as the FIRST character of the cell. Includes the two whitespace
 * controls (tab, carriage return) called out by the OWASP guidance.
 */
const FORMULA_TRIGGERS = new Set(['=', '+', '-', '@', '\t', '\r']);

/**
 * Escape a single CSV cell value: neutralize formula injection, then apply
 * RFC-4180 quoting as needed.
 *
 * @param {*} value any value; coerced to string (null/undefined -> '')
 * @returns {string} a CSV-safe representation of the cell
 */
export function escapeCsvField(value) {
  const str = value === null || value === undefined ? '' : String(value);

  // 1. Formula-injection neutralization. If the cell would be read as a
  //    formula, prefix a single quote so the spreadsheet treats it as text.
  const safe = str.length > 0 && FORMULA_TRIGGERS.has(str[0]) ? `'${str}` : str;

  // 2. RFC-4180 quoting. Quote when the value contains a delimiter, quote,
  //    or line break, or when the original value has leading/trailing
  //    whitespace that would otherwise be lost on re-import. The formula
  //    prefix (if any) is already part of `safe`, so it lands inside the
  //    quotes — i.e. inside the cell, where it does its job.
  const needsQuoting = /[",\n\r]/.test(safe) || /^\s|\s$/.test(str);
  if (needsQuoting) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Encode one row (an array of cell values) into a single CSV line.
 *
 * @param {Array<*>} cells
 * @returns {string}
 */
function encodeRow(cells) {
  return cells.map(escapeCsvField).join(',');
}

/**
 * Build a complete CSV document from rows of cells.
 *
 * Rows are arrays of cell values (objects should be mapped to arrays by the
 * caller, so column order stays explicit and under the caller's control).
 * Lines are joined with '\n' to preserve the output format already produced by
 * the existing exporters.
 *
 * @param {Array<Array<*>>} rows data rows, each an array of cell values
 * @param {object} [options]
 * @param {Array<*>} [options.headers] optional header row, prepended and escaped
 * @returns {string} the CSV document
 */
export function toCsv(rows, { headers } = {}) {
  const lines = [];
  if (headers) {
    lines.push(encodeRow(headers));
  }
  for (const row of rows) {
    lines.push(encodeRow(row));
  }
  return lines.join('\n');
}
