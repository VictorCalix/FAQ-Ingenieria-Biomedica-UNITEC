import { equipmentData } from "./equipment-data.js";

function normalizeRepositoryKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\bseries\b/g, "serie")
    .replace(/[^a-z0-9]/g, "");
}

function getRepositoryKey(item) {
  return [
    normalizeRepositoryKey(item.baseName || item.name),
    normalizeRepositoryKey(item.model || item.name)
  ].join("|");
}

function getDocumentSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getDocumentPath(equipmentName, type) {
  const suffix = type === "Manual" ? "manual" : "guia-rapida";
  return `assets/documentos/${getDocumentSlug(equipmentName)}-${suffix}.pdf`;
}

const repositoryEquipment = [...new Map(
  equipmentData.repository.map(item => [getRepositoryKey(item), item])
).values()];
const resources = repositoryEquipment.flatMap(item => [
  {
    title: `Guia rapida - ${item.name}`,
    team: item.name,
    type: "Guia rapida",
    file: getDocumentPath(item.name, "Guia rapida")
  },
  {
    title: `Manual - ${item.name}`,
    team: item.name,
    type: "Manual",
    file: getDocumentPath(item.name, "Manual")
  }
]);
const resourceAvailability = new Map(resources.map(item => [item.file, null]));

const team = document.querySelector("#team-filter");
const type = document.querySelector("#type-filter");
const list = document.querySelector("#resource-list");
const empty = document.querySelector("#empty-state");

repositoryEquipment.forEach(item => {
  const option = document.createElement("button");
  option.type = "button";
  option.role = "option";
  option.dataset.value = item.name;
  option.setAttribute("aria-selected", "false");
  option.textContent = item.name;
  team.querySelector(".select-options").append(option);
});

function render() {
  const items = resources.filter(item =>
    (team.dataset.value === "Todos" || item.team === team.dataset.value) &&
    (type.dataset.value === "Todos" || item.type === type.dataset.value)
  );
  list.innerHTML = items.map(item => {
    const available = resourceAvailability.get(item.file);
    const link = available === false
      ? `<span class="resource-missing" aria-label="${item.title} no disponible">Pendiente</span>`
      : `<a href="${item.file}" target="_blank" rel="noopener" aria-label="Abrir ${item.title}">Abrir</a>`;

    return `<article><span class="pdf">PDF</span><div><h3>${item.title}</h3><p>${item.team} - ${item.type}</p></div>${link}</article>`;
  }).join("");
  empty.hidden = items.length > 0;
}

async function updateResourceAvailability() {
  await Promise.all(resources.map(async item => {
    try {
      const response = await fetch(item.file, { method: "HEAD" });
      resourceAvailability.set(item.file, response.ok);
    } catch {
      resourceAvailability.set(item.file, false);
    }
  }));
  render();
}

function setSelectValue(select, value) {
  const trigger = select.querySelector(".select-trigger span");
  const option = [...select.querySelectorAll("[role=option]")]
    .find(item => item.dataset.value === value);

  if (!option) return false;

  select.dataset.value = value;
  trigger.textContent = option.textContent;
  select.querySelectorAll("[role=option]").forEach(item => {
    item.setAttribute("aria-selected", String(item === option));
  });
  return true;
}

function applyQrEquipmentFilter() {
  const params = new URLSearchParams(window.location.search);
  const requestedEquipment = params.get("equipo");
  if (!requestedEquipment) return;

  const selected = repositoryEquipment.find(item =>
    getDocumentSlug(item.name) === requestedEquipment ||
    normalizeRepositoryKey(item.name) === normalizeRepositoryKey(requestedEquipment)
  );

  if (!selected) return;

  setSelectValue(team, selected.name);
  setSelectValue(type, "Todos");
  render();
  openModal("#repository");
}

function closeSelect(select) {
  select.classList.remove("open");
  select.querySelector(".select-trigger").setAttribute("aria-expanded", "false");
  select.querySelector(".select-options").hidden = true;
  const search = select.querySelector(".select-search");
  search.value = "";
  select.querySelectorAll("[role=option]").forEach(option => option.hidden = false);
  select.querySelector(".no-options").hidden = true;
}

