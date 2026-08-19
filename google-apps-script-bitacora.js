const WEBHOOK_TOKEN = "BiomedFAQBitacoraDigitalByVictor";
const SPREADSHEET_ID = "1ol9Gx_nSO20OOPGlqvQpkCgXDlCWa082PN5qaj-hZrM";
const SCRIPT_VERSION = "2026-08-14-header-map-checkbox-v4";
const DEFAULT_BITACORA_SHEET_NAME = "2026Q3";
const DEFAULT_SUGERENCIAS_SHEET_NAME = "Sugerencias FAQ";
const SUGERENCIAS_BLACKLIST_CUENTAS = [
  // Agrega aqui numeros de cuenta o TH que no deben enviar sugerencias.
  // Ejemplo: "12241087",
];

const BITACORA_HEADERS = [
  "Marca temporal",
  "Nombre completo",
  "N\u00famero de cuenta | TH",
  "Fecha",
  "Correo institucional",
  "Hora de inicio",
  "Hora de fin",
  "Equipo",
  "Accesorios",
  "Insumos",
  "Observaciones",
  "Validado por Pasante"
];

const SUGERENCIAS_HEADERS = [
  "Marca temporal",
  "Nombre completo",
  "N\u00famero de cuenta | TH",
  "N\u00famero de tel\u00e9fono",
  "Correo institucional",
  "Pregunta"
];

function doPost(event) {
  const authHeader = event?.parameter?.token || "";
  const body = JSON.parse(event.postData.contents || "{}");

  if (WEBHOOK_TOKEN && body.token !== WEBHOOK_TOKEN && authHeader !== WEBHOOK_TOKEN) {
    return json({ ok: false, error: "Token inv\u00e1lido." });
  }

  const formType = body.formType || "bitacora";
  const sheetName = body.sheetName || (
    formType === "sugerencia" ? DEFAULT_SUGERENCIAS_SHEET_NAME : DEFAULT_BITACORA_SHEET_NAME
  );
  const fields = body.fields || {};
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const headers = formType === "sugerencia" ? SUGERENCIAS_HEADERS : BITACORA_HEADERS;
  const sheet = getOrCreateSheet(spreadsheet, sheetName, headers);
  const validationError = validateFields(fields, formType);

  if (validationError) {
    return json({ ok: false, error: validationError });
  }

  if (formType === "sugerencia") {
    if (isCuentaBlacklisted(fields.cuenta)) {
      return json({
        ok: false,
        error: "Este n\u00famero de cuenta no puede enviar sugerencias."
      });
    }

    const telefono = fields.telefono || fields.fecha || "";
    const pregunta = fields.pregunta || fields.hora_inicio || "";

    appendMappedRow(sheet, {
      "Marca temporal": body.submittedAt || new Date().toISOString(),
      "Nombre completo": fields.nombre || "",
      "N\u00famero de cuenta | TH": asText(fields.cuenta),
      "N\u00famero de tel\u00e9fono": asText(telefono),
      "Numero de Telefono": asText(telefono),
      "N\u00famero de Telefono": asText(telefono),
      "Correo institucional": fields.correo || "",
      "Pregunta": pregunta
    });

    return json({ ok: true });
  }

  const rowNumber = appendMappedRow(sheet, {
    "Marca temporal": body.submittedAt || new Date().toISOString(),
    "Nombre completo": fields.nombre || "",
    "N\u00famero de cuenta | TH": asText(fields.cuenta),
    "Fecha": fields.fecha || "",
    "Correo institucional": fields.correo || "",
    "Hora de inicio": fields.hora_inicio || "",
    "Hora de fin": fields.hora_fin || "",
    "Equipo": fields.equipo || "",
    "Accesorios": fields.accesorios || "",
    "Insumos": fields.insumos || "",
    "Observaciones": fields.observaciones || "",
    "Validado por Pasante": false
  });
  applyBitacoraCheckboxes(sheet, rowNumber);

  return json({ ok: true });
}

function doGet() {
  return json({
    ok: true,
    version: SCRIPT_VERSION,
    bitacoraSheet: DEFAULT_BITACORA_SHEET_NAME,
    sugerenciasSheet: DEFAULT_SUGERENCIAS_SHEET_NAME
  });
}

function setupBitacoraSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(spreadsheet, DEFAULT_BITACORA_SHEET_NAME, BITACORA_HEADERS);
  setHeaders(sheet, BITACORA_HEADERS);
  sheet.autoResizeColumns(1, BITACORA_HEADERS.length);
  applyBitacoraCheckboxes(sheet);
}

function setupSugerenciasSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(spreadsheet, DEFAULT_SUGERENCIAS_SHEET_NAME, SUGERENCIAS_HEADERS);
  setHeaders(sheet, SUGERENCIAS_HEADERS);
  sheet.autoResizeColumns(1, SUGERENCIAS_HEADERS.length);
}

function setupSheets() {
  setupBitacoraSheet();
  setupSugerenciasSheet();
}

function getOrCreateSheet(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  setHeaders(sheet, headers);
  return sheet;
}

function setHeaders(sheet, headers) {
  ensureColumnCount(sheet, headers.length);
  sheet.getRange(1, 1, 1, headers.length).clearContent();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  applyTextFormats(sheet, headers);
  sheet.setFrozenRows(1);
}

function applyTextFormats(sheet, headers) {
  const textHeaders = [
    "N\u00famero de cuenta | TH",
    "N\u00famero de tel\u00e9fono",
    "Numero de Telefono",
    "N\u00famero de Telefono"
  ];

  textHeaders.forEach(header => {
    const column = headers.indexOf(header) + 1;
    if (column > 0) {
      sheet.getRange(1, column, sheet.getMaxRows(), 1).setNumberFormat("@");
    }
  });
}

function appendMappedRow(sheet, valuesByHeader) {
  const headerValues = sheet.getRange(1, 1, 1, sheet.getMaxColumns()).getValues()[0];
  const row = headerValues.map(header => {
    const key = String(header || "").trim();
    return Object.prototype.hasOwnProperty.call(valuesByHeader, key) ? valuesByHeader[key] : "";
  });
  const rowNumber = sheet.getLastRow() + 1;
  sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  return rowNumber;
}

function ensureColumnCount(sheet, requiredColumns) {
  const currentColumns = sheet.getMaxColumns();
  if (currentColumns < requiredColumns) {
    sheet.insertColumnsAfter(currentColumns, requiredColumns - currentColumns);
  }
}

function applyBitacoraCheckboxes(sheet, rowNumber) {
  ensureColumnCount(sheet, BITACORA_HEADERS.length);
  const checkboxColumn = BITACORA_HEADERS.indexOf("Validado por Pasante") + 1;
  if (rowNumber && rowNumber > 1) {
    sheet.getRange(rowNumber, checkboxColumn).insertCheckboxes().setValue(false);
    clearUnusedBitacoraCheckboxes(sheet, rowNumber + 1);
    return;
  }

  const lastDataRow = Math.max(sheet.getLastRow(), 2);
  sheet.getRange(2, checkboxColumn, lastDataRow - 1, 1).insertCheckboxes();
  clearUnusedBitacoraCheckboxes(sheet, lastDataRow + 1);
}

function clearUnusedBitacoraCheckboxes(sheet, startRow) {
  const checkboxColumn = BITACORA_HEADERS.indexOf("Validado por Pasante") + 1;
  const maxRows = sheet.getMaxRows();
  if (startRow > maxRows) return;
  sheet.getRange(startRow, checkboxColumn, maxRows - startRow + 1, 1)
    .clearDataValidations()
    .clearContent();
}

function isCuentaBlacklisted(cuenta) {
  const normalizedCuenta = normalizeCuenta(cuenta);
  return SUGERENCIAS_BLACKLIST_CUENTAS
    .map(normalizeCuenta)
    .filter(Boolean)
    .includes(normalizedCuenta);
}

function normalizeCuenta(cuenta) {
  return String(cuenta || "").replace(/\D/g, "");
}

function asText(value) {
  return "'" + String(value || "");
}

function validateFields(fields, formType) {
  if (!isValidCuenta(fields.cuenta)) {
    return "Ingresa un n\u00famero de cuenta v\u00e1lido.";
  }

  if (!isValidInstitutionalEmail(fields.correo)) {
    return "Ingresa un correo institucional v\u00e1lido.";
  }

  const telefono = fields.telefono || fields.fecha || "";
  if (formType === "sugerencia" && !isValidPhone(telefono)) {
    return "Ingresa un n\u00famero de tel\u00e9fono v\u00e1lido.";
  }

  return "";
}

function isValidInstitutionalEmail(value) {
  return /^[^\s@]+@unitec\.edu(\.hn)?$/i.test(String(value || "").trim());
}

function isValidPhone(value) {
  return /^[1-9]\d{3}-?\d{4}$/.test(String(value || "").trim());
}

function isValidCuenta(value) {
  return /^[1-9]\d{5,7}$/.test(String(value || "").trim());
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
