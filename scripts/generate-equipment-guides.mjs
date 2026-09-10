import fs from "node:fs";
import path from "node:path";

const csvPath = "data/equipment-2026-q3.csv";
const documentsDir = "assets/documentos";
const guidesDir = path.join(documentsDir, "guias-rapidas");
const templatePath = path.join(documentsDir, "plantilla-guia-rapida.tex");
const existingDetailedGuides = new Set([
  "ecg100/electrocardiografo-ecg-100g-guia-rapida.tex",
  "electroencefalografo-mark-iv/electroencefalografo-mark-iv-guia-rapida.tex"
]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === "\"" && next === "\"") {
        field += "\"";
        index++;
      } else if (char === "\"") {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleCase(value) {
  const smallWords = new Set(["de", "del", "la", "las", "el", "los", "y", "con"]);
  return String(value || "")
    .split(/(\s+|\/|-)/)
    .map((part, index) => {
      if (/^\s+$|^\/$|^-$/.test(part)) return part;
      if (/^[A-Z0-9]{2,}$/.test(part) && part.length <= 6) return part;
      const lower = part.toLocaleLowerCase("es");
      if (index > 0 && smallWords.has(lower)) return lower;
      return lower.replace(/^[a-záéíóúñü]/, char => char.toLocaleUpperCase("es"));
    })
    .join("");
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

function clean(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return /^n\/?a$/i.test(text) ? "" : text;
}

function splitAccessories(value) {
  const text = clean(value);
  if (!text || /^(ninguno|ninguna|no tiene)$/i.test(text)) return [];
  return text.split(",").map(item => clean(item)).filter(Boolean);
}

function unique(values) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function latex(value) {
  return String(value || "")
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([#$%&_{}])/g, "\\$1")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/~/g, "\\textasciitilde{}");
}

function itemize(items, fallbackPrefix, count = 5) {
  const list = items.length ? items : Array.from({ length: count }, (_, index) => `${fallbackPrefix} ${index + 1}`);
  return list.map(item => `\\item ${latex(item)}`).join("\n");
}

function accessoryRows(accessories) {
  const list = accessories.length ? accessories : ["Accesorios no registrados en la hoja 2026 Q3"];
  return list.map(item => `${latex(item)} &\n  \\marcoimg{\\parbox{4.5cm}{\\centering\\accesorioimg{../../Accesorios Generales/[imagen-accesorio].png}}}\n  \\\\ \\hline`).join("\n");
}

function replaceRequired(source, search, replacement) {
  if (!source.includes(search)) {
    throw new Error(`No se encontro el marcador de plantilla: ${search}`);
  }
  return source.replace(search, replacement);
}

function replaceBetween(source, startNeedle, endNeedle, replacement, fromIndex = 0) {
  const start = source.indexOf(startNeedle, fromIndex);
  const contentStart = start + startNeedle.length;
  const end = source.indexOf(endNeedle, contentStart);
  if (start === -1 || end === -1) {
    throw new Error(`No se encontro el bloque de plantilla: ${startNeedle}`);
  }
  return `${source.slice(0, contentStart)}\n${replacement}\n${source.slice(end)}`;
}

function replaceItemizeAfter(source, marker, replacement) {
  const itemizeStart = "\\begin{itemize}[label=$\\square$, itemsep=4pt]";
  const fromIndex = source.indexOf(marker);
  if (fromIndex === -1) throw new Error(`No se encontro el bloque de plantilla: ${marker}`);
  return replaceBetween(source, itemizeStart, "\\end{itemize}", replacement, fromIndex);
}

function readRows() {
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8")).filter(row => row.some(cell => clean(cell)));
  const headers = rows.shift();
  const headerMap = headers.map(normalizeHeader);
  return rows.map(row => Object.fromEntries(headerMap.map((header, index) => [header, clean(row[index])])))
    .filter(row => row.equipo && row.modelo);
}

function buildData(rows) {
  const grouped = new Map();
  rows.forEach(row => {
    const key = `${normalizeHeader(row.equipo)}|${normalizeHeader(row.modelo)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });

  const repository = [...grouped.values()].map(group => {
    const first = group[0];
    const baseName = titleCase(first.equipo);
    const model = first.modelo;
    const brand = unique(group.map(row => row.marca)).join(" / ");
    return {
      name: `${baseName} - ${model}`,
      baseName,
      brand,
      model,
      locations: unique(group.map(row => row.ubicacion || row["ubicaci n"])),
      accessories: unique(group.flatMap(row => splitAccessories(row["listado de accesorios"]))),
      imageUrl: unique(group.map(row => row["url de la imagen"]))[0] || "",
      observations: unique(group.map(row => row.observaciones)),
    };
  }).sort((a, b) => a.name.localeCompare(b.name, "es"));

  const counts = new Map();
  const equipment = rows.map(row => {
    const baseName = titleCase(row.equipo);
    const model = row.modelo;
    const repositoryName = `${baseName} - ${model}`;
    counts.set(repositoryName, (counts.get(repositoryName) || 0) + 1);
    return {
      name: `${baseName} ${counts.get(repositoryName)}`,
      baseName,
      brand: row.marca,
      model,
      serialNumber: row["n serie"] || "",
      inventory: row["inventario fundaempresa"] || "",
      repositoryName,
      location: row.ubicacion || row["ubicaci n"] || "",
      accessories: splitAccessories(row["listado de accesorios"]),
      status: row.estado || "",
      imageUrl: row["url de la imagen"] || "",
      observations: row.observaciones || "",
    };
  });

  return { repository, equipment };
}

function renderGuide(item) {
  let guide = fs.readFileSync(templatePath, "utf8");
  const observations = item.observations.length ? item.observations : ["Observaciones no registradas en la hoja 2026 Q3"];

  guide = replaceRequired(guide, "[Nombre del equipo]", latex(item.baseName));
  guide = replaceRequired(guide, "[Marca]", latex(item.brand || "[Marca]"));
  guide = replaceRequired(guide, "[Modelo]", latex(item.model));
  guide = replaceRequired(guide, "Fotos de guias rapidas/[imagen-equipo].png", "[imagen-equipo].png");
  guide = replaceRequired(guide, "[Ubicación del equipo]", latex(item.locations.join(" / ") || "[Ubicación del equipo]"));
  guide = replaceRequired(guide, "[Ubicación de accesorios]", latex(item.locations.join(" / ") || "[Ubicación de accesorios]"));
  guide = replaceRequired(guide, "Fotos de guias rapidas/[imagen-partes].png", "[imagen-partes].png");
  guide = replaceRequired(guide, "[Vista / nombre del equipo / marca / modelo]", latex(item.name));
  guide = guide.replaceAll("Fotos de guias rapidas/[imagen-accesorio-", "../../Accesorios Generales/[imagen-accesorio-");

  guide = replaceBetween(
    guide,
    "\\begin{enumerate}[label=\\arabic*.,itemsep=2pt]",
    "\\end{enumerate}",
    itemize([], "[Parte]")
  );

  guide = replaceBetween(
    guide,
    "\\hline",
    "\\end{longtable}",
    accessoryRows(item.accessories)
  );

  guide = replaceItemizeAfter(guide, "% ---------- VERIFICACIÓN DE ELEMENTOS ----------", itemize(item.accessories, "Elemento a verificar"));
  guide = replaceItemizeAfter(guide, "% ---------- MONTAJE ----------", itemize([], "Paso de montaje"));
  guide = replaceItemizeAfter(guide, "% ---------- DESMONTAJE ----------", itemize([], "Paso de desmontaje"));

  return guide.replace(
    "\\end{document}",
    `\\seccionbanda{OBSERVACIONES EN INVENTARIO}\n\\noindent\\colorbox{lightblue}{\\parbox{\\dimexpr\\linewidth-2\\fboxsep\\relax}{\\begin{itemize}[itemsep=4pt]\n${itemize(observations, "ObservaciÃ³n")}\n\\end{itemize}}}\\par\n\\end{document}`
  );
}

function guideFolderName(item) {
  return slug(item.name) === "electrocardiografo-ecg-100g" ? "ecg100" : slug(item.name);
}

const rows = readRows();
const data = buildData(rows);
fs.writeFileSync("equipment-data.js", `const equipmentData = ${JSON.stringify(data, null, 2)};\n`, "utf8");

data.repository.forEach(item => {
  const cleanFileName = `${slug(item.name)}-guia-rapida.tex`;
  const folderName = guideFolderName(item);
  const relativePath = `${folderName}/${cleanFileName}`;
  const fileName = existingDetailedGuides.has(relativePath) ? cleanFileName : `!${cleanFileName}`;
  if (existingDetailedGuides.has(relativePath)) return;
  const outputDir = path.join(guidesDir, folderName);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, fileName), renderGuide(item), "utf8");
});
