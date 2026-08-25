# FAQ Ingenieria Biomedica UNITEC

Sitio estatico para preguntas frecuentes, repositorio de recursos, bitacora de laboratorio y reportes PDF.

## Paginas

- `index.html`: FAQ y repositorio.
- `bitacora.html`: formulario de bitacora y generacion de reportes PDF.

## APIs

El Worker en `worker/index.ts` conserva estas rutas:

- `POST /api/bitacora`
- `POST /api/sugerencia`
- `POST /api/bitacora/reporte`

Todas reenvian datos al webhook de Google Apps Script configurado con las variables de entorno descritas en `BITACORA_SYNC.md`.

## Build

```bash
npm run build
```

El build usa Vite y genera las paginas estaticas actuales. No usa la app React/Next anterior.

## Deploy

En Cloudflare Pages usa:

- Build command: `npm run build`
- Output directory: `dist`