document.querySelectorAll(".custom-select").forEach(select => {
  const trigger = select.querySelector(".select-trigger");
  const menu = select.querySelector(".select-options");
  const search = document.createElement("input");
  const noOptions = document.createElement("small");
  search.className = "select-search";
  search.type = "search";
  search.placeholder = select.id === "team-filter" ? "Buscar equipo..." : "Buscar documento...";
  search.setAttribute("aria-label", search.placeholder);
  noOptions.className = "no-options";
  noOptions.textContent = "Sin coincidencias";
  noOptions.hidden = true;
  menu.prepend(noOptions);
  menu.prepend(search);
  trigger.addEventListener("click", event => {
    event.stopPropagation();
    document.querySelectorAll(".custom-select.open").forEach(open => { if (open !== select) closeSelect(open); });
    const opening = menu.hidden;
    menu.hidden = !opening;
    select.classList.toggle("open", opening);
    trigger.setAttribute("aria-expanded", String(opening));
    if (opening) search.focus();
  });
  search.addEventListener("click", event => event.stopPropagation());
  search.addEventListener("input", () => {
    const query = search.value.trim().toLocaleLowerCase("es");
    let matches = 0;
    menu.querySelectorAll("[role=option]").forEach(option => {
      const visible = option.textContent.toLocaleLowerCase("es").includes(query);
      option.hidden = !visible;
      if (visible) matches++;
    });
    noOptions.hidden = matches !== 0;
  });
  menu.querySelectorAll("[role=option]").forEach(option => option.addEventListener("click", () => {
    select.dataset.value = option.dataset.value;
    trigger.querySelector("span").textContent = option.textContent;
    menu.querySelectorAll("[role=option]").forEach(item => item.setAttribute("aria-selected", String(item === option)));
    closeSelect(select);
    trigger.focus();
    render();
  }));
  select.addEventListener("keydown", event => {
    if (event.key === "Escape") { closeSelect(select); trigger.focus(); }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const options = [...menu.querySelectorAll("[role=option]:not([hidden])")];
      if (!options.length) return;
      const current = options.indexOf(document.activeElement);
      const next = event.key === "ArrowDown" ? Math.min(current + 1, options.length - 1) : Math.max(current - 1, 0);
      if (!menu.hidden) { event.preventDefault(); options[next < 0 ? 0 : next].focus(); }
    }
  });
});
document.addEventListener("click", () => document.querySelectorAll(".custom-select.open").forEach(closeSelect));
render();

let active;
function openModal(id) { active = document.querySelector(id); active.hidden = false; document.body.classList.add("modal-open"); }
function closeModal() { if (!active) return; active.hidden = true; active = null; document.body.classList.remove("modal-open"); }
function isValidInstitutionalEmail(value) { return /^[^\s@]+@unitec\.edu(\.hn)?$/i.test(value); }
function isValidPhone(value) { return /^[1-9]\d{3}-?\d{4}$/.test(value); }
function isValidCuenta(value) { return /^[1-9]\d{5,7}$/.test(value); }
function normalizeCuentaInput(input) { input.value = input.value.replace(/\D/g, "").slice(0, 8); }
function normalizePhoneInput(input) {
  input.value = input.value
    .replace(/[^\d-]/g, "")
    .replace(/(?!^.{4})-/g, "")
    .slice(0, 9);
}
document.querySelector("#open-repository").addEventListener("click", () => openModal("#repository"));
document.querySelector("#open-suggestion").addEventListener("click", () => openModal("#suggestion"));
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", closeModal));
document.querySelectorAll(".overlay").forEach(overlay => overlay.addEventListener("click", event => { if (event.target === overlay) closeModal(); }));
document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });
applyQrEquipmentFilter();
updateResourceAvailability();
document.querySelector("#suggestion-form input[name=cuenta]").addEventListener("input", event => normalizeCuentaInput(event.target));
document.querySelector("#suggestion-form input[name=telefono]").addEventListener("input", event => normalizePhoneInput(event.target));
document.querySelector("#suggestion-form").addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.target;
  const submitButton = form.querySelector(".submit");
  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";

  const payload = {
    nombre: form.elements.nombre.value.trim(),
    cuenta: form.elements.cuenta.value.trim(),
    correo: form.elements.correo.value.trim(),
    telefono: form.elements.telefono.value.trim(),
    pregunta: form.elements.pregunta.value.trim()
  };

  if (!isValidCuenta(payload.cuenta)) {
    alert("Ingresa un numero de cuenta valido.");
    submitButton.disabled = false;
    submitButton.textContent = "Enviar pregunta";
    return;
  }

  if (!isValidInstitutionalEmail(payload.correo)) {
    alert("Ingresa un correo institucional valido.");
    submitButton.disabled = false;
    submitButton.textContent = "Enviar pregunta";
    return;
  }

  if (!isValidPhone(payload.telefono)) {
    alert("Ingresa un numero de telefono valido.");
    submitButton.disabled = false;
    submitButton.textContent = "Enviar pregunta";
    return;
  }

  try {
    const response = await fetch("/api/sugerencia", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result?.error || "No se pudo enviar la sugerencia.");
    }
  } catch (error) {
    alert(error.message || "No se pudo sincronizar la sugerencia. Intentalo de nuevo.");
    submitButton.disabled = false;
    submitButton.textContent = "Enviar pregunta";
    return;
  }

  form.reset();
  submitButton.disabled = false;
  submitButton.textContent = "Enviar pregunta";
  closeModal();
  alert("Pregunta enviada correctamente.");
});
