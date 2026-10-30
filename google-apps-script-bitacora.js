const WEBHOOK_TOKEN = "BiomedFAQBitacoraDigitalByVictor";
const SPREADSHEET_ID = "1ol9Gx_nSO20OOPGlqvQpkCgXDlCWa082PN5qaj-hZrM";
const SCRIPT_VERSION = "2026-10-29-review-tabs-reports-q4-v7";
const DEFAULT_BITACORA_SHEET_NAME = "2026Q4";
const DEFAULT_SUGERENCIAS_SHEET_NAME = "Sugerencias FAQ";
const REPORTS_FOLDER_NAME = "Reportes Bitacora Biomedica";
const REPORT_EXPIRATION_MINUTES = 5;
const REPORT_CLEANUP_TRIGGER_HANDLER = "cleanupExpiredReports";
const REPORT_FILE_PROPERTY_PREFIX = "reportFile:";
const ALL_TRIMESTER_REPORT_VALUE = "__TODO_EL_TRIMESTRE__";
const ALL_TRIMESTER_REPORT_LABEL = "Todo el trimestre";
const ALL_YEAR_REPORT_VALUE = "__TODO_EL_ANO__";
const QUARTER_REPORT_PREFIX = "__TRIMESTRE__:";
// Define aqui una fecha dentro de la Semana 1 del periodo activo.
const BITACORA_PRIMERA_SEMANA_FECHA = "2026-07-20";
const SUGERENCIAS_BLACKLIST_CUENTAS = [
  // Agrega aqui numeros de cuenta o TH que no deben enviar sugerencias.
  "22511204",
];

const BITACORA_HEADERS = [
  "Marca temporal",
  "Nombre completo",
  "N\u00famero de cuenta | TH",
  "Fecha",
  "Correo institucional",
  "Hora de inicio",
  "Hora de fin",
  "Tipo de actividad",
  "Equipo",
  "Accesorios",
  "Insumos",
  "Observaciones",
  "Primera revisi\u00f3n - Encargado",
  "Primera revisi\u00f3n - Fecha",
  "Primera revisi\u00f3n - Observaciones",
  "Primera revisi\u00f3n - Marca temporal",
  "Segunda revisi\u00f3n - Encargado",
  "Segunda revisi\u00f3n - Fecha",
  "Segunda revisi\u00f3n - Observaciones",
  "Segunda revisi\u00f3n - Marca temporal"
];

const BITACORA_OBSOLETE_HEADERS = [
  "Validado por Pasante",
  "Semana de revisi\u00f3n"
];

const SUGERENCIAS_HEADERS = [
  "Marca temporal",
  "Nombre completo",
  "N\u00famero de cuenta | TH",
  "N\u00famero de tel\u00e9fono",
  "Correo institucional",
  "Pregunta"
];

const OBSERVACIONES_GENERALES_HEADERS = [
  "Marca temporal",
  "Semana",
  "Encargado",
  "Observaci\u00f3n"
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
    "Tipo de actividad": fields.tipo_actividad || "",
    "Equipo": fields.equipo || "",
    "Accesorios": fields.accesorios || "",
    "Insumos": fields.insumos || "",
    "Observaciones": fields.observaciones || ""
  });

  return json({ ok: true });
}

function handleReportAction(body) {
  try {
    return handleReportActionUnsafe(body);
  } catch (error) {
    return json({
      ok: false,
      result: "error",
      error: "Error en Apps Script: " + getErrorMessage(error)
    });
  }
}

function handleReportActionUnsafe(body) {
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

  if (action === "listarAnios") {
    return json({
      ok: true,
      anios: obtenerAniosDisponiblesDesdeSheet(sheet)
    });
  }

  if (action === "listarTrimestres") {
    return json({
      ok: true,
      trimestres: obtenerTrimestresDisponiblesDesdeSheet(sheet)
    });
  }

  if (action === "obtenerFilas") {
    return json({
      ok: true,
      filas: obtenerFilasPorSemanaDesdeSheet(sheet, body.semana || "", body.anio || "")
    });
  }

  if (action === "generarPdf") {
    const result = generarReportePdfDesdeSheet(sheet, body.semana || "", body.anio || "");
    return json(Object.assign({ ok: result.result !== "error" }, result));
  }

  if (action === "listarPendientesRevision") {
    return json({
      ok: true,
      pendientes: obtenerPendientesRevisionDesdeSheet(sheet)
    });
  }

  if (action === "guardarRevision") {
    return json(guardarRevisionDesdeSheet(sheet, body.id || "", body.revision || {}));
  }

  if (action === "guardarObservacionGeneral") {
    return json(guardarObservacionGeneral(body.observacion || {}));
  }

  return json({ ok: false, error: "Acción de reporte inválida." });
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

function obtenerPendientesRevision() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(spreadsheet, DEFAULT_BITACORA_SHEET_NAME, BITACORA_HEADERS);
  return obtenerPendientesRevisionDesdeSheet(sheet);
}

