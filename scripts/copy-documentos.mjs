import { cp, mkdir } from "node:fs/promises";

await mkdir("dist/assets", { recursive: true });
await cp("assets/documentos", "dist/assets/documentos", {
  recursive: true,
  force: true,
});
