// Diagrama polar de un micrófono, dibujado en SVG.
// Si hay medidas del fabricante (POLARES, en polares-datos.js) se dibuja una curva por frecuencia
// y el patrón teórico queda como referencia discontinua. Si no, solo el teórico.
// Los patrones teóricos de primer orden siguen r(θ) = |A + (1 − A)·cos θ|; A fija el patrón.
// La escala es en dB, como en las fichas de los fabricantes: 0° es el frente del micrófono.

const AYUDA = "Toca o pasa el puntero por el diagrama para leer el nivel en cada ángulo.";

const PATRONES = {
  omni:          { nombre: "Omnidireccional", A: 1 },
  cardioideAncho:{ nombre: "Cardioide ancho", A: 0.7 },
  cardioide:     { nombre: "Cardioide", A: 0.5 },
  supercardioide:{ nombre: "Supercardioide", A: 0.37 },
  hipercardioide:{ nombre: "Hipercardioide", A: 0.25 },
  ocho:          { nombre: "Figura de ocho", A: 0 },
  semicardioide: { nombre: "Semicardioide", A: 0.5, superficie: true },
};

const POLAR = { suelo: -30, anillos: [0, -6, -12, -18, -24], r: 120, c: 150 };

// Nivel teórico en dB a un ángulo (grados) para un patrón
function nivelDb(p, grados) {
  const t = grados * Math.PI / 180;
  if (p.superficie && Math.cos(t) < -1e-9) return -Infinity;
  const g = Math.abs(p.A + (1 - p.A) * Math.cos(t));
  return g === 0 ? -Infinity : 20 * Math.log10(g);
}

// Por detrás del eje nulo la señal llega con la polaridad invertida (lóbulo trasero)
function invertida(p, grados) {
  return !p.superficie && p.A + (1 - p.A) * Math.cos(grados * Math.PI / 180) < -1e-9;
}

// Nivel medido a un ángulo, interpolando entre los puntos (cada 5°). null si el ángulo no está medido.
function nivelMedido(puntos, grados) {
  const g = ((grados % 360) + 360) % 360;
  const mapa = puntos._mapa || (puntos._mapa = new Map(puntos.map(([a, db]) => [a, db])));
  const a1 = Math.floor(g / 5) * 5, a2 = (a1 + 5) % 360;
  const d1 = mapa.get(a1), d2 = mapa.get(a2);
  if (d1 === undefined || d2 === undefined) return d1 ?? null;
  return d1 + (d2 - d1) * (g - a1) / 5;
}

// Radio en píxeles para un nivel en dB (por debajo del suelo, al centro)
const radioDb = db => POLAR.r * Math.max(0, (Math.max(db, POLAR.suelo) - POLAR.suelo) / -POLAR.suelo);

// Coordenadas con 0° arriba y los ángulos creciendo en sentido horario
function punto(grados, r) {
  const t = grados * Math.PI / 180;
  return [POLAR.c + r * Math.sin(t), POLAR.c - r * Math.cos(t)];
}

const fmtDb = db => db === -Infinity || db <= POLAR.suelo
  ? "sin captación"
  : (Math.abs(db) < 0.05 ? "0 dB" : `${db.toFixed(1).replace(".", ",").replace("-", "−")} dB`);
const fmtFrec = f => f >= 1000 ? `${String(f / 1000).replace(".", ",")} kHz` : `${f} Hz`;
const nombreCurva = m => m.etiqueta || fmtFrec(m.frecuencia);

function curvaTeorica(p) {
  const desde = p.superficie ? -90 : -180, hasta = p.superficie ? 90 : 180;
  const pts = [];
  for (let g = desde; g <= hasta; g += 1) pts.push(punto(g, radioDb(nivelDb(p, g))));
  return "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";
}