function guardarRevision(id, data) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(spreadsheet, DEFAULT_BITACORA_SHEET_NAME, BITACORA_HEADERS);
  return guardarRevisionDesdeSheet(sheet, id, data || {});
}

function obtenerSemanasDisponiblesDesdeSheet(sheet) {
  const rows = getReviewedBitacoraRows(sheet);
  const weeks = {};

  rows.forEach(row => {
    const week = getAutoWeekForDate(row["Fecha"]);
    if (week) weeks[week.value] = week;
  });

  return Object.values(weeks)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .map(week => week.value);
}

function obtenerAniosDisponiblesDesdeSheet(sheet) {
  return [...new Set(getReviewedBitacoraRows(sheet)
    .map(row => coerceDate(row["Fecha"]))
    .filter(Boolean)
    .map(date => String(date.getFullYear())))]
    .sort((a, b) => Number(b) - Number(a));
}

function obtenerTrimestresDisponiblesDesdeSheet(sheet) {
  const quarters = {};
  getReviewedBitacoraRows(sheet).forEach(row => {
    const date = coerceDate(row["Fecha"]);
    if (!date) return;
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const value = QUARTER_REPORT_PREFIX + date.getFullYear() + ":" + quarter;
    quarters[value] = {
      value: value,
      label: "Trimestre " + quarter + " (" + date.getFullYear() + ")",
      year: String(date.getFullYear()),
      quarter: quarter
    };
  });
  return Object.values(quarters).sort((a, b) => a.value.localeCompare(b.value));
}

function obtenerFilasPorSemanaDesdeSheet(sheet, semana, anio) {
  const rows = getReviewedBitacoraRows(sheet).filter(row => {
    if (!anio || anio === "__TODOS_LOS_ANOS__") return true;
    const date = coerceDate(row["Fecha"]);
    return date && String(date.getFullYear()) === String(anio);
  });
  return (semana === ALL_TRIMESTER_REPORT_VALUE || semana === ALL_YEAR_REPORT_VALUE ? rows : rows.filter(row => {
      const quarterMatch = String(semana).match(/^__TRIMESTRE__:(\d{4}):(\d)$/);
      if (quarterMatch) {
        const date = coerceDate(row["Fecha"]);
        return date
          && date.getFullYear() === Number(quarterMatch[1])
          && Math.floor(date.getMonth() / 3) + 1 === Number(quarterMatch[2]);
      }
      if (semana === ALL_YEAR_REPORT_VALUE) return true;
      const week = getAutoWeekForDate(row["Fecha"]);
      return week && week.value === semana;
    }))
    .map(mapBitacoraRowForReport);
}

function generarReportePdfDesdeSheet(sheet, semana, anio) {
  cleanupExpiredReports();
  const filas = obtenerFilasPorSemanaDesdeSheet(sheet, semana, anio);

  if (!semana) {
    return { result: "error", error: "Selecciona un periodo." };
  }

  if (!filas.length) {
    return { result: "error", error: "No hay filas con primera revisión para ese periodo." };
  }

  const quarterMatch = String(semana).match(/^__TRIMESTRE__:(\d{4}):(\d)$/);
  const reportLabel = quarterMatch
    ? `Trimestre ${quarterMatch[2]} (${quarterMatch[1]})`
    : semana === ALL_YEAR_REPORT_VALUE
    ? `Todo el año${anio ? " " + anio : ""}`
    : semana === ALL_TRIMESTER_REPORT_VALUE
      ? `${ALL_TRIMESTER_REPORT_LABEL}${anio ? " " + anio : ""}`
      : semana;
  const html = buildReportHtml(reportLabel, filas);
  const safeWeekName = normalizeFileName(reportLabel);
  const fileName = "Reporte Bitacora " + safeWeekName + ".pdf";
  const blob = Utilities.newBlob(html, "text/html", fileName.replace(/\.pdf$/, ".html"))
    .getAs(MimeType.PDF)
    .setName(fileName);
  const folder = getOrCreateReportsFolder();
  const file = folder.createFile(blob);
  const sharingWarning = trySetReportSharing(file);
  scheduleReportDeletion(file);

  return {
    result: "ok",
    totalFilas: filas.length,
    url: file.getUrl(),
    fileId: file.getId(),
    expiresAt: new Date(Date.now() + REPORT_EXPIRATION_MINUTES * 60 * 1000).toISOString(),
    sharingWarning: sharingWarning
  };
}

