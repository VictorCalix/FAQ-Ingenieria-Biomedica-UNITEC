import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve("assets/documentos/manuales");
const equipmentSource = fs.readFileSync("equipment-data.js", "utf8");
const context = {};
vm.createContext(context);
vm.runInContext(`${equipmentSource}; this.equipmentData = equipmentData;`, context);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\bseries\b/g, "serie")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value) {
  return normalize(value).split(" ").filter(token => token.length > 1);
}

function slug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.toLocaleLowerCase("es").endsWith(".pdf") ? [full] : [];
  });
}

function scoreEquipment(equipment, filePath) {
  const normalizedPath = normalize(filePath);
  const relativeParts = filePath.split(/[\\/]/);
  const folderNames = relativeParts.slice(0, -1).map(normalize);
  const fileName = normalize(relativeParts.at(-1));
  const modelTokens = tokens(equipment.model).filter(token => token !== "n" && token !== "a");
  const baseTokens = tokens(equipment.baseName);
  const nameTokens = tokens(equipment.name);
  let score = 0;

  if (normalize(equipment.name) && normalizedPath.includes(normalize(equipment.name))) score += 120;
  if (normalize(equipment.model) && normalizedPath.includes(normalize(equipment.model))) score += 90;
  if (normalize(equipment.baseName) && folderNames.some(folder => folder.includes(normalize(equipment.baseName)))) score += 55;

  modelTokens.forEach(token => {
    if (normalizedPath.includes(token)) score += 30;
  });
  baseTokens.forEach(token => {
    if (folderNames.some(folder => folder.includes(token))) score += 12;
  });
  nameTokens.forEach(token => {
    if (fileName.includes(token)) score += 2;
  });

  return score;
}

function getType(name) {
  const normalized = normalize(name);
  if (normalized.includes("guia") || normalized.includes("quick guide")) return "Guia rapida";
  if (normalized.includes("servicio") || normalized.includes("service")) return "Manual de servicio";
  if (normalized.includes("configuracion") || normalized.includes("instalacion")) return "Guia de instalacion";
  return "Manual";
}

function cleanTitle(name) {
  return path.basename(name, path.extname(name))
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const equipment = context.equipmentData.repository;
const folderEquipmentMap = new Map([
  ["analizador de electrocirugia", "Analizador de Unidad Electroquirúrgica - ESU-2300"],
  ["esterilizador", "Autoclave - SA-232"],
  ["generador de electrocirugia", "Unidad de Electrocirugía - ForceFX"],
  ["electrocardiografo", "Electrocardiógrafo - ECG 100G"],
  ["electrocardiografo ecgmac", "Electrocardiógrafo - Digital 3 Channels Electrocardiograph"],
  ["simulador de agente anestesico", "Analizador de Agente Anestésico - AA-8000"],
  ["simulador de no invasivo de presion", "Simulador de NIBP - NIBP-1010"],
  ["simulador de pulmones", "Simulador Pulmonar - LS-2000A"]
]);
const equipmentByName = new Map(equipment.map(item => [item.name, item]));
const manualData = walk(root).map(file => {
  const relative = path.relative(".", file).split(path.sep).join("/");
  const relativeFromRoot = path.relative(root, file).split(path.sep);
  const normalizedFolders = relativeFromRoot.slice(0, -1).map(normalize);
  const mappedFolder = [...folderEquipmentMap]
    .sort((a, b) => b[0].length - a[0].length)
    .find(([folder]) => normalizedFolders.some(item => item.includes(folder)))?.[1];
  const ranked = equipment
    .map(item => ({ item, score: scoreEquipment(item, relative) }))
    .sort((a, b) => b.score - a.score);
  const selected = mappedFolder ? { item: equipmentByName.get(mappedFolder), score: 999 } : ranked[0];

  return {
    title: cleanTitle(file),
    team: selected?.score >= 40 ? selected.item.name : path.basename(path.dirname(file)),
    type: getType(file),
    file: encodeURI(relative).replace(/#/g, "%23")
  };
}).sort((a, b) => a.team.localeCompare(b.team, "es") || a.type.localeCompare(b.type, "es") || a.title.localeCompare(b.title, "es"));

fs.writeFileSync(
  "manual-data.js",
  `const manualData = ${JSON.stringify(manualData, null, 2)};\n`,
  "utf8"
);
