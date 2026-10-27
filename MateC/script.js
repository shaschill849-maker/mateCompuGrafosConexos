(function () {
  "use strict";

  // ---------- Constantes ----------
  const NS_SVG = "http://www.w3.org/2000/svg";
  const COLORES_COMPONENTES = [
    "#4fd1a5", "#e8a94c", "#7aa2f7", "#e0645a",
    "#c792ea", "#5fd3d3", "#f28fb0", "#a3d977"
  ];
  const MIN_NODOS = 4;
  const MAX_NODOS = 12;

  // Geometría del dibujo (los nodos van sobre una circunferencia)
  const CENTRO_X = 240, CENTRO_Y = 190, RADIO_ANILLO = 140, RADIO_NODO = 20;
  const SEPARACION_FLECHAS = 6;     // separa u→v de v→u cuando existen ambas
  const DISTANCIA_ETIQUETA = 38;    // distancia de la etiqueta "índice|lowlink" al nodo

  const TARJETAS_POSTERIORES = ["tarjeta-modo", "tarjeta-matriz", "tarjeta-algoritmo", "tarjeta-resultados"];
  const TEXTO_INICIAL = "Presiona «Siguiente paso» para comenzar.";

  // ---------- Estado ----------
  let cantNodos = MIN_NODOS;
  let aristas = new Set();          // aristas DIRIGIDAS como texto "origen-destino"
  let listaAdyacencia = {};         // listaAdyacencia[u] = Set de nodos a los que u APUNTA
  let posicionesNodos = [];
  let nodoManual = null;            // origen elegido en modo manual (a la espera del destino)
  let pasosTarjan = [];
  let indicePaso = -1;
  let componentes = [];

  // ---------- Utilidades ----------
  const $ = id => document.getElementById(id);
  const ordenar = elementos => [...elementos].sort((a, b) => a - b);
  const azar = k => Math.floor(Math.random() * k);
  const listaNodos = () => Array.from({ length: cantNodos }, (_, i) => i + 1);
  const colorDeComponente = i => COLORES_COMPONENTES[i % COLORES_COMPONENTES.length];

  // "1-3" es 1 → 3 y "3-1" es otra arista distinta
  const claveArista = (origen, destino) => `${origen}-${destino}`;
  const leerArista = clave => clave.split("-").map(Number);

  function mezclar(lista) {
    for (let i = lista.length - 1; i > 0; i--) {
      const j = azar(i + 1);
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
  }

  function crearElemento(etiqueta, clase, texto) {
    const elem = document.createElement(etiqueta);
    if (clase) elem.className = clase;
    if (texto !== undefined) elem.textContent = texto;
    return elem;
  }

  function crearElementoSVG(etiqueta, atributos = {}) {
    const elem = document.createElementNS(NS_SVG, etiqueta);
    Object.entries(atributos).forEach(([clave, valor]) => elem.setAttribute(clave, valor));
    return elem;
  }

  function crearTextoSVG(x, y, clase, texto) {
    const elem = crearElementoSVG("text", { x, y, class: clase });
    elem.textContent = texto;
    return elem;
  }

  const mostrar = (...ids) => ids.forEach(id => $(id).classList.remove("oculto"));
  const ocultar = (...ids) => ids.forEach(id => $(id).classList.add("oculto"));

  function mostrarTarjeta(id) {
    mostrar(id);
    $(id).scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Reemplaza el contenido de un contenedor; si no hay elementos muestra un texto de ayuda
  function llenarLista(contenedor, elementos, textoVacio) {
    contenedor.replaceChildren(...elementos);
    if (elementos.length === 0) contenedor.append(crearElemento("span", "ayuda sin-margen", textoVacio));
  }

  // ---------- Grafo ----------
  function calcularPosiciones() {
    return Array.from({ length: cantNodos }, (_, i) => {
      const angulo = -Math.PI / 2 + (2 * Math.PI * i) / cantNodos;
      return {
        x: CENTRO_X + RADIO_ANILLO * Math.cos(angulo),
        y: CENTRO_Y + RADIO_ANILLO * Math.sin(angulo)
      };
    });
  }

  function construirAdyacencia() {
    listaAdyacencia = {};
    listaNodos().forEach(i => { listaAdyacencia[i] = new Set(); });
    aristas.forEach(clave => {
      const [u, v] = leerArista(clave);
      listaAdyacencia[u].add(v);
    });
  }

  // ---------- Dibujo SVG ----------
  // Puntas de flecha (normal y resaltada). El id incluye el del svg para no repetirse en la página.
  function crearDefinicionesFlechas(svg) {
    const defs = crearElementoSVG("defs");
    ["normal", "activa"].forEach(tipo => {
      const marcador = crearElementoSVG("marker", {
        id: `flecha-${tipo}-${svg.id}`, viewBox: "0 0 10 10", refX: "10", refY: "5",
        markerUnits: "userSpaceOnUse", markerWidth: "12", markerHeight: "12", orient: "auto"
      });
      marcador.append(crearElementoSVG("path", { d: "M 0 0 L 10 5 L 0 10 z", class: `punta-${tipo}` }));
      defs.append(marcador);
    });
    return defs;
  }

  function dibujarAristas(svg, aristaActiva) {
    aristas.forEach(clave => {
      const [u, v] = leerArista(clave);
      const p1 = posicionesNodos[u - 1], p2 = posicionesNodos[v - 1];
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const largo = Math.hypot(dx, dy);
      const ux = dx / largo, uy = dy / largo;                                          // vector unitario u → v
      const desfase = aristas.has(claveArista(v, u)) ? SEPARACION_FLECHAS : 0;
      const activa = clave === aristaActiva;

      svg.append(crearElementoSVG("line", {
        x1: p1.x + ux * RADIO_NODO - uy * desfase,
        y1: p1.y + uy * RADIO_NODO + ux * desfase,
        x2: p2.x - ux * (RADIO_NODO + 2) - uy * desfase,
        y2: p2.y - uy * (RADIO_NODO + 2) + ux * desfase,
        class: "arista-linea" + (activa ? " activa" : ""),
        "marker-end": `url(#flecha-${activa ? "activa" : "normal"}-${svg.id})`
      }));
    });
  }

  function dibujarNodos(svg, opciones) {
    listaNodos().forEach(i => {
      const { x, y } = posicionesNodos[i - 1];
      const clases = ["nodo-circulo"];
      if (opciones.visitando === i) clases.push("visitando");
      else if (opciones.enPila?.has(i)) clases.push("en-pila");
      if (opciones.seleccionado === i) clases.push("seleccionado");

      const circulo = crearElementoSVG("circle", { cx: x, cy: y, r: RADIO_NODO, class: clases.join(" ") });
      // style.fill (y no el atributo fill) para que el color de la componente gane al CSS
      if (opciones.coloresNodo?.[i]) circulo.style.fill = opciones.coloresNodo[i];
      if (opciones.alHacerClic) circulo.addEventListener("click", () => opciones.alHacerClic(i));
      svg.append(circulo, crearTextoSVG(x, y, "nodo-etiqueta", i));

      // Etiqueta "índice|lowlink" fuera del anillo (solo durante Tarjan)
      if (opciones.info?.indice[i] !== undefined) {
        const dirX = (x - CENTRO_X) / RADIO_ANILLO, dirY = (y - CENTRO_Y) / RADIO_ANILLO;
        svg.append(crearTextoSVG(
          x + dirX * DISTANCIA_ETIQUETA, y + dirY * DISTANCIA_ETIQUETA,
          "nodo-info", `${opciones.info.indice[i]}|${opciones.info.low[i]}`
        ));
      }
    });
  }

  function dibujarGrafo(svg, opciones = {}) {
    svg.replaceChildren(crearDefinicionesFlechas(svg));
    dibujarAristas(svg, opciones.aristaActiva);
    dibujarNodos(svg, opciones);
  }

  // ---------- PASO 1: número de nodos ----------
  function reiniciarEtapas() {
    ocultar(...TARJETAS_POSTERIORES, "panel-manual", "panel-aleatorio");
    document.querySelectorAll(".opcion-btn").forEach(b => b.classList.remove("activa"));
    $("btn-construir").disabled = true;
    aristas = new Set();
    nodoManual = null;
  }

  $("btn-continuar-n").addEventListener("click", () => {
    const valor = Number($("entrada-n").value);
    const error = $("error-n");

    if (!Number.isInteger(valor) || valor < MIN_NODOS || valor > MAX_NODOS) {
      error.textContent = `Ingresa un número entero entre ${MIN_NODOS} y ${MAX_NODOS}.`;
      mostrar("error-n");
      return;
    }
    ocultar("error-n");
    cantNodos = valor;
    reiniciarEtapas();
    posicionesNodos = calcularPosiciones();
    mostrarTarjeta("tarjeta-modo");
  });

  // ---------- PASO 2: generación del grafo ----------
  function actualizarListaAristasManual() {
    const chips = [...aristas].map(leerArista)
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])      // orden numérico ("10-2" después de "2-3")
      .map(([u, v]) => {
        const chip = crearElemento("div", "chip", `${u} → ${v}`);
        const btnBorrar = crearElemento("button", "", "×");
        btnBorrar.addEventListener("click", () => {
          aristas.delete(claveArista(u, v));
          refrescarModoManual();
        });
        chip.append(btnBorrar);
        return chip;
      });

    llenarLista($("lista-aristas-manual"), chips, "Sin conexiones todavía.");
    $("btn-construir").disabled = aristas.size === 0;
  }

  // Manual: 1er clic = ORIGEN, 2do clic = DESTINO (se crea origen → destino)
  function alHacerClicNodoManual(nodo) {
    if (nodoManual === null) {
      nodoManual = nodo;
    } else {
      if (nodoManual !== nodo) aristas.add(claveArista(nodoManual, nodo));
      nodoManual = null;
    }
    refrescarModoManual();
  }

  function refrescarModoManual() {
    dibujarGrafo($("svg-manual"), { seleccionado: nodoManual, alHacerClic: alHacerClicNodoManual });
    actualizarListaAristasManual();
  }

  // Aleatorio con estructura: se reparten los nodos en grupos al azar; dentro de cada grupo
  // se arma un ciclo dirigido (el grupo es fuertemente conexo) y entre grupos solo se agregan
  // flechas "hacia adelante" (los grupos NO se fusionan). Con aristas totalmente al azar,
  // muchos grafos salían con todos los nodos separados, y eso no muestra nada interesante.
  function generarGrafoAleatorio() {
    aristas = new Set();
    const nodos = mezclar(listaNodos());
    const cantGrupos = 2 + azar(Math.max(1, Math.floor(cantNodos / 2) - 1));   // entre 2 y n/2

    const tamanos = Array(cantGrupos).fill(1);
    for (let resto = cantNodos - cantGrupos; resto > 0; resto--) tamanos[azar(cantGrupos)]++;
    const grupos = tamanos.map(t => nodos.splice(0, t));

    grupos.filter(g => g.length > 1).forEach(g => {
      g.forEach((nodo, i) => aristas.add(claveArista(nodo, g[(i + 1) % g.length])));    // ciclo
      if (g.length > 3 && Math.random() < 0.67) aristas.add(claveArista(g[0], g[2]));
    });

    for (let a = 0; a < cantGrupos; a++) {
      for (let b = a + 1; b < cantGrupos; b++) {
        if (Math.random() < 0.5) {
          aristas.add(claveArista(grupos[a][azar(grupos[a].length)], grupos[b][azar(grupos[b].length)]));
        }
      }
    }

    dibujarGrafo($("svg-aleatorio"));
    $("btn-construir").disabled = false;
  }

  function elegirModo(esManual) {
    $("opcion-manual").classList.toggle("activa", esManual);
    $("opcion-aleatoria").classList.toggle("activa", !esManual);
    $("panel-manual").classList.toggle("oculto", !esManual);
    $("panel-aleatorio").classList.toggle("oculto", esManual);
    aristas = new Set();
    nodoManual = null;
    if (esManual) refrescarModoManual();
    else generarGrafoAleatorio();
  }

  $("opcion-manual").addEventListener("click", () => elegirModo(true));
  $("opcion-aleatoria").addEventListener("click", () => elegirModo(false));
  $("btn-regenerar").addEventListener("click", generarGrafoAleatorio);

  $("btn-construir").addEventListener("click", () => {
    construirAdyacencia();
    mostrarMatrizAdyacencia();
    mostrarTarjeta("tarjeta-matriz");
  });

  // ---------- PASO 3: matriz de adyacencia (fila = origen, columna = destino) ----------
  function crearFila(celdaInicial, celdas) {
    const fila = crearElemento("tr");
    fila.append(celdaInicial, ...celdas);
    return fila;
  }

  function mostrarMatrizAdyacencia() {
    const tabla = crearElemento("table");
    tabla.append(crearFila(
      crearElemento("th"),
      listaNodos().map(j => crearElemento("th", "", j))
    ));
    listaNodos().forEach(i => {
      tabla.append(crearFila(
        crearElemento("th", "", i),
        listaNodos().map(j => {
          const conectado = listaAdyacencia[i].has(j);
          return crearElemento("td", conectado ? "uno" : "", conectado ? 1 : 0);
        })
      ));
    });
    $("contenedor-matriz").replaceChildren(tabla);
  }

  // ---------- PASO 4: algoritmo de Tarjan, grabado paso a paso ----------
  function precalcularTarjan() {
    pasosTarjan = [];
    componentes = [];

    const indice = {};          // indice[u] = orden en que se descubrió u (1, 2, 3...)
    const low = {};             // low[u]    = menor índice al que u puede volver a llegar
    const pila = [];            // nodos descubiertos que todavía no tienen componente
    const enPila = new Set();   // para preguntar "¿v está en la pila?" en O(1)
    let contador = 0;

    // Graba una "foto" del estado actual (copias, para que cada paso quede congelado)
    const registrar = (tipo, datos = {}) => pasosTarjan.push({
      tipo, ...datos,
      indice: { ...indice }, low: { ...low }, pila: [...pila],
      cerradas: componentes.length          // cuántas componentes ya están cerradas en este paso
    });

    function dfs(u) {
      indice[u] = low[u] = ++contador;
      pila.push(u);
      enPila.add(u);
      registrar("entrar", { nodo: u });

      ordenar(listaAdyacencia[u]).forEach(v => {
        if (indice[v] === undefined) {
          // v nunca se visitó: se baja a explorarlo y al volver se actualiza low[u]
          registrar("descender", { desde: u, hacia: v });
          dfs(v);
          low[u] = Math.min(low[u], low[v]);
          registrar("regresar", { desde: u, hijo: v });
        } else if (enPila.has(v)) {
          // v ya se visitó y sigue en la pila: u → v cierra un ciclo con lo que está en la pila
          low[u] = Math.min(low[u], indice[v]);
          registrar("retroceso", { desde: u, hacia: v });
        } else {
          // v ya se visitó y ya NO está en la pila: pertenece a una componente cerrada
          registrar("ignorar", { desde: u, hacia: v });
        }
      });

      // Si u no puede volver más atrás que sí mismo, u es la raíz de una componente:
      // se desapila hasta u y todo lo desapilado forma esa componente.
      if (low[u] === indice[u]) {
        const extraidos = [];
        let w;
        do {
          w = pila.pop();
          enPila.delete(w);
          extraidos.push(w);
        } while (w !== u);
        const comp = ordenar(extraidos);
        componentes.push(comp);
        registrar("componente-lista", { comp, raiz: u });
      }
    }

    listaNodos().forEach(inicio => {
      if (indice[inicio] === undefined) {
        registrar("nueva-raiz", { inicio });
        dfs(inicio);
      }
    });
    registrar("finalizado");
  }

  // Descripción de cada tipo de paso: texto del registro, nodo resaltado y arista activa
  const DESCRIBIR_PASO = {
    "nueva-raiz": p => ({
      texto: `Nuevo recorrido DFS desde el nodo <b>${p.inicio}</b> (todavía no visitado).`,
      visitando: p.inicio
    }),
    entrar: p => ({
      texto: `Entrando al nodo <b>${p.nodo}</b>: índice = ${p.indice[p.nodo]}, lowlink = ${p.low[p.nodo]}. Se apila.`,
      visitando: p.nodo
    }),
    descender: p => ({
      texto: `Arista <b>${p.desde} → ${p.hacia}</b>: el nodo ${p.hacia} no se ha visitado → se baja a explorarlo.`,
      visitando: p.desde,
      arista: claveArista(p.desde, p.hacia)
    }),
    retroceso: p => ({
      texto: `Arista <b>${p.desde} → ${p.hacia}</b>: ${p.hacia} ya está en la pila (hay un ciclo) → low[${p.desde}] = min(low[${p.desde}], índice[${p.hacia}]) = <b>${p.low[p.desde]}</b>.`,
      visitando: p.desde,
      arista: claveArista(p.desde, p.hacia)
    }),
    ignorar: p => ({
      texto: `Arista <b>${p.desde} → ${p.hacia}</b>: ${p.hacia} ya fue visitado y ya no está en la pila (es de otra componente ya cerrada) → se ignora.`,
      visitando: p.desde,
      arista: claveArista(p.desde, p.hacia)
    }),
    regresar: p => ({
      texto: `Se regresa de ${p.hijo} a <b>${p.desde}</b>: low[${p.desde}] = min(low[${p.desde}], low[${p.hijo}]) = <b>${p.low[p.desde]}</b>.`,
      visitando: p.desde,
      arista: claveArista(p.desde, p.hijo)
    }),
    "componente-lista": p => ({
      texto: `low[${p.raiz}] = índice[${p.raiz}] → <b>${p.raiz}</b> es raíz de componente. Se desapila hasta ${p.raiz}: {${p.comp.join(", ")}}`,
      visitando: p.raiz
    }),
    finalizado: () => ({ texto: "Recorrido finalizado. Mostrando resultado final..." })
  };

  // Asigna a cada nodo el color de su componente
  function colorearComponentes(lista) {
    const colores = {};
    lista.forEach((comp, i) => comp.forEach(nodo => { colores[nodo] = colorDeComponente(i); }));
    return colores;
  }

  function renderizarPaso() {
    const svg = $("svg-algoritmo");
    const paso = pasosTarjan[indicePaso];

    if (!paso) {
      dibujarGrafo(svg);
      $("registro-pasos").textContent = TEXTO_INICIAL;
      llenarLista($("vista-pila"), [], "vacía");
      return;
    }

    const { texto, visitando = null, arista = null } = DESCRIBIR_PASO[paso.tipo](paso);
    $("registro-pasos").innerHTML = texto;

    llenarLista(
      $("vista-pila"),
      paso.pila.map((nodo, i) => crearElemento("div", "chip" + (i === paso.pila.length - 1 ? " tope" : ""), nodo)),
      "vacía"
    );

    dibujarGrafo(svg, {
      visitando,
      aristaActiva: arista,
      coloresNodo: colorearComponentes(componentes.slice(0, paso.cerradas)),
      enPila: new Set(paso.pila),
      info: { indice: paso.indice, low: paso.low }
    });

    if (paso.tipo === "finalizado") setTimeout(mostrarResultados, 500);
  }

  $("btn-iniciar").addEventListener("click", () => {
    precalcularTarjan();
    indicePaso = -1;
    $("btn-siguiente").disabled = false;
    renderizarPaso();
    mostrarTarjeta("tarjeta-algoritmo");
  });

  $("btn-siguiente").addEventListener("click", () => {
    if (indicePaso < pasosTarjan.length - 1) {
      indicePaso++;
      renderizarPaso();
    }
  });

  $("btn-saltar").addEventListener("click", () => {
    indicePaso = pasosTarjan.length - 1;
    mostrarResultados();
  });

  // ---------- PASO 5: resultado ----------
  function mostrarResultados() {
    $("btn-siguiente").disabled = true;
    $("cantidad-resultado").textContent = componentes.length;

    $("lista-resultados").replaceChildren(...componentes.map((comp, i) => {
      const muestra = crearElemento("span", "muestra-color");
      muestra.style.background = colorDeComponente(i);
      const fila = crearElemento("div", "fila-resultado");
      fila.append(muestra, `Componente ${i + 1}: { ${comp.join(", ")} }`);
      return fila;
    }));

    dibujarGrafo($("svg-resultado"), { coloresNodo: colorearComponentes(componentes) });
    mostrarTarjeta("tarjeta-resultados");
  }

  $("btn-reiniciar").addEventListener("click", () => {
    reiniciarEtapas();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();