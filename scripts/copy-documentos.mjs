import { cp, mkdir } from "node:fs/promises";

await mkdir("dist/assets", { recursive: true });
await cp("assets/documentos", "dist/assets/documentos", {
  recursive: true,
  force: true,
});
await cp("equipment-data.js", "dist/equipment-data.js", { force: true });
await cp("manual-data.js", "dist/manual-data.js", { force: true });
await cp("script.js", "dist/script.js", { force: true });
