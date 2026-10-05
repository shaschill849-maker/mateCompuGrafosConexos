# Componentes Conexas con Algoritmo BFS 
Aplicacion web interactiva desarrollada para determinar e ilustrar las **componentes conexas** de un grafo no dirigido de 6 a 12 vertices utilizando el algoritmo de **Búsqueda en Anchura (BFS)**.

Este proyecto fue desarrollado para el curso de **Matematica Computacional**.


## Caracteristicas

- **Validacion del rango de vertices:** Permite seleccionar entre 6 y 12 nodos.
- **Generacion flexible del grafo:**
  - **Manual:** Seleccion e interconexión interactiva de nodos con clics.
  - **Aleatoria:** Generacion automatica de conexiones basadas en modelos probabilisticos.
- **Matriz de Adyacencia:** Representacion estructurada y visual del grafo.
- **Ejecucion paso a paso (BFS):** Simulacion animada que muestra en tiempo real el estado de la cola, los nodos visitados y el descubrimiento de vecinos.
- **Visualizacion vectorial (SVG):** Renderizacion dinamica del grafo coloreando cada nodo según la componente conexa a la que pertenece.

---

## Tecnologias Utilizadas

La aplicacion está desarrollada completamente con tecnologias nativas web (Vanilla) sin dependencias ni librerias externas:

- **HTML5:** Estructura interactiva basada en tarjetas de pasos (`index.html`).
- **CSS3:** Estilos de tematica oscura, maquetacin responsiva y animacin de estados (`style.css`).
- **JavaScript (ES6+) & SVG Nativo:** Logica del algoritmo BFS, cconstruccion de la matriz y renderizado grafico vectorial (`script.js`).

---

## Estructura del Proyecto

```text
├── index.html  
├── style.css    
└── script.js    