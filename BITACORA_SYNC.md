# Sincronización de Bitácora con Google Sheets

La bitácora no depende de Google Forms. El formulario envía sus respuestas a
`/api/bitacora`, y el Worker las reenvía al webhook de Google Apps Script.

## Variables

Copia `.env.example` a tu configuración real y cambia estos valores:

```env
BITACORA_WEBHOOK_URL=https://script.google.com/macros/s/AKfycbxZue3jhXKwLuAiHBB3g2uH2dIxOc_FpVEDpQBgEJpBPD8Kb_xAm_6_J5iV6uD_maaU/exec
BITACORA_SHEET_NAME=2026Q3
SUGERENCIAS_SHEET_NAME=Sugerencias FAQ
BITACORA_WEBHOOK_TOKEN=BiomedFAQBitacoraDigitalByVictor
BITACORA_SPREADSHEET_ID=1ol9Gx_nSO20OOPGlqvQpkCgXDlCWa082PN5qaj-hZrM
```

Para cambiar la hoja activa cada 11 semanas, cambia solo:

```env
BITACORA_SHEET_NAME=2026Q4
```

Si la hoja no existe, el Apps Script la crea con encabezados.

## Apps Script

1. Abre el Google Sheet.
2. Ve a `Extensiones > Apps Script`.
3. Pega el contenido de `google-apps-script-bitacora.js`.
4. Confirma que `WEBHOOK_TOKEN` tenga el mismo valor de `BITACORA_WEBHOOK_TOKEN`.
5. Ejecuta una vez `setupSheets()` para crear la hoja `2026Q3` y la hoja `Sugerencias FAQ` con sus campos.
6. Despliega como `Aplicación web`. Si ya existe un despliegue, entra a
   `Administrar implementaciones`, edita con el lápiz y selecciona
   `Nueva versión`; guardar el código no actualiza la URL `/exec` por sí solo.
7. Copia la URL `/exec` en `BITACORA_WEBHOOK_URL`.

## Blacklist de Sugerencias

La blacklist solo aplica al formulario de sugerencias, no a la bitacora.
Para bloquear cuentas, edita este arreglo en `google-apps-script-bitacora.js`:

```js
const SUGERENCIAS_BLACKLIST_CUENTAS = [
  "12241087",
  "12109834",
];
```

Despues de cambiarla, actualiza el despliegue del Apps Script con una nueva
version. Guardar el archivo sin redeploy no actualiza la URL `/exec`.

Webhook actual:

```text
https://script.google.com/macros/s/AKfycbxZue3jhXKwLuAiHBB3g2uH2dIxOc_FpVEDpQBgEJpBPD8Kb_xAm_6_J5iV6uD_maaU/exec
```

El script está enlazado a este archivo:

```text
https://docs.google.com/spreadsheets/d/1ol9Gx_nSO20OOPGlqvQpkCgXDlCWa082PN5qaj-hZrM/edit
```

## Columnas Guardadas

### Bitácora

- Marca temporal
- Nombre completo
- Número de cuenta | TH
- Fecha
- Correo institucional
- Hora de inicio
- Hora de fin
- Equipo
- Accesorios
- Insumos
- Observaciones
- Validado por Pasante

### Sugerencias FAQ

- Marca temporal
- Nombre completo
- Número de cuenta | TH
- Correo institucional
- Número de teléfono
- Pregunta
