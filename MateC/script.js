(function(){
  const SVG_NS = "http://www.w3.org/2000/svg";
  const COMPONENT_COLORS = ["#4fd1a5","#e8a94c","#7aa2f7","#e0645a","#c792ea","#5fd3d3","#f28fb0","#a3d977"];

  let n = 2;             
  let edges = new Set();        
  let adj = {};                
  let positions = [];           
  let selectedManual = null;

  function edgeKey(a,b){ return a<b ? a+"-"+b : b+"-"+a; }
  function computePositions(count, cx, cy, r){
    const pos = [];
    for(let i=0;i<count;i++){
      const angle = -Math.PI/2 + (2*Math.PI*i/count);
      pos.push({ x: cx + r*Math.cos(angle), y: cy + r*Math.sin(angle) });
    }
    return pos;
  }
  function buildAdjFromEdges(){
    adj = {};
    for(let i=1;i<=n;i++) adj[i] = new Set();
    edges.forEach(key=>{
      const [a,b] = key.split("-").map(Number);
      adj[a].add(b); adj[b].add(a);
    });
  }
  function el(tag, attrs){
    const e = document.createElementNS(SVG_NS, tag);
    for(const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function clearSvg(svg){ while(svg.firstChild) svg.removeChild(svg.firstChild); }

  function drawGraph(svg, opts){
    opts = opts || {};
    clearSvg(svg);
    const pos = positions;
    edges.forEach(key=>{
      const [a,b] = key.split("-").map(Number);
      const p1 = pos[a-1], p2 = pos[b-1];
      const isActive = opts.activeEdge && ((opts.activeEdge[0]===a && opts.activeEdge[1]===b)||(opts.activeEdge[0]===b && opts.activeEdge[1]===a));
      svg.appendChild(el("line", {
        x1:p1.x, y1:p1.y, x2:p2.x, y2:p2.y,
        class: "edge-line" + (isActive ? " active" : "")
      }));
    });
    for(let i=1;i<=n;i++){
      const p = pos[i-1];
      let cls = "node-circle";
      let fill = null;
      if(opts.nodeColors && opts.nodeColors[i]) fill = opts.nodeColors[i];
      if(opts.visiting === i) cls += " visiting";
      else if(opts.queued && opts.queued.has(i)) cls += " queued";
      if(opts.selected === i) cls += " selected";
      const c = el("circle", { cx:p.x, cy:p.y, r:20, class:cls });
      if(fill) c.setAttribute("fill", fill);
      if(opts.onClick) c.addEventListener("click", ()=>opts.onClick(i));
      svg.appendChild(c);
      const label = el("text", { x:p.x, y:p.y, class:"node-label" });
      label.textContent = i;
      svg.appendChild(label);
    }
  }

  const inputN = document.getElementById("input-n");
  document.getElementById("btn-n-continue").addEventListener("click", ()=>{
    const val = parseInt(inputN.value, 10);
    const err = document.getElementById("error-n");
    if(isNaN(val) || val < 4 || val > 12){
      err.textContent = "Ingresa un número entero entre 4 y 12.";
      err.classList.remove("hidden");
      return;
    }
    err.classList.add("hidden");
    n = val;
    edges = new Set();
    positions = computePositions(n, 240, 190, 140);
    document.getElementById("card-mode").classList.remove("hidden");
    document.getElementById("card-mode").scrollIntoView({behavior:"smooth", block:"nearest"});
  });
  const manualPanel = document.getElementById("manual-panel");
  const randomPanel = document.getElementById("random-panel");
  const choiceManual = document.getElementById("choice-manual");
  const choiceRandom = document.getElementById("choice-random");
  const btnBuild = document.getElementById("btn-build");

  function renderManualEdgeList(){
    const list = document.getElementById("manual-edge-list");
    list.innerHTML = "";
    if(edges.size === 0){
      const span = document.createElement("span");
      span.className = "hint"; span.style.margin = "0";
      span.textContent = "Sin conexiones todavía.";
      list.appendChild(span);
    }
    [...edges].sort().forEach(key=>{
      const [a,b] = key.split("-");
      const chip = document.createElement("div");
      chip.className = "edge-chip";
      chip.innerHTML = `${a} — ${b}`;
      const rm = document.createElement("button");
      rm.textContent = "×";
      rm.addEventListener("click", ()=>{ edges.delete(key); drawManual(); renderManualEdgeList(); });
      chip.appendChild(rm);
      list.appendChild(chip);
    });
    btnBuild.disabled = edges.size === 0;
  }

  function drawManual(){
    const svg = document.getElementById("svg-manual");
    drawGraph(svg, {
      selected: selectedManual,
      onClick: (i)=>{
        if(selectedManual === null){ selectedManual = i; }
        else if(selectedManual === i){ selectedManual = null; }
        else {
          edges.add(edgeKey(selectedManual, i));
          selectedManual = null;
          renderManualEdgeList();
        }
        drawManual();
      }
    });
  }

  choiceManual.addEventListener("click", ()=>{
    mode = "manual";
    choiceManual.classList.add("active"); choiceRandom.classList.remove("active");
    manualPanel.classList.remove("hidden"); randomPanel.classList.add("hidden");
    edges = new Set(); selectedManual = null;
    drawManual(); renderManualEdgeList();
  });

  function generateRandom(){
    edges = new Set();

    const order = [...Array(n).keys()].map(x=>x+1);
    for(let i=1;i<order.length;i++){
  
      if(Math.random() < 0.6777777){// aqui podrias cambiar la probabilidad
        const j = order[Math.floor(Math.random()*i)];
        edges.add(edgeKey(order[i], j));
      }
    }
    const extra = Math.floor(n/2);
    for(let k=0;k<extra;k++){
      const a = 1 + Math.floor(Math.random()*n);
      const b = 1 + Math.floor(Math.random()*n);
      if(a!==b) edges.add(edgeKey(a,b));
    }
    const svg = document.getElementById("svg-random");
    drawGraph(svg, {});
    btnBuild.disabled = false;
  }

  choiceRandom.addEventListener("click", ()=>{
    mode = "random";
    choiceRandom.classList.add("active"); choiceManual.classList.remove("active");
    randomPanel.classList.remove("hidden"); manualPanel.classList.add("hidden");
    generateRandom();
  });

  document.getElementById("btn-regenerate").addEventListener("click", generateRandom);

  btnBuild.addEventListener("click", ()=>{
    buildAdjFromEdges();
    renderMatrix();
    document.getElementById("card-matrix").classList.remove("hidden");
    document.getElementById("card-matrix").scrollIntoView({behavior:"smooth", block:"nearest"});
  });


  function renderMatrix(){
    const container = document.getElementById("matrix-container");
    container.innerHTML = "";
    const table = document.createElement("table");
    const headRow = document.createElement("tr");
    headRow.appendChild(document.createElement("th"));
    for(let j=1;j<=n;j++){
      const th = document.createElement("th"); th.textContent = j; headRow.appendChild(th);
    }
    table.appendChild(headRow);
    for(let i=1;i<=n;i++){
      const tr = document.createElement("tr");
      const th = document.createElement("th"); th.textContent = i; tr.appendChild(th);
      for(let j=1;j<=n;j++){
        const td = document.createElement("td");
        const connected = adj[i].has(j) ? 1 : 0;
        td.textContent = connected;
        if(connected) td.classList.add("one");
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    container.appendChild(table);
  }

  let bfsSteps = [];   
  let stepIndex = -1;
  let componentsResult = [];

  function precomputeBFS(){
    bfsSteps = [];
    componentsResult = [];
    const visited = new Set();
    for(let start=1; start<=n; start++){
      if(visited.has(start)) continue;
      const comp = [];
      const queue = [start];
      visited.add(start);
      bfsSteps.push({type:"new-component", start});
      while(queue.length){
        const node = queue.shift();
        comp.push(node);
        bfsSteps.push({type:"visit", node, queueSnapshot:[...queue]});
        [...adj[node]].sort((a,b)=>a-b).forEach(nb=>{
          if(!visited.has(nb)){
            visited.add(nb);
            queue.push(nb);
            bfsSteps.push({type:"discover", from:node, to:nb, queueSnapshot:[...queue]});
          }
        });
      }
      bfsSteps.push({type:"component-done", comp:[...comp]});
      componentsResult.push(comp);
    }
    bfsSteps.push({type:"finished"});
  }

  function renderStep(){
    const svg = document.getElementById("svg-algo");
    const log = document.getElementById("step-log");
    const btnNext = document.getElementById("btn-next-step");

    if(stepIndex < 0){
      drawGraph(svg, {});
      log.innerHTML = "Presiona «Siguiente paso» para comenzar.";
      return;
    }
    const step = bfsSteps[stepIndex];
    let queued = new Set();
    let visiting = null;
    let nodeColors = {};
    let doneCount = 0;
    for(let i=0;i<=stepIndex;i++){
      if(bfsSteps[i].type === "component-done"){
        const color = COMPONENT_COLORS[doneCount % COMPONENT_COLORS.length];
        bfsSteps[i].comp.forEach(node=>{ nodeColors[node] = color; });
        doneCount++;
      }
    }
    if(step.type === "new-component"){
      log.innerHTML = `Iniciando exploración desde el nodo <b>${step.start}</b> (nueva componente).`;
      visiting = step.start;
    } else if(step.type === "visit"){
      log.innerHTML = `Visitando nodo <b>${step.node}</b>. Cola actual: [${step.queueSnapshot.join(", ") || "vacía"}]`;
      visiting = step.node;
      step.queueSnapshot.forEach(q=>queued.add(q));
    } else if(step.type === "discover"){
      log.innerHTML = `Desde <b>${step.from}</b> se descubre el nodo <b>${step.to}</b> → se agrega a la cola.`;
      visiting = step.from;
      step.queueSnapshot.forEach(q=>queued.add(q));
    } else if(step.type === "component-done"){
      log.innerHTML = `Componente completada: {${step.comp.join(", ")}}`;
    } else if(step.type === "finished"){
      log.innerHTML = `Recorrido finalizado. Mostrando resultado final...`;
      btnNext.disabled = true;
      setTimeout(showResults, 500);
    }
    drawGraph(svg, { visiting, queued, nodeColors });
  }

  document.getElementById("btn-start-algo").addEventListener("click", ()=>{
    precomputeBFS();
    stepIndex = -1;
    document.getElementById("btn-next-step").disabled = false;
    renderStep();
    document.getElementById("card-algo").classList.remove("hidden");
    document.getElementById("card-algo").scrollIntoView({behavior:"smooth", block:"nearest"});
  });

  document.getElementById("btn-next-step").addEventListener("click", ()=>{
    if(stepIndex < bfsSteps.length - 1){
      stepIndex++;
      renderStep();
    }
  });

  document.getElementById("btn-skip").addEventListener("click", ()=>{
    stepIndex = bfsSteps.length - 1;
    showResults();
  });


  function showResults(){
    document.getElementById("card-results").classList.remove("hidden");
    document.getElementById("card-results").scrollIntoView({behavior:"smooth", block:"nearest"});
    document.getElementById("result-count").textContent = componentsResult.length;

    const list = document.getElementById("results-list");
    list.innerHTML = "";
    const nodeColors = {};
    componentsResult.forEach((comp, idx)=>{
      const color = COMPONENT_COLORS[idx % COMPONENT_COLORS.length];
      comp.forEach(node=>{ nodeColors[node] = color; });
      const row = document.createElement("div");
      row.className = "result-row";
      row.innerHTML = `<span class="swatch" style="background:${color}"></span> Componente ${idx+1}: { ${comp.sort((a,b)=>a-b).join(", ")} }`;
      list.appendChild(row);
    });

    const svg = document.getElementById("svg-result");
    drawGraph(svg, { nodeColors });
  }


  document.getElementById("btn-restart").addEventListener("click", ()=>{
    ["card-mode","card-matrix","card-algo","card-results"].forEach(id=>{
      document.getElementById(id).classList.add("hidden");
    });
    document.getElementById("card-mode").querySelectorAll(".choice-btn").forEach(b=>b.classList.remove("active"));
    manualPanel.classList.add("hidden");
    randomPanel.classList.add("hidden");
    btnBuild.disabled = true;
    edges = new Set();
    mode = null;
    window.scrollTo({top:0, behavior:"smooth"});
  });

})();
