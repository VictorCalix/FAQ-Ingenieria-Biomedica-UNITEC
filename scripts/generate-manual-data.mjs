import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const manualsRoot = path.resolve("assets/documentos/manuales");
const documentsRoot = path.resolve("assets/documentos");
const quickGuidesRoot = path.join(documentsRoot, "guias-rapidas");
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

function isUnvalidatedFile(filePath) {
  return /^[!?]/.test(path.basename(filePath));
}

function walk(dir, predicate = () => true) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, predicate);
    return entry.isFile() && entry.name.toLocaleLowerCase("es").endsWith(".pdf") && predicate(full) ? [full] : [];
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
const equipmentBySlug = new Map(equipment.map(item => [slug(item.name), item]));
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

function getSelectedEquipment(file, relative, root) {
  const relativeFromRoot = path.relative(root, file).split(path.sep);
  const normalizedFolders = relativeFromRoot.slice(0, -1).map(normalize);
  const mappedFolder = [...folderEquipmentMap]
    .sort((a, b) => b[0].length - a[0].length)
    .find(([folder]) => normalizedFolders.some(item => item.includes(folder)))?.[1];
  const ranked = equipment
    .map(item => ({ item, score: scoreEquipment(item, relative) }))
    .sort((a, b) => b.score - a.score);
  const mappedEquipment = mappedFolder ? equipmentByName.get(mappedFolder) : null;
  return mappedEquipment ? { item: mappedEquipment, score: 999 } : ranked[0];
}

const manualResources = walk(manualsRoot, file => !isUnvalidatedFile(file)).map(file => {
  const relative = path.relative(".", file).split(path.sep).join("/");
  const selected = getSelectedEquipment(file, relative, manualsRoot);

  return {
    title: cleanTitle(file),
    team: selected?.score >= 40 && selected.item ? selected.item.name : path.basename(path.dirname(file)),
    type: getType(file),
    file: encodeURI(relative).replace(/#/g, "%23")
  };
});

const quickGuideResources = fs.existsSync(quickGuidesRoot) ? walk(quickGuidesRoot, file => {
  const name = path.basename(file).toLocaleLowerCase("es");
  return !isUnvalidatedFile(file) && name.endsWith("-guia-rapida.pdf");
}).map(file => {
  const relative = path.relative(".", file).split(path.sep).join("/");
  const fileSlug = slug(path.basename(file, ".pdf").replace(/-guia-rapida$/i, ""));
  const selected = equipmentBySlug.get(fileSlug) || getSelectedEquipment(file, relative, documentsRoot)?.item;
  const team = selected?.name || cleanTitle(file).replace(/\s+guia rapida$/i, "");

  return {
    title: `Guia rapida - ${team}`,
    team,
    type: "Guia rapida",
    file: encodeURI(relative).replace(/#/g, "%23")
  };
}) : [];

const manualData = [...manualResources, ...quickGuideResources]
  .sort((a, b) => a.team.localeCompare(b.team, "es") || a.type.localeCompare(b.type, "es") || a.title.localeCompare(b.title, "es"));

fs.writeFileSync(
  "manual-data.js",
  `/* eslint-disable @typescript-eslint/no-unused-vars */\nconst manualData = ${JSON.stringify(manualData, null, 2)};\n`,
  "utf8"
);
