(function () {
  const NS_SVG = "http://www.w3.org/2000/svg";
  const COLORES_COMPONENTES = [
    "#4fd1a5", "#e8a94c", "#7aa2f7", "#e0645a",
    "#c792ea", "#5fd3d3", "#f28fb0", "#a3d977"
  ];

  let cantNodos = 6;
  let modoSeleccionado = null;
  let aristas = new Set();
  let listaAdyacencia = {};
  let posicionesNodos = [];
  let nodoSeleccionadoManual = null;

  function obtenerClaveArista(origen, destino) {
    return origen < destino ? origen + "-" + destino : destino + "-" + origen;
  }

  function calcularPosiciones(total, centroX, centroY, radio) {
    const pos = [];
    for (let i = 0; i < total; i++) {
      const angulo = -Math.PI / 2 + (2 * Math.PI * i / total);
      pos.push({
        x: centroX + radio * Math.cos(angulo),
        y: centroY + radio * Math.sin(angulo)
      });
    }
    return pos;
  }

  function construirAdyacencia() {
    listaAdyacencia = {};
    for (let i = 1; i <= cantNodos; i++) listaAdyacencia[i] = new Set();
    aristas.forEach(clave => {
      const [u, v] = clave.split("-").map(Number);
      listaAdyacencia[u].add(v);
      listaAdyacencia[v].add(u);
    });
  }

  function crearElementoSVG(etiqueta, atributos) {
    const elem = document.createElementNS(NS_SVG, etiqueta);
    for (const clave in atributos) elem.setAttribute(clave, atributos[clave]);
    return elem;
  }

  function vaciarSVG(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function dibujarGrafo(svg, opciones = {}) {
    vaciarSVG(svg);
    const pos = posicionesNodos;

    aristas.forEach(clave => {
      const [u, v] = clave.split("-").map(Number);
      const p1 = pos[u - 1], p2 = pos[v - 1];
      const esActiva = opciones.aristaActiva && (
        (opciones.aristaActiva[0] === u && opciones.aristaActiva[1] === v) ||
        (opciones.aristaActiva[0] === v && opciones.aristaActiva[1] === u)
      );
      svg.appendChild(crearElementoSVG("line", {
        x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
        class: "edge-line" + (esActiva ? " active" : "")
      }));
    });

    for (let i = 1; i <= cantNodos; i++) {
      const p = pos[i - 1];
      let claseNodo = "node-circle";
      let relleno = null;

      if (opciones.coloresNodo && opciones.coloresNodo[i]) relleno = opciones.coloresNodo[i];
      if (opciones.visitando === i) claseNodo += " visiting";
      else if (opciones.enCola && opciones.enCola.has(i)) claseNodo += " queued";
      if (opciones.seleccionado === i) claseNodo += " selected";

      const circulo = crearElementoSVG("circle", { cx: p.x, cy: p.y, r: 20, class: claseNodo });
      if (relleno) circulo.setAttribute("fill", relleno);
      if (opciones.alHacerClic) circulo.addEventListener("click", () => opciones.alHacerClic(i));
      svg.appendChild(circulo);

      const texto = crearElementoSVG("text", { x: p.x, y: p.y, class: "node-label" });
      texto.textContent = i;
      svg.appendChild(texto);
    }
  }

  const inputNodos = document.getElementById("input-n");
  document.getElementById("btn-n-continue").addEventListener("click", () => {
    const val = parseInt(inputNodos.value, 10);
    const errorElem = document.getElementById("error-n");
    if (isNaN(val) || val < 6 || val > 12) {
      errorElem.textContent = "Ingresa un número entero entre 6 y 12.";
      errorElem.classList.remove("hidden");
      return;
    }
    errorElem.classList.add("hidden");
    cantNodos = val;
    aristas = new Set();
    posicionesNodos = calcularPosiciones(cantNodos, 240, 190, 140);
    document.getElementById("card-mode").classList.remove("hidden");
    document.getElementById("card-mode").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  const panelManual = document.getElementById("manual-panel");
  const panelAleatorio = document.getElementById("random-panel");
  const opcionManual = document.getElementById("choice-manual");
  const opcionAleatoria = document.getElementById("choice-random");
  const botonConstruir = document.getElementById("btn-build");

  function actualizarListaAristasManual() {
    const lista = document.getElementById("manual-edge-list");
    lista.innerHTML = "";
    if (aristas.size === 0) {
      const mensaje = document.createElement("span");
      mensaje.className = "hint";
      mensaje.style.margin = "0";
      mensaje.textContent = "Sin conexiones todavía.";
      lista.appendChild(mensaje);
    }
    [...aristas].sort().forEach(clave => {
      const [u, v] = clave.split("-");
      const chip = document.createElement("div");
      chip.className = "edge-chip";
      chip.innerHTML = `${u} — ${v}`;
      const btnBorrar = document.createElement("button");
      btnBorrar.textContent = "×";
      btnBorrar.addEventListener("click", () => {
        aristas.delete(clave);
        dibujarModoManual();
        actualizarListaAristasManual();
      });
      chip.appendChild(btnBorrar);
      lista.appendChild(chip);
    });
    botonConstruir.disabled = aristas.size === 0;
  }

  function dibujarModoManual() {
    const svg = document.getElementById("svg-manual");
    dibujarGrafo(svg, {
      seleccionado: nodoSeleccionadoManual,
      alHacerClic: (i) => {
        if (nodoSeleccionadoManual === null) {
          nodoSeleccionadoManual = i;
        } else if (nodoSeleccionadoManual === i) {
          nodoSeleccionadoManual = null;
        } else {
          aristas.add(obtenerClaveArista(nodoSeleccionadoManual, i));
          nodoSeleccionadoManual = null;
          actualizarListaAristasManual();
        }
        dibujarModoManual();
      }
    });
  }

  opcionManual.addEventListener("click", () => {
    modoSeleccionado = "manual";
    opcionManual.classList.add("active");
    opcionAleatoria.classList.remove("active");
    panelManual.classList.remove("hidden");
    panelAleatorio.classList.add("hidden");
    aristas = new Set();
    nodoSeleccionadoManual = null;
    dibujarModoManual();
    actualizarListaAristasManual();
  });

  function generarGrafoAleatorio() {
    aristas = new Set();
    const orden = [...Array(cantNodos).keys()].map(x => x + 1);

    for (let i = 1; i < orden.length; i++) {
      if (Math.random() < 0.6777777) {
        const j = orden[Math.floor(Math.random() * i)];
        aristas.add(obtenerClaveArista(orden[i], j));
      }
    }
    const extras = Math.floor(cantNodos / 2);
    for (let k = 0; k < extras; k++) {
      const a = 1 + Math.floor(Math.random() * cantNodos);
      const b = 1 + Math.floor(Math.random() * cantNodos);
      if (a !== b) aristas.add(obtenerClaveArista(a, b));
    }
    const svg = document.getElementById("svg-random");
    dibujarGrafo(svg, {});
    botonConstruir.disabled = false;
  }

  opcionAleatoria.addEventListener("click", () => {
    modoSeleccionado = "random";
    opcionAleatoria.classList.add("active");
    opcionManual.classList.remove("active");
    panelAleatorio.classList.remove("hidden");
    panelManual.classList.add("hidden");
    generarGrafoAleatorio();
  });

  document.getElementById("btn-regenerate").addEventListener("click", generarGrafoAleatorio);

  botonConstruir.addEventListener("click", () => {
    construirAdyacencia();
    mostrarMatrizAdyacencia();
    document.getElementById("card-matrix").classList.remove("hidden");
    document.getElementById("card-matrix").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  function mostrarMatrizAdyacencia() {
    const contenedor = document.getElementById("matrix-container");
    contenedor.innerHTML = "";
    const tabla = document.createElement("table");
    const filaEncabezado = document.createElement("tr");
    filaEncabezado.appendChild(document.createElement("th"));

    for (let j = 1; j <= cantNodos; j++) {
      const th = document.createElement("th");
      th.textContent = j;
      filaEncabezado.appendChild(th);
    }
    tabla.appendChild(filaEncabezado);

    for (let i = 1; i <= cantNodos; i++) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.textContent = i;
      tr.appendChild(th);

      for (let j = 1; j <= cantNodos; j++) {
        const td = document.createElement("td");
        const conectado = listaAdyacencia[i].has(j) ? 1 : 0;
        td.textContent = conectado;
        if (conectado) td.classList.add("one");
        tr.appendChild(td);
      }
      tabla.appendChild(tr);
    }
    contenedor.appendChild(tabla);
  }

  let pasosBFS = [];
  let indicePasoActual = -1;
  let componentesResultantes = [];

  function precalcularBFS() {
    pasosBFS = [];
    componentesResultantes = [];
    const visitados = new Set();

    for (let inicio = 1; inicio <= cantNodos; inicio++) {
      if (visitados.has(inicio)) continue;

      const compActual = [];
      const cola = [inicio];
      visitados.add(inicio);
      pasosBFS.push({ type: "new-component", start: inicio });

      while (cola.length) {
        const nodo = cola.shift();
        compActual.push(nodo);
        pasosBFS.push({ type: "visit", node: nodo, queueSnapshot: [...cola] });

        [...listaAdyacencia[nodo]].sort((a, b) => a - b).forEach(vecino => {
          if (!visitados.has(vecino)) {
            visitados.add(vecino);
            cola.push(vecino);
            pasosBFS.push({ type: "discover", from: nodo, to: vecino, queueSnapshot: [...cola] });
          }
        });
      }
      pasosBFS.push({ type: "component-done", comp: [...compActual] });
      componentesResultantes.push(compActual);
    }
    pasosBFS.push({ type: "finished" });
  }

  function renderizarPasoBFS() {
    const svg = document.getElementById("svg-algo");
    const registro = document.getElementById("step-log");
    const btnSiguiente = document.getElementById("btn-next-step");

    if (indicePasoActual < 0) {
      dibujarGrafo(svg, {});
      registro.innerHTML = "Presiona «Siguiente paso» para comenzar.";
      return;
    }

    const paso = pasosBFS[indicePasoActual];
    let enCola = new Set();
    let visitando = null;
    let coloresNodo = {};
    let componentesCompletas = 0;

    for (let i = 0; i <= indicePasoActual; i++) {
      if (pasosBFS[i].type === "component-done") {
        const color = COLORES_COMPONENTES[componentesCompletas % COLORES_COMPONENTES.length];
        pasosBFS[i].comp.forEach(n => { coloresNodo[n] = color; });
        componentesCompletas++;
      }
    }

    if (paso.type === "new-component") {
      registro.innerHTML = `Iniciando exploración desde el nodo <b>${paso.start}</b> (nueva componente).`;
      visitando = paso.start;
    } else if (paso.type === "visit") {
      registro.innerHTML = `Visitando nodo <b>${paso.node}</b>. Cola actual: [${paso.queueSnapshot.join(", ") || "vacía"}]`;
      visitando = paso.node;
      paso.queueSnapshot.forEach(q => enCola.add(q));
    } else if (paso.type === "discover") {
      registro.innerHTML = `Desde <b>${paso.from}</b> se descubre el nodo <b>${paso.to}</b> → se agrega a la cola.`;
      visitando = paso.from;
      paso.queueSnapshot.forEach(q => enCola.add(q));
    } else if (paso.type === "component-done") {
      registro.innerHTML = `Componente completada: {${paso.comp.join(", ")}}`;
    } else if (paso.type === "finished") {
      registro.innerHTML = `Recorrido finalizado. Mostrando resultado final...`;
      btnSiguiente.disabled = true;
      setTimeout(mostrarResultados, 500);
    }

    dibujarGrafo(svg, { visitando, enCola, coloresNodo });
  }

  document.getElementById("btn-start-algo").addEventListener("click", () => {
    precalcularBFS();
    indicePasoActual = -1;
    document.getElementById("btn-next-step").disabled = false;
    renderizarPasoBFS();
    document.getElementById("card-algo").classList.remove("hidden");
    document.getElementById("card-algo").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  document.getElementById("btn-next-step").addEventListener("click", () => {
    if (indicePasoActual < pasosBFS.length - 1) {
      indicePasoActual++;
      renderizarPasoBFS();
    }
  });

  document.getElementById("btn-skip").addEventListener("click", () => {
    indicePasoActual = pasosBFS.length - 1;
    mostrarResultados();
  });

  function mostrarResultados() {
    document.getElementById("card-results").classList.remove("hidden");
    document.getElementById("card-results").scrollIntoView({ behavior: "smooth", block: "nearest" });
    document.getElementById("result-count").textContent = componentesResultantes.length;

    const lista = document.getElementById("results-list");
    lista.innerHTML = "";
    const coloresNodo = {};

    componentesResultantes.forEach((comp, idx) => {
      const color = COLORES_COMPONENTES[idx % COLORES_COMPONENTES.length];
      comp.forEach(n => { coloresNodo[n] = color; });
      const fila = document.createElement("div");
      fila.className = "result-row";
      fila.innerHTML = `<span class="swatch" style="background:${color}"></span> Componente ${idx + 1}: { ${comp.sort((a, b) => a - b).join(", ")} }`;
      lista.appendChild(fila);
    });

    const svg = document.getElementById("svg-result");
    dibujarGrafo(svg, { coloresNodo });
  }

  document.getElementById("btn-restart").addEventListener("click", () => {
    ["card-mode", "card-matrix", "card-algo", "card-results"].forEach(id => {
      document.getElementById(id).classList.add("hidden");
    });
    document.getElementById("card-mode").querySelectorAll(".choice-btn").forEach(b => b.classList.remove("active"));
    panelManual.classList.add("hidden");
    panelAleatorio.classList.add("hidden");
    botonConstruir.disabled = true;
    aristas = new Set();
    modoSeleccionado = null;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();