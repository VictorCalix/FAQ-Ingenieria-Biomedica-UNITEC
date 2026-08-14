const resources = [
  { title: "Guía rápida · Monitor de signos vitales", team: "Monitor", type: "Guía rápida", file: "#" },
  { title: "Manual · Monitor de signos vitales", team: "Monitor", type: "Manual", file: "#" },
  { title: "Guía rápida · Electrocardiógrafo", team: "Electrocardiógrafo", type: "Guía rápida", file: "#" },
  { title: "Manual · Electrocardiógrafo", team: "Electrocardiógrafo", type: "Manual", file: "#" }
];

const team = document.querySelector("#team-filter");
const type = document.querySelector("#type-filter");
const list = document.querySelector("#resource-list");
const empty = document.querySelector("#empty-state");

function render() {
  const items = resources.filter(item =>
    (team.dataset.value === "Todos" || item.team === team.dataset.value) &&
    (type.dataset.value === "Todos" || item.type === type.dataset.value)
  );
  list.innerHTML = items.map(item => `<article><span class="pdf">PDF</span><div><h3>${item.title}</h3><p>${item.team} · ${item.type}</p></div><a href="${item.file}" aria-label="Abrir ${item.title}">↗</a></article>`).join("");
  empty.hidden = items.length > 0;
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
  search.placeholder = select.id === "team-filter" ? "Buscar equipo…" : "Buscar documento…";
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
document.querySelector("#open-repository").addEventListener("click", () => openModal("#repository"));
document.querySelector("#open-suggestion").addEventListener("click", () => openModal("#suggestion"));
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", closeModal));
document.querySelectorAll(".overlay").forEach(overlay => overlay.addEventListener("click", event => { if (event.target === overlay) closeModal(); }));
document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });
document.querySelector("#suggestion-form").addEventListener("submit", event => { event.preventDefault(); event.target.reset(); closeModal(); alert("Formulario validado. Conectaremos el envío más adelante."); });
