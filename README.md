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
Tambien copia `assets/documentos` a `dist/assets/documentos` para publicar PDFs.

## Manuales y guias

Coloca los PDFs en `assets/documentos` siguiendo este formato:

```text
<equipo-normalizado>-manual.pdf
<equipo-normalizado>-guia-rapida.pdf
```

Ejemplo:

```text
analizador-de-desfibrilador-da-2006p-manual.pdf
analizador-de-desfibrilador-da-2006p-guia-rapida.pdf
```

Para QR por equipo, usa una URL con el parametro `equipo`:

```text
/?equipo=analizador-de-desfibrilador-da-2006p
```

Esa URL abre el repositorio filtrado a ese equipo.

## Deploy

Para publicar sitio estatico + Worker API usa:

- Build command: `npm run build`
- Deploy command: `npm run deploy`
- Output directory: `dist`

`wrangler.jsonc` debe estar en el repositorio porque define `worker/index.ts` y los assets de `dist`.
