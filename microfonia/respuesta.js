// Gráfico de respuesta en frecuencia, dibujado en SVG a partir de las curvas
// digitalizadas de la documentación de cada fabricante (respuesta-datos.js).
// Eje X logarítmico de 20 Hz a 20 kHz; eje Y en dB normalizado a 0 dB en 1 kHz.

const RF = {
  w: 640, h: 300,
  m: { izq: 40, der: 14, arr: 26, aba: 44 },
  fmin: 20, fmax: 20000,
  marcasF: [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000],
  octavas: [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000],
};
const RF_AYUDA = "Toca o pasa el puntero por el gráfico para leer el nivel en cada frecuencia.";

const rfAncho = () => RF.w - RF.m.izq - RF.m.der;
const rfAlto = () => RF.h - RF.m.arr - RF.m.aba;
const rfX = f => RF.m.izq + rfAncho() * Math.log10(f / RF.fmin) / Math.log10(RF.fmax / RF.fmin);
const rfF = x => RF.fmin * Math.pow(RF.fmax / RF.fmin, (x - RF.m.izq) / rfAncho());

const fmtHz = f => f >= 1000
  ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1).replace(".", ",").replace(",0", "")} kHz`
  : `${Math.round(f)} Hz`;
const fmtNivel = db => `${db > 0.05 ? "+" : ""}${db.toFixed(1).replace(".", ",").replace("-", "−")} dB`;

// Nivel de una curva a una frecuencia, interpolando en escala logarítmica
function rfNivel(puntos, f) {
  if (f < puntos[0][0] || f > puntos[puntos.length - 1][0]) return null;
  for (let i = 1; i < puntos.length; i++) {
    const [f1, d1] = puntos[i - 1], [f2, d2] = puntos[i];
    if (f <= f2) {
      const t = Math.log(f / f1) / Math.log(f2 / f1);
      return d1 + t * (d2 - d1);
    }
  }
  return null;
}

// Rango vertical: múltiplos de 5 dB que abarquen todas las curvas, con un mínimo de −20…+10
function rfRango(curvas) {
  const todos = curvas.flatMap(c => c.puntos.map(p => p[1]));
  return [Math.min(-20, Math.floor(Math.min(...todos) / 5) * 5), Math.max(10, Math.ceil(Math.max(...todos) / 5) * 5)];
}

function rfDibujar(cont) {
  const datos = cont._datos, activa = +cont.dataset.activa;
  const [ymin, ymax] = rfRango(datos.curvas);
  const y = db => RF.m.arr + rfAlto() * (ymax - db) / (ymax - ymin);
  cont._y = y;

  let s = "";
  for (let db = ymin; db <= ymax; db += 5) {
    s += `<line class="rf-rej${db === 0 ? " rf-cero" : ""}" x1="${RF.m.izq}" x2="${RF.w - RF.m.der}" y1="${y(db)}" y2="${y(db)}"/>`;
    if (db % 10 === 0) s += `<text class="rf-txt" x="${RF.m.izq - 6}" y="${y(db) + 3.5}" text-anchor="end">${db > 0 ? "+" + db : String(db).replace("-", "−")}</text>`;
  }
  RF.marcasF.forEach(f => {
    s += `<line class="rf-rej" x1="${rfX(f)}" x2="${rfX(f)}" y1="${RF.m.arr}" y2="${RF.h - RF.m.aba}"/>`;
    s += `<text class="rf-txt" x="${rfX(f)}" y="${RF.h - RF.m.aba + 16}" text-anchor="middle">${f >= 1000 ? f / 1000 + "k" : f}</text>`;
  });
  s += `<text class="rf-txt" x="${RF.m.izq + rfAncho() / 2}" y="${RF.h - 4}" text-anchor="middle">Frecuencia (Hz)</text>`;
  s += `<text class="rf-txt" x="${RF.m.izq - 6}" y="${RF.m.arr - 12}" text-anchor="end">dB</text>`;

  // Primero las curvas de referencia, después la activa encima
  const ruta = c => "M" + c.puntos.map(([f, db]) => `${rfX(f).toFixed(1)},${y(db).toFixed(1)}`).join("L");
  const grupo = datos.curvas[activa].grupo;
  datos.curvas.forEach((c, i) => { if (i !== activa && c.grupo === grupo) s += `<path class="rf-ref" d="${ruta(c)}"/>`; });
  s += `<path class="rf-curva" d="${ruta(datos.curvas[activa])}"/>`;
  s += `<line class="rf-cursor" y1="${RF.m.arr}" y2="${RF.h - RF.m.aba}" visibility="hidden"/>`;
  s += `<circle class="pl-marca" r="4.5" visibility="hidden"/>`;
  cont.querySelector("svg").innerHTML = s;

  // Tabla por bandas de octava de la curva activa
  const filas = RF.octavas.map(f => {
    const db = rfNivel(datos.curvas[activa].puntos, f);
    return `<tr><th scope="row">${fmtHz(f)}</th><td>${db === null ? "—" : fmtNivel(db)}</td></tr>`;
  }).join("");
  cont.querySelector(".rf-tabla tbody").innerHTML = filas;
  cont.querySelector(".rf-tabla caption").textContent = datos.curvas[activa].nombre;
}

function montarRespuesta(cont, datos) {
  cont._datos = datos;
  cont.dataset.activa = 0;
  const svg = cont.querySelector("svg");
  const lectura = cont.querySelector(".rf-lectura");
  const ayuda = () => { lectura.textContent = RF_AYUDA; lectura.classList.add("ayuda"); };

  svg.addEventListener("pointermove", e => {
    const b = svg.getBoundingClientRect();
    const x = (e.clientX - b.left) * RF.w / b.width;
    const xc = Math.min(Math.max(x, RF.m.izq), RF.w - RF.m.der);
    const f = rfF(xc);
    const c = datos.curvas[+cont.dataset.activa];
    const db = rfNivel(c.puntos, f);
    const cursor = svg.querySelector(".rf-cursor"), marca = svg.querySelector(".pl-marca");
    cursor.setAttribute("x1", xc); cursor.setAttribute("x2", xc); cursor.setAttribute("visibility", "visible");
    if (db === null) {
      marca.setAttribute("visibility", "hidden");
      lectura.textContent = `${fmtHz(f)}: fuera del rango medido`;
    } else {
      marca.setAttribute("cx", xc); marca.setAttribute("cy", cont._y(db)); marca.setAttribute("visibility", "visible");
      lectura.textContent = `${fmtHz(f)}: ${fmtNivel(db)}`;
    }
    lectura.classList.remove("ayuda");
  });
  svg.addEventListener("pointerleave", () => {
    svg.querySelector(".rf-cursor").setAttribute("visibility", "hidden");
    svg.querySelector(".pl-marca").setAttribute("visibility", "hidden");
    ayuda();
  });

  const botones = cont.querySelectorAll(".pl-patrones button");
  botones.forEach(b => b.addEventListener("click", () => {
    botones.forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    cont.dataset.activa = b.dataset.curva;
    rfDibujar(cont);
  }));

  ayuda();
  rfDibujar(cont);
}

function htmlRespuesta(datos) {
  const varias = datos.curvas.length > 1;
  const selector = varias
    ? `<div class="pl-patrones" role="group" aria-label="Curva">${datos.curvas.map((c, i) =>
        `<button type="button" data-curva="${i}" aria-pressed="${i === 0}">${c.nombre}</button>`).join("")}</div>`
    : "";
  return `
    <section class="bloque respuesta">
      <h3>Respuesta en frecuencia</h3>
      ${selector}
      <svg viewBox="0 0 ${RF.w} ${RF.h}" role="img" aria-label="Gráfico de respuesta en frecuencia"></svg>
      <p class="rf-lectura pl-lectura" aria-live="polite"></p>
      <details class="rf-detalle">
        <summary>Ver valores por bandas de octava</summary>
        <table class="datos rf-tabla"><caption></caption><tbody></tbody></table>
      </details>
      <p class="pl-nota">Curva típica de la documentación del fabricante${varias ? "; en gris, el resto de curvas para comparar" : ""}. Nivel relativo a 1 kHz. Fuente: ${datos.fuente}.</p>
    </section>`;
}
