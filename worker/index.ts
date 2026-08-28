interface Env {
  ASSETS: Fetcher;
  BITACORA_WEBHOOK_URL?: string;
  BITACORA_SHEET_NAME?: string;
  SUGERENCIAS_SHEET_NAME?: string;
  BITACORA_WEBHOOK_TOKEN?: string;
  BITACORA_SPREADSHEET_ID?: string;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/bitacora" && request.method === "POST") {
      return submitSheetForm(request, env, "bitacora");
    }

    if (url.pathname === "/api/bitacora/reporte" && request.method === "POST") {
      return submitReportRequest(request, env);
    }

    if (url.pathname === "/api/sugerencia" && request.method === "POST") {
      return submitSheetForm(request, env, "sugerencia");
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;

async function submitSheetForm(request: Request, env: Env, formType: "bitacora" | "sugerencia"): Promise<Response> {
  if (!env.BITACORA_WEBHOOK_URL) {
    return jsonResponse({ ok: false, error: "BITACORA_WEBHOOK_URL no está configurado." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, error: "El cuerpo de la solicitud no es JSON válido." }, 400);
  }

  const fields = formType === "sugerencia"
    ? {
        ...body,
        fecha: body.telefono || "",
        hora_inicio: body.pregunta || "",
      }
    : body;

  const validationError = validateFields(fields, formType);
  if (validationError) {
    return jsonResponse({ ok: false, error: validationError }, 400);
  }

  const payload = {
    formType,
    sheetName: formType === "sugerencia"
      ? env.SUGERENCIAS_SHEET_NAME || "Sugerencias"
      : env.BITACORA_SHEET_NAME || "Bitacora",
    spreadsheetId: env.BITACORA_SPREADSHEET_ID || "",
    submittedAt: new Date().toISOString(),
    token: env.BITACORA_WEBHOOK_TOKEN || "",
    fields,
  };

  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  if (env.BITACORA_WEBHOOK_TOKEN) {
    headers.set("authorization", `Bearer ${env.BITACORA_WEBHOOK_TOKEN}`);
  }

  const upstream = await fetch(env.BITACORA_WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!upstream.ok) {
    const error = await upstream.text();
    return jsonResponse({ ok: false, error: error || "No se pudo guardar la bitácora." }, 502);
  }

  const upstreamBody = await upstream.json().catch(() => null) as { ok?: boolean; error?: string } | null;
  if (!upstreamBody?.ok) {
    return jsonResponse({
      ok: false,
      error: upstreamBody?.error || "No se pudo guardar la solicitud.",
    }, 403);
  }

  return jsonResponse({ ok: true });
}

async function submitReportRequest(request: Request, env: Env): Promise<Response> {
  if (!env.BITACORA_WEBHOOK_URL) {
    return jsonResponse({ ok: false, error: "BITACORA_WEBHOOK_URL no está configurado." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, error: "El cuerpo de la solicitud no es JSON válido." }, 400);
  }

  const action = String(body.action || "");
  const allowedActions = new Set(["listarSemanas", "obtenerFilas", "generarPdf"]);
  if (!allowedActions.has(action)) {
    return jsonResponse({ ok: false, error: "Acción de reporte inválida." }, 400);
  }

  const payload = {
    action,
    semana: body.semana || "",
    sheetName: env.BITACORA_SHEET_NAME || "Bitacora",
    spreadsheetId: env.BITACORA_SPREADSHEET_ID || "",
    submittedAt: new Date().toISOString(),
    token: env.BITACORA_WEBHOOK_TOKEN || "",
  };

  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  if (env.BITACORA_WEBHOOK_TOKEN) {
    headers.set("authorization", `Bearer ${env.BITACORA_WEBHOOK_TOKEN}`);
  }

  const upstream = await fetch(env.BITACORA_WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!upstream.ok) {
    const error = await upstream.text();
    return jsonResponse({ ok: false, error: error || "No se pudo procesar el reporte." }, 502);
  }

  const upstreamBody = await upstream.json().catch(() => null) as { ok?: boolean; error?: string } | null;
  if (!upstreamBody?.ok) {
    return jsonResponse({
      ok: false,
      error: upstreamBody?.error || "No se pudo procesar el reporte.",
    }, 403);
  }

  return jsonResponse(upstreamBody);
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function validateFields(fields: Record<string, unknown>, formType: "bitacora" | "sugerencia"): string | null {
  if (!isValidCuenta(fields.cuenta)) {
    return "Ingresa un número de cuenta válido.";
  }

  if (!isValidInstitutionalEmail(fields.correo)) {
    return "Ingresa un correo institucional válido.";
  }

  if (formType === "sugerencia" && !isValidPhone(fields.telefono)) {
    return "Ingresa un número de teléfono válido.";
  }

  return null;
}

function isValidInstitutionalEmail(value: unknown): boolean {
  return /^[^\s@]+@unitec\.edu(\.hn)?$/i.test(String(value || "").trim());
}

function isValidPhone(value: unknown): boolean {
  return /^[1-9]\d{3}-?\d{4}$/.test(String(value || "").trim());
}

function isValidCuenta(value: unknown): boolean {
  return /^[1-9]\d{5,7}$/.test(String(value || "").trim());
}