function trySetReportSharing(file) {
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return "";
  } catch (error) {
    return "El PDF se creó, pero Drive no permitió compartirlo públicamente: " + getErrorMessage(error);
  }
}

function getReviewedBitacoraRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const headers = sheet.getRange(1, 1, 1, sheet.getMaxColumns()).getValues()[0].map(String);
  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getMaxColumns()).getValues();

  return values
    .map(row => mapRowByHeaders(headers, row))
    .filter(row => String(row["Nombre completo"] || "").trim())
    .filter(hasFirstReview);
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
    fecha: formatReportValue(row["Fecha"]),
    correo: formatReportValue(row["Correo institucional"]),
    horaInicio: formatReportTime(row["Hora de inicio"]),
    horaFin: formatReportTime(row["Hora de fin"]),
    equipo: formatReportValue(row["Equipo"]),
    accesorios: formatReportValue(row["Accesorios"]),
    insumos: formatReportValue(row["Insumos"]),
    observaciones: formatReportValue(row["Observaciones"])
  };
}

function obtenerPendientesRevisionDesdeSheet(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const headers = sheet.getRange(1, 1, 1, sheet.getMaxColumns()).getValues()[0].map(String);
  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getMaxColumns()).getValues();

  return values
    .map((row, index) => Object.assign(mapRowByHeaders(headers, row), { __rowNumber: index + 2 }))
    .filter(row => String(row["Nombre completo"] || "").trim())
    .filter(row => getNextReviewNumber(row))
    .map(mapBitacoraRowForRevision);
}

function mapBitacoraRowForRevision(row) {
  const rowNumber = row.__rowNumber;
  const reviewNumber = getNextReviewNumber(row);

  return {
    id: "row:" + rowNumber,
    rowNumber: rowNumber,
    revisionNumber: reviewNumber,
    revisionLabel: reviewNumber === 1 ? "Primera revisi\u00f3n" : "Segunda revisi\u00f3n",
    marcaTemporal: formatReportValue(row["Marca temporal"]),
    nombreResponsable: formatReportValue(row["Nombre completo"]),
    numeroCuenta: formatReportValue(row["N\u00famero de cuenta | TH"]),
    fechaReserva: formatReportValue(row["Fecha"]),
    correo: formatReportValue(row["Correo institucional"]),
    horaInicio: formatReportTime(row["Hora de inicio"]),
    horaFin: formatReportTime(row["Hora de fin"]),
    actividad: formatReportValue(row["Tipo de actividad"]),
    equipo: normalizeMultilineValue(row["Equipo"]),
    accesorios: normalizeMultilineValue(row["Accesorios"]),
    insumos: normalizeMultilineValue(row["Insumos"]),
    cantidadInsumos: "",
    accesoriosOtros: "",
    observacionesReserva: extractAdditionalObservations(row["Observaciones"]),
    observacionesUso: normalizeMultilineValue(row["Observaciones"]),
    primeraRevisionEncargado: formatReportValue(row["Primera revisi\u00f3n - Encargado"]),
    primeraRevisionFecha: formatReportValue(row["Primera revisi\u00f3n - Fecha"]),
    primeraRevisionObservaciones: normalizeMultilineValue(row["Primera revisi\u00f3n - Observaciones"])
  };
}

function extractAdditionalObservations(value) {
  const text = normalizeMultilineValue(value);
  return text
    .replace(/\n*Detalles (?:r[aá]pidos del )?uso:[\s\S]*$/i, "")
    .trim();
}

function hasFirstReview(row) {
  return Boolean(
    formatReportValue(row["Primera revisi\u00f3n - Encargado"]).trim()
    || formatReportValue(row["Primera revisi\u00f3n - Fecha"]).trim()
    || formatReportValue(row["Primera revisi\u00f3n - Marca temporal"]).trim()
    || normalizeMultilineValue(row["Primera revisi\u00f3n - Observaciones"]).trim()
  );
}

function hasSecondReview(row) {
  return Boolean(
    formatReportValue(row["Segunda revisi\u00f3n - Encargado"]).trim()
    || formatReportValue(row["Segunda revisi\u00f3n - Fecha"]).trim()
    || formatReportValue(row["Segunda revisi\u00f3n - Marca temporal"]).trim()
    || normalizeMultilineValue(row["Segunda revisi\u00f3n - Observaciones"]).trim()
  );
}

