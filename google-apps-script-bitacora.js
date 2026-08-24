const WEBHOOK_TOKEN = "BiomedFAQBitacoraDigitalByVictor";
const SPREADSHEET_ID = "1ol9Gx_nSO20OOPGlqvQpkCgXDlCWa082PN5qaj-hZrM";
const SCRIPT_VERSION = "2026-08-14-header-map-checkbox-v4";
const DEFAULT_BITACORA_SHEET_NAME = "2026Q3";
const DEFAULT_SUGERENCIAS_SHEET_NAME = "Sugerencias FAQ";
const REPORTS_FOLDER_NAME = "Reportes Bitacora Biomedica";
// Define aqui una fecha dentro de la Semana 1 del periodo activo.
const BITACORA_PRIMERA_SEMANA_FECHA = "2026-07-14";
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
  if (body.action) {
    return handleReportAction(body);
  }

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

  appendMappedRow(sheet, {
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
  syncBitacoraCheckboxes(sheet);

  return json({ ok: true });
}

function handleReportAction(body) {
  const sheetName = body.sheetName || DEFAULT_BITACORA_SHEET_NAME;
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(spreadsheet, sheetName, BITACORA_HEADERS);
  const action = body.action;

  if (action === "listarSemanas") {
    return json({
      ok: true,
      semanas: obtenerSemanasDisponiblesDesdeSheet(sheet)
    });
  }

  if (action === "obtenerFilas") {
    return json({
      ok: true,
      filas: obtenerFilasPorSemanaDesdeSheet(sheet, body.semana || "")
    });
  }

  if (action === "generarPdf") {
    const result = generarReportePdfDesdeSheet(sheet, body.semana || "");
    return json(Object.assign({ ok: result.result !== "error" }, result));
  }

  return json({ ok: false, error: "Accion de reporte invalida." });
}

function obtenerSemanasDisponibles() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(spreadsheet, DEFAULT_BITACORA_SHEET_NAME, BITACORA_HEADERS);
  return obtenerSemanasDisponiblesDesdeSheet(sheet);
}

function obtenerFilasPorSemana(semana) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(spreadsheet, DEFAULT_BITACORA_SHEET_NAME, BITACORA_HEADERS);
  return obtenerFilasPorSemanaDesdeSheet(sheet, semana);
}

function generarReportePdf(semana) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(spreadsheet, DEFAULT_BITACORA_SHEET_NAME, BITACORA_HEADERS);
  return generarReportePdfDesdeSheet(sheet, semana);
}

function obtenerSemanasDisponiblesDesdeSheet(sheet) {
  const rows = getReviewedBitacoraRows(sheet);
  const weeks = {};

  rows.forEach(row => {
    const week = getAutoWeekForDate(row.fecha);
    if (week) weeks[week.value] = week;
  });

  return Object.values(weeks)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .map(week => week.value);
}

function obtenerFilasPorSemanaDesdeSheet(sheet, semana) {
  return getReviewedBitacoraRows(sheet)
    .filter(row => {
      const week = getAutoWeekForDate(row.fecha);
      return week && week.value === semana;
    })
    .map(mapBitacoraRowForReport);
}

function generarReportePdfDesdeSheet(sheet, semana) {
  const filas = obtenerFilasPorSemanaDesdeSheet(sheet, semana);

  if (!semana) {
    return { result: "error", error: "Selecciona una semana." };
  }

  if (!filas.length) {
    return { result: "error", error: "No hay filas validadas para esa semana." };
  }

  const html = buildReportHtml(semana, filas);
  const safeWeekName = normalizeFileName(semana);
  const fileName = "Reporte Bitacora " + safeWeekName + ".pdf";
  const blob = Utilities.newBlob(html, "text/html", fileName.replace(/\.pdf$/, ".html"))
    .getAs(MimeType.PDF)
    .setName(fileName);
  const folder = getOrCreateReportsFolder();
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    result: "ok",
    totalFilas: filas.length,
    url: file.getUrl(),
    fileId: file.getId()
  };
}

function getReviewedBitacoraRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const headers = sheet.getRange(1, 1, 1, sheet.getMaxColumns()).getValues()[0].map(String);
  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getMaxColumns()).getValues();

  return values
    .map(row => mapRowByHeaders(headers, row))
    .filter(row => String(row["Nombre completo"] || "").trim())
    .filter(row => isTruthyCheckbox(row["Validado por Pasante"]));
}

function mapRowByHeaders(headers, row) {
  return headers.reduce((mapped, header, index) => {
    mapped[String(header || "").trim()] = row[index];
    return mapped;
  }, {});
}

