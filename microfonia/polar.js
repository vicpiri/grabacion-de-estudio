// Diagrama polar teórico de un micrófono, dibujado en SVG.
// Los patrones de primer orden siguen r(θ) = |A + (1 − A)·cos θ|; A fija el patrón.
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

// Nivel en dB a un ángulo (grados) para un patrón
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
const conPolaridad = (p, g) => fmtDb(nivelDb(p, g)) + (invertida(p, g) ? ", polaridad invertida" : "");

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

function curva(p) {
  const desde = p.superficie ? -90 : -180, hasta = p.superficie ? 90 : 180;
  const pts = [];
  for (let g = desde; g <= hasta; g += 1) pts.push(punto(g, radioDb(nivelDb(p, g))));
  return "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z";
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
  // Etiquetas de los anillos a lo largo del eje de 0°, desplazadas a la derecha
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

// Pinta el diagrama en un contenedor y devuelve el texto de resumen
function pintarPolar(cont, clave) {
  const p = PATRONES[clave];
  cont.querySelector("svg").innerHTML = `
    ${rejilla(p)}
    <path class="pl-curva" d="${curva(p)}"/>
    <circle class="pl-marca" r="5" cx="${POLAR.c}" cy="${POLAR.c}" visibility="hidden"/>`;
  cont.querySelector(".pl-resumen").textContent =
    `A 90°: ${conPolaridad(p, 90)}. A 180°: ${conPolaridad(p, 180)}.`;
  cont.querySelector(".pl-lectura").textContent = AYUDA;
  cont.querySelector(".pl-lectura").classList.add("ayuda");
  cont.dataset.patron = clave;
}

function montarPolar(cont, claves) {
  const svg = cont.querySelector("svg");
  const lectura = cont.querySelector(".pl-lectura");
  const marca = () => svg.querySelector(".pl-marca");

  svg.addEventListener("pointermove", e => {
    const b = svg.getBoundingClientRect();
    const esc = 300 / b.width;
    const x = (e.clientX - b.left) * esc - POLAR.c, y = (e.clientY - b.top) * esc - POLAR.c;
    let g = Math.round(Math.atan2(x, -y) * 180 / Math.PI);
    if (g < 0) g += 360;
    const p = PATRONES[cont.dataset.patron];
    const db = nivelDb(p, g);
    const [mx, my] = punto(g, radioDb(db));
    marca().setAttribute("visibility", "visible");
    marca().setAttribute("cx", mx.toFixed(1));
    marca().setAttribute("cy", my.toFixed(1));
    lectura.textContent = `${g}°: ${conPolaridad(p, g)}`;
    lectura.classList.remove("ayuda");
  });
  svg.addEventListener("pointerleave", () => {
    marca().setAttribute("visibility", "hidden");
    lectura.textContent = AYUDA;
    lectura.classList.add("ayuda");
  });

  const botones = cont.querySelectorAll(".pl-patrones button");
  botones.forEach(b => b.addEventListener("click", () => {
    botones.forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    pintarPolar(cont, b.dataset.patron);
  }));
  pintarPolar(cont, claves[0]);
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
      <svg viewBox="0 0 300 300" role="img" aria-label="Diagrama polar"></svg>
      <p class="pl-resumen"></p>
      <p class="pl-lectura" aria-live="polite"></p>
      <p class="pl-nota">${nota || "Patrón teórico. El real se estrecha o se abre según la frecuencia: las curvas medidas están en la documentación del fabricante."}</p>
    </figure>`;
}