function getNextReviewNumber(row) {
  if (!hasFirstReview(row)) return 1;
  if (!hasSecondReview(row)) return 2;
  return 0;
}

function guardarRevisionDesdeSheet(sheet, id, data) {
  const rowNumber = getRevisionRowNumber(id);
  if (!rowNumber || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
    return { ok: false, result: "error", error: "Registro de revisi\u00f3n inv\u00e1lido." };
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getMaxColumns()).getValues()[0].map(header => String(header || "").trim());
  const row = mapRowByHeaders(headers, sheet.getRange(rowNumber, 1, 1, sheet.getMaxColumns()).getValues()[0]);
  if (!String(row["Nombre completo"] || "").trim()) {
    return { ok: false, result: "error", error: "El registro seleccionado est\u00e1 vac\u00edo." };
  }

  const reviewNumber = Number(data.revisionNumber || getNextReviewNumber(row));
  if (![1, 2].includes(reviewNumber)) {
    return { ok: false, result: "error", error: "Este registro ya tiene primera y segunda revisi\u00f3n." };
  }

  if (reviewNumber === 1 && hasFirstReview(row)) {
    return { ok: false, result: "error", error: "Este registro ya tiene primera revisi\u00f3n." };
  }

  if (reviewNumber === 2 && !hasFirstReview(row)) {
    return { ok: false, result: "error", error: "Primero guarda la primera revisi\u00f3n." };
  }

  if (reviewNumber === 2 && hasSecondReview(row)) {
    return { ok: false, result: "error", error: "Este registro ya tiene segunda revisi\u00f3n." };
  }

  const prefix = reviewNumber === 1 ? "Primera revisi\u00f3n" : "Segunda revisi\u00f3n";
  setCellByHeader(sheet, headers, rowNumber, prefix + " - Encargado", data.encargadoRevision || "");
  setCellByHeader(sheet, headers, rowNumber, prefix + " - Fecha", data.fechaRevision || formatDateOnly(new Date()));
  setCellByHeader(sheet, headers, rowNumber, prefix + " - Observaciones", data.observacionesRevision || "");
  setCellByHeader(sheet, headers, rowNumber, prefix + " - Marca temporal", new Date());

  return { ok: true, result: "ok" };
}