function mapBitacoraRowForReport(row) {
  return {
    marcaTemporal: formatReportValue(row["Marca temporal"]),
    nombre: formatReportValue(row["Nombre completo"]),
    cuenta: formatReportValue(row["N\u00famero de cuenta | TH"]),
    fecha: formatReportValue(row["Fecha"]),
    correo: formatReportValue(row["Correo institucional"]),
    horaInicio: formatReportValue(row["Hora de inicio"]),
    horaFin: formatReportValue(row["Hora de fin"]),
    equipo: formatReportValue(row["Equipo"]),
    accesorios: formatReportValue(row["Accesorios"]),
    insumos: formatReportValue(row["Insumos"]),
    observaciones: formatReportValue(row["Observaciones"])
  };
}

function getAutoWeekForDate(value) {
  const date = coerceDate(value);
  if (!date) return null;
  const firstWeekDate = coerceDate(BITACORA_PRIMERA_SEMANA_FECHA);
  if (!firstWeekDate) throw new Error("BITACORA_PRIMERA_SEMANA_FECHA no es una fecha valida.");

  const firstWeekStart = getWeekStart(firstWeekDate);
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const weekNumber = Math.floor((start.getTime() - firstWeekStart.getTime()) / 604800000) + 1;
  if (weekNumber < 1) return null;

  return {
    value: "Semana " + weekNumber + " (" + formatDateOnly(start) + " - " + formatDateOnly(end) + ")",
    startDate: start,
    endDate: end
  };
}

function getWeekStart(date) {
  const start = new Date(date);
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function coerceDate(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) return value;
  const text = String(value || "").trim();
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return new Date(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]));

  const parsed = new Date(text);
  return isNaN(parsed) ? null : parsed;
}

function isTruthyCheckbox(value) {
  return value === true || String(value || "").toLowerCase() === "true" || String(value || "").toLowerCase() === "s\u00ed" || String(value || "").toLowerCase() === "si";
}

function formatReportValue(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }
  return String(value || "").replace(/^'/, "");
}

function formatDateOnly(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy");
}

function buildReportHtml(semana, filas) {
  const rows = filas.map(fila => `
    <tr>
      <td>${escapeHtml(fila.marcaTemporal)}</td>
      <td>${escapeHtml(fila.nombre)}</td>
      <td>${escapeHtml(fila.cuenta)}</td>
      <td>${escapeHtml(fila.fecha)}</td>
      <td>${escapeHtml(fila.correo)}</td>
      <td>${escapeHtml(fila.horaInicio)}</td>
      <td>${escapeHtml(fila.horaFin)}</td>
      <td>${escapeHtml(fila.equipo)}</td>
      <td>${escapeHtml(fila.accesorios)}</td>
      <td>${escapeHtml(fila.insumos)}</td>
      <td>${escapeHtml(fila.observaciones)}</td>
    </tr>
  `).join("");

  return `
<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #13243b; margin: 26px; }
    h1 { color: #173b72; font-size: 22px; margin: 0 0 6px; }
    .meta { color: #687789; font-size: 11px; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; }
    th, td { border: 1px solid #d8e1e3; padding: 6px; text-align: left; vertical-align: top; }
    th { background: #edf7f8; color: #173b72; font-size: 8px; text-transform: uppercase; }
  </style>
</head>
<body>
  <h1>Reporte semanal de Bitácora</h1>
  <div class="meta">${escapeHtml(semana)} · ${filas.length} registro${filas.length === 1 ? "" : "s"} validado${filas.length === 1 ? "" : "s"} · Generado ${escapeHtml(formatDateOnly(new Date()))}</div>
  <table>
    <thead>
      <tr>
        <th>Marca temporal</th>
        <th>Nombre completo</th>
        <th>Número de cuenta | TH</th>
        <th>Fecha</th>
        <th>Correo institucional</th>
        <th>Hora inicio</th>
        <th>Hora fin</th>
        <th>Equipo</th>
        <th>Accesorios</th>
        <th>Insumos</th>
        <th>Observaciones</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

function getOrCreateReportsFolder() {
  const folders = DriveApp.getFoldersByName(REPORTS_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(REPORTS_FOLDER_NAME);
}

function normalizeFileName(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
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
  syncBitacoraCheckboxes(sheet);
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

function syncBitacoraCheckboxes(sheet) {
  ensureColumnCount(sheet, BITACORA_HEADERS.length);
  const checkboxColumn = BITACORA_HEADERS.indexOf("Validado por Pasante") + 1;

  if (sheet.getMaxRows() > 1) {
    sheet.getRange(2, checkboxColumn, sheet.getMaxRows() - 1, 1)
      .clearDataValidations()
      .clearContent();
  }

  const lastDataRow = getLastBitacoraDataRow(sheet);
  if (lastDataRow < 2) {
    return;
  }

  sheet.getRange(2, checkboxColumn, lastDataRow - 1, 1).insertCheckboxes();
}

function getLastBitacoraDataRow(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;

  const dataColumnCount = BITACORA_HEADERS.length - 1;
  const values = sheet.getRange(2, 1, lastRow - 1, dataColumnCount).getValues();

  for (let index = values.length - 1; index >= 0; index--) {
    if (values[index].some(value => String(value || "").trim() !== "")) {
      return index + 2;
    }
  }

  return 1;
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
