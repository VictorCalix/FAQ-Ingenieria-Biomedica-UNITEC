/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  BITACORA_WEBHOOK_URL?: string;
  BITACORA_SHEET_NAME?: string;
  SUGERENCIAS_SHEET_NAME?: string;
  BITACORA_WEBHOOK_TOKEN?: string;
  BITACORA_SPREADSHEET_ID?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/bitacora" && request.method === "POST") {
      return submitSheetForm(request, env, "bitacora");
    }

    if (url.pathname === "/api/sugerencia" && request.method === "POST") {
      return submitSheetForm(request, env, "sugerencia");
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;

async function submitSheetForm(request: Request, env: Env, formType: "bitacora" | "sugerencia"): Promise<Response> {
  if (!env.BITACORA_WEBHOOK_URL) {
    return jsonResponse({ ok: false, error: "BITACORA_WEBHOOK_URL no esta configurado." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, error: "El cuerpo de la solicitud no es JSON valido." }, 400);
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
    return jsonResponse({ ok: false, error: error || "No se pudo guardar la bitacora." }, 502);
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

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function validateFields(fields: Record<string, unknown>, formType: "bitacora" | "sugerencia"): string | null {
  if (!isValidCuenta(fields.cuenta)) {
    return "Ingresa un numero de cuenta valido.";
  }

  if (!isValidInstitutionalEmail(fields.correo)) {
    return "Ingresa un correo institucional valido.";
  }

  if (formType === "sugerencia" && !isValidPhone(fields.telefono)) {
    return "Ingresa un numero de telefono valido.";
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