function guardarObservacionGeneral(data) {
  const semana = String(data.semana || "").trim();
  const encargado = String(data.encargado || "").trim();
  const texto = String(data.texto || "").trim();

  if (!semana || !encargado || !texto) {
    return { ok: false, result: "error", error: "Completa semana, encargado y observaci\u00f3n." };
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(spreadsheet, "ObservacionesGenerales", OBSERVACIONES_GENERALES_HEADERS);
  appendMappedRow(sheet, {
    "Marca temporal": new Date(),
    "Semana": semana,
    "Encargado": encargado,
    "Observaci\u00f3n": texto
  });

  return { ok: true, result: "ok" };
}

function getRevisionRowNumber(id) {
  const match = String(id || "").match(/^row:(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function setCellByHeader(sheet, headers, rowNumber, header, value) {
  const column = headers.indexOf(header) + 1;
  if (column <= 0) throw new Error("No se encontr\u00f3 la columna: " + header);
  sheet.getRange(rowNumber, column).setValue(value);
}

function normalizeMultilineValue(value) {
  return formatReportValue(value)
    .split(/[|;]/)
    .map(part => part.trim())
    .filter(Boolean)
    .join("\n");
}

function getAutoWeekForDate(value) {
  const date = coerceDate(value);
  if (!date) return null;
  const firstWeekDate = coerceDate(BITACORA_PRIMERA_SEMANA_FECHA);
  if (!firstWeekDate) throw new Error("BITACORA_PRIMERA_SEMANA_FECHA no es una fecha válida.");

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
  if (typeof value === "number" && isFinite(value)) return excelSerialToDate(value);
  const text = String(value || "").trim();
  if (!text) return null;

  if (/^\d+(\.\d+)?$/.test(text)) return excelSerialToDate(Number(text));

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return new Date(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]));

  const parsed = new Date(text);
  return isNaN(parsed) ? null : parsed;
}

function excelSerialToDate(serial) {
  if (!isFinite(serial) || serial <= 0) return null;
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const date = new Date(utcValue * 1000);
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatReportValue(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }
  if (typeof value === "number" && isFinite(value) && value > 1000) {
    const date = excelSerialToDate(value);
    if (date) return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }
  return String(value || "").replace(/^'/, "");
}

function formatReportTime(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "HH:mm");
  }

  if (typeof value === "number" && isFinite(value)) {
    return decimalDayToTime(value);
  }

  const text = String(value || "").trim();
  if (/^\d+(\.\d+)?$/.test(text)) return decimalDayToTime(Number(text));
  return text.replace(/^'/, "");
}

function decimalDayToTime(value) {
  const totalMinutes = Math.round((value % 1) * 24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
}

function formatDateOnly(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy");
}

function buildReportHtml(semana, filas) {
  const rows = filas.map(fila => `
    <tr>
      <td>${escapeHtml(fila.marcaTemporal)}</td>
      <td>${escapeHtml(fila.nombre)}</td>
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
  <h1>Reporte de Bitácora</h1>
  <div class="meta">${escapeHtml(semana)} · ${filas.length} registro${filas.length === 1 ? "" : "s"} con primera revisión · Generado ${escapeHtml(formatDateOnly(new Date()))}</div>
  <table>
    <thead>
      <tr>
        <th>Marca temporal</th>
        <th>Nombre completo</th>
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

function scheduleReportDeletion(file) {
  const expiresAt = Date.now() + REPORT_EXPIRATION_MINUTES * 60 * 1000;
  PropertiesService.getScriptProperties().setProperty(
    REPORT_FILE_PROPERTY_PREFIX + file.getId(),
    String(expiresAt)
  );
  ensureReportCleanupTrigger();
}

function ensureReportCleanupTrigger() {
  const hasTrigger = ScriptApp.getProjectTriggers()
    .some(trigger => trigger.getHandlerFunction() === REPORT_CLEANUP_TRIGGER_HANDLER);

  if (!hasTrigger) {
    ScriptApp.newTrigger(REPORT_CLEANUP_TRIGGER_HANDLER)
      .timeBased()
      .after(REPORT_EXPIRATION_MINUTES * 60 * 1000)
      .create();
  }
}

function cleanupExpiredReports() {
  const properties = PropertiesService.getScriptProperties();
  const allProperties = properties.getProperties();
  const now = Date.now();
  let hasPendingReports = false;

  Object.keys(allProperties).forEach(key => {
    if (!key.startsWith(REPORT_FILE_PROPERTY_PREFIX)) return;

    const expiresAt = Number(allProperties[key]);
    if (!expiresAt || expiresAt > now) {
      hasPendingReports = true;
      return;
    }

    const fileId = key.slice(REPORT_FILE_PROPERTY_PREFIX.length);
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch (error) {
      // If the file was already removed or access changed, forget the stale record.
    }
    properties.deleteProperty(key);
  });

  clearReportCleanupTriggers();

  if (hasPendingReports) {
    ensureReportCleanupTrigger();
  }
}

function clearReportCleanupTriggers() {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === REPORT_CLEANUP_TRIGGER_HANDLER)
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
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

function getErrorMessage(error) {
  if (error && error.message) return String(error.message);
  return String(error || "Error desconocido.");
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
}

function setupSugerenciasSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(spreadsheet, DEFAULT_SUGERENCIAS_SHEET_NAME, SUGERENCIAS_HEADERS);
  setHeaders(sheet, SUGERENCIAS_HEADERS);
  sheet.autoResizeColumns(1, SUGERENCIAS_HEADERS.length);
}

function setupObservacionesGeneralesSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(spreadsheet, "ObservacionesGenerales", OBSERVACIONES_GENERALES_HEADERS);
  setHeaders(sheet, OBSERVACIONES_GENERALES_HEADERS);
  sheet.autoResizeColumns(1, OBSERVACIONES_GENERALES_HEADERS.length);
}

function setupSheets() {
  setupBitacoraSheet();
  setupSugerenciasSheet();
  setupObservacionesGeneralesSheet();
}

function getOrCreateSheet(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (headers === BITACORA_HEADERS) {
    removeObsoleteBitacoraColumns(sheet);
  }
  setHeaders(sheet, headers);
  return sheet;
}

function removeObsoleteBitacoraColumns(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return;

  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getMaxColumns())
    .getValues()[0]
    .map(header => String(header || "").trim());

  BITACORA_OBSOLETE_HEADERS
    .map(header => currentHeaders.indexOf(header) + 1)
    .filter(column => column > 0)
    .sort((a, b) => b - a)
    .forEach(column => sheet.deleteColumn(column));
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