function curvaMedida(puntos) {
  // Se recorre en orden angular empezando por −180° para que un diagrama de medio círculo quede cerrado
  const orden = [...puntos].sort((a, b) => ((a[0] + 180) % 360) - ((b[0] + 180) % 360));
  const pts = orden.map(([a, db]) => punto(a, radioDb(db)));
  const ruta = "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L");
  return puntos.length >= 72 ? ruta + "Z" : ruta + `L${POLAR.c},${POLAR.c}Z`;
}

function rejilla(p) {
  const { c, r } = POLAR;
  let s = "";
  POLAR.anillos.forEach(db => {
    s += `<circle class="pl-anillo" cx="${c}" cy="${c}" r="${radioDb(db).toFixed(1)}"/>`;
  });
  for (let g = 0; g < 360; g += 30) {
    const [x, y] = punto(g, r);
    s += `<line class="pl-radio" x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
  }
  POLAR.anillos.forEach(db => {
    const y = c - radioDb(db);
    s += `<text class="pl-txt" x="${c + 4}" y="${(y + 11).toFixed(1)}">${db === 0 ? "0 dB" : "−" + -db}</text>`;
  });
  [[0, "0°"], [90, "90°"], [180, "180°"], [270, "270°"]].forEach(([g, t]) => {
    const [x, y] = punto(g, r + 16);
    s += `<text class="pl-txt pl-ang" x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}">${t}</text>`;
  });
  if (p.superficie) {
    s += `<line class="pl-superficie" x1="${c - r}" y1="${c}" x2="${c + r}" y2="${c}"/>`;
    s += `<text class="pl-txt" x="${c - r + 22}" y="${c + 16}">superficie</text>`;
  }
  return s;
}

// Curvas medidas del patrón en curso, o null si no hay
const medidasDe = cont => cont._medidas?.patrones?.[cont.dataset.patron] || null;

// Lectura en un ángulo: medida de la frecuencia elegida si existe, si no la teórica
function lecturaEn(cont, g) {
  const p = PATRONES[cont.dataset.patron];
  const med = medidasDe(cont);
  if (med) {
    const curva = med[+cont.dataset.frec];
    const db = nivelMedido(curva.puntos, g);
    if (db === null) return { db: null, texto: "fuera del diagrama medido" };
    // Por debajo del último anillo del diagrama original el valor real no se conoce
    if (curva.suelo !== undefined && db <= curva.suelo + 0.3) return { db, texto: `${fmtDb(curva.suelo)} o menos` };
    return { db, texto: fmtDb(db) };
  }
  const db = nivelDb(p, g);
  return { db, texto: fmtDb(db) + (invertida(p, g) ? ", polaridad invertida" : "") };
}

function pintarPolar(cont) {
  const p = PATRONES[cont.dataset.patron];
  const med = medidasDe(cont);
  const sel = +cont.dataset.frec;
  const curvas = med
    ? med.map((m, i) => i === sel ? "" : `<path class="pl-ref" d="${curvaMedida(m.puntos)}"/>`).join("")
      + `<path class="pl-teorico" d="${curvaTeorica(p)}"/>`
      + `<path class="pl-curva" d="${curvaMedida(med[sel].puntos)}"/>`
    : `<path class="pl-curva" d="${curvaTeorica(p)}"/>`;
  cont.querySelector("svg").innerHTML = `${rejilla(p)}${curvas}
    <circle class="pl-marca" r="5" cx="${POLAR.c}" cy="${POLAR.c}" visibility="hidden"/>`;

  const freqs = cont.querySelector(".pl-frecuencias");
  freqs.innerHTML = med
    ? med.map((m, i) => `<button type="button" data-frec="${i}" aria-pressed="${i === sel}">${nombreCurva(m)}</button>`).join("")
    : "";
  freqs.hidden = !med;
  freqs.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    cont.dataset.frec = b.dataset.frec;
    pintarPolar(cont);
  }));

  const a90 = lecturaEn(cont, 90), a180 = lecturaEn(cont, 180);
  cont.querySelector(".pl-resumen").textContent =
    `${med ? nombreCurva(med[sel]) + ". " : ""}A 90°: ${a90.texto}. A 180°: ${a180.texto}.`;
  const lectura = cont.querySelector(".pl-lectura");
  lectura.textContent = AYUDA;
  lectura.classList.add("ayuda");
  cont.querySelector(".pl-nota").textContent = med
    ? `Medido por el fabricante (${cont._medidas.fuente}). En salmón, la frecuencia elegida; en gris, las demás; en discontinua, el patrón teórico.`
    : cont._nota;
}

