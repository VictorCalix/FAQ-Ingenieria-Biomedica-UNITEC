"use client";

import { useMemo, useState } from "react";

const faqs = [
  { q: "¿Cómo puedo solicitar apoyo para utilizar un equipo?", a: "Muy pronto encontrarás aquí el procedimiento completo y los contactos correspondientes." },
  { q: "¿Dónde encuentro las guías rápidas y los manuales?", a: "En el repositorio podrás filtrar los documentos por equipo y por tipo de recurso." },
  { q: "¿Qué hago si detecto una falla?", a: "No utilices el equipo. Repórtalo mediante la bitácora y comunica la situación al responsable del laboratorio." },
];

const resources = [
  { title: "Guía rápida · Monitor de signos vitales", team: "Monitor", type: "Guía rápida" },
  { title: "Manual · Monitor de signos vitales", team: "Monitor", type: "Manual" },
  { title: "Guía rápida · Electrocardiógrafo", team: "Electrocardiógrafo", type: "Guía rápida" },
  { title: "Manual · Electrocardiógrafo", team: "Electrocardiógrafo", type: "Manual" },
];

export default function Home() {
  const [modal, setModal] = useState<"question" | "log" | null>(null);
  const [team, setTeam] = useState("Todos");
  const [type, setType] = useState("Todos");
  const filtered = useMemo(() => resources.filter((r) => (team === "Todos" || r.team === team) && (type === "Todos" || r.type === type)), [team, type]);

  return (
    <main>
      <header className="hero">
        <nav><div className="brand"><span className="logo-placeholder">IB</span><span>Ingeniería Biomédica<br/><small>UNITEC</small></span></div><a href="#repositorio">Repositorio</a></nav>
        <div className="hero-copy"><span className="eyebrow">CENTRO DE RECURSOS · 2026</span><h1>Respuestas claras.<br/><em>Equipos bien cuidados.</em></h1><p>Un espacio para resolver dudas, registrar el uso de equipos y encontrar recursos del laboratorio.</p><a className="primary" href="#preguntas">Explorar preguntas <span>↓</span></a></div>
        <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
      </header>

      <section id="preguntas" className="section faq-section"><div className="section-heading"><span>01 / PREGUNTAS FRECUENTES</span><h2>Lo esencial, a mano</h2><p>Selecciona una pregunta para conocer la respuesta.</p></div>
        <div className="faq-list">{faqs.map((item, i) => <details key={item.q}><summary><span className="number">0{i + 1}</span>{item.q}<span className="plus">+</span></summary><div className="answer">{item.a}</div></details>)}</div>
      </section>

      <section className="suggest"><div><span className="eyebrow dark">¿NO ENCONTRASTE LO QUE BUSCABAS?</span><h2>Tu pregunta puede ayudar a toda la comunidad.</h2></div><button className="outline" onClick={() => setModal("question")}>Sugerir una pregunta <span>↗</span></button></section>

      <section className="section tools"><div className="section-heading"><span>02 / HERRAMIENTAS</span><h2>Todo en un mismo lugar</h2></div><div className="tool-grid">
        <article className="tool-card lime"><span className="card-index">01</span><div><span className="icon">✓</span><h3>Bitácora</h3><p>Registra el uso, estado y observaciones de los equipos del laboratorio.</p><button onClick={() => setModal("log")}>Rellenar bitácora <span>→</span></button></div></article>
        <article className="tool-card navy" id="repositorio"><span className="card-index">02</span><div><span className="icon">↧</span><h3>Repositorio</h3><p>Consulta guías rápidas y manuales técnicos, organizados por equipo.</p><a href="#documentos">Ver documentos <span>→</span></a></div></article>
      </div></section>

      <section id="documentos" className="section repository"><div className="repo-head"><div><span>03 / REPOSITORIO</span><h2>Documentos técnicos</h2></div><div className="filters"><label>Equipo<select value={team} onChange={e => setTeam(e.target.value)}><option>Todos</option><option>Monitor</option><option>Electrocardiógrafo</option></select></label><label>Tipo<select value={type} onChange={e => setType(e.target.value)}><option>Todos</option><option>Guía rápida</option><option>Manual</option></select></label></div></div>
        <div className="resource-list">{filtered.map(r => <article key={r.title}><span className="pdf">PDF</span><div><h3>{r.title}</h3><p>{r.team} · {r.type}</p></div><button aria-label={`Abrir ${r.title}`}>↗</button></article>)}</div>
      </section>

      <footer><div className="brand"><span className="logo-placeholder">IB</span><span>Ingeniería Biomédica<br/><small>UNITEC</small></span></div><p>Recursos para una práctica segura y responsable.</p><span>© 2026</span></footer>

      {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={() => setModal(null)} aria-label="Cerrar">×</button>
        {modal === "question" ? <><span className="eyebrow dark">NUEVA CONSULTA</span><h2 id="modal-title">Sugiere una pregunta</h2><p>Déjanos tus datos para poder dar seguimiento a tu consulta.</p><form onSubmit={e => {e.preventDefault(); setModal(null)}}><div className="two"><label>Nombre completo<input required /></label><label>Número de cuenta<input required inputMode="numeric" /></label></div><div className="two"><label>Correo institucional<input required type="email" placeholder="nombre@unitec.edu" /></label><label>Número de teléfono<input required type="tel" /></label></div><label>Carrera<input required /></label><label>Pregunta<textarea required rows={4}/></label><button className="primary form-submit">Enviar pregunta →</button></form></> : <><span className="eyebrow dark">REGISTRO DE EQUIPO</span><h2 id="modal-title">Bitácora</h2><p>Este formulario queda listo para incorporar los campos definitivos.</p><form onSubmit={e => {e.preventDefault(); setModal(null)}}><div className="two"><label>Nombre completo<input required /></label><label>Número de cuenta<input required /></label></div><label>Equipo<select required><option value="">Selecciona un equipo</option><option>Monitor de signos vitales</option><option>Electrocardiógrafo</option></select></label><label>Observaciones<textarea rows={4}/></label><button className="primary form-submit">Registrar uso →</button></form></>}
      </div></div>}
    </main>
  );
}