// Frecuencia inicial: la más cercana a 1 kHz
function frecInicial(med) {
  let mejor = 0;
  med.forEach((m, i) => {
    if (Math.abs(Math.log(m.frecuencia / 1000)) < Math.abs(Math.log(med[mejor].frecuencia / 1000))) mejor = i;
  });
  return mejor;
}

function montarPolar(cont, claves, medidas) {
  const svg = cont.querySelector("svg");
  const lectura = cont.querySelector(".pl-lectura");
  const marca = () => svg.querySelector(".pl-marca");
  cont._medidas = medidas || null;
  cont._nota = cont.querySelector(".pl-nota").textContent;

  const elegir = clave => {
    cont.dataset.patron = clave;
    const med = medidasDe(cont);
    cont.dataset.frec = med ? frecInicial(med) : 0;
    pintarPolar(cont);
  };

  svg.addEventListener("pointermove", e => {
    const b = svg.getBoundingClientRect();
    const esc = 300 / b.width;
    const x = (e.clientX - b.left) * esc - POLAR.c, y = (e.clientY - b.top) * esc - POLAR.c;
    let g = Math.round(Math.atan2(x, -y) * 180 / Math.PI);
    if (g < 0) g += 360;
    const { db, texto } = lecturaEn(cont, g);
    if (db === null) marca().setAttribute("visibility", "hidden");
    else {
      const [mx, my] = punto(g, radioDb(db));
      marca().setAttribute("visibility", "visible");
      marca().setAttribute("cx", mx.toFixed(1));
      marca().setAttribute("cy", my.toFixed(1));
    }
    lectura.textContent = `${g}°: ${texto}`;
    lectura.classList.remove("ayuda");
  });
  svg.addEventListener("pointerleave", () => {
    marca().setAttribute("visibility", "hidden");
    lectura.textContent = AYUDA;
    lectura.classList.add("ayuda");
  });

  const botones = cont.querySelectorAll(".pl-patrones:not(.pl-frecuencias) button");
  botones.forEach(b => b.addEventListener("click", () => {
    botones.forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    elegir(b.dataset.patron);
  }));
  elegir(claves[0]);
}

// HTML del bloque; montarPolar() lo activa una vez insertado
function htmlPolar(claves, nota) {
  const botones = claves.length > 1
    ? `<div class="pl-patrones" role="group" aria-label="Patrón">${claves.map((k, i) =>
        `<button type="button" data-patron="${k}" aria-pressed="${i === 0}">${PATRONES[k].nombre}</button>`).join("")}</div>`
    : `<p class="pl-nombre">${PATRONES[claves[0]].nombre}</p>`;
  return `
    <figure class="polar">
      <figcaption><h3>Patrón polar</h3></figcaption>
      ${botones}
      <div class="pl-patrones pl-frecuencias" role="group" aria-label="Frecuencia" hidden></div>
      <svg viewBox="0 0 300 300" role="img" aria-label="Diagrama polar"></svg>
      <p class="pl-resumen"></p>
      <p class="pl-lectura" aria-live="polite"></p>
      <p class="pl-nota">${nota || "Patrón teórico. El real se estrecha o se abre según la frecuencia: las curvas medidas están en la documentación del fabricante."}</p>
      <p class="aviso">Gráfico orientativo. Para valores exactos, consulta la documentación del fabricante.</p>
    </figure>`;
}
