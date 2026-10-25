# Terminology glossary

The canonical glossary lives in `src/i18n/locales/<locale>/glossary.json` (term + definition per concept) and is checked automatically for completeness. **All UI and explanation strings must use these terms.** This file records the choices translators and reviewers must respect.

| Concept | en | pt-PT | pt-BR | es | de |
|---|---|---|---|---|---|
| graph | Graph | Grafo | Grafo | Grafo | Graph |
| vertex | Vertex | Vértice | Vértice | Vértice | Knoten |
| edge | Edge | Aresta | Aresta | Arista | Kante |
| neighbor | Neighbor | Vizinho | Vizinho | Vecino | Nachbar |
| traversal | Traversal | Percurso | Percurso | Recorrido | Traversierung |
| BFS | Breadth-First Search | Pesquisa em Largura | Busca em Largura | Búsqueda en anchura | Breitensuche |
| DFS | Depth-First Search | Pesquisa em Profundidade | Busca em Profundidade | Búsqueda en profundidad | Tiefensuche |
| queue | Queue | Fila | Fila | Cola | Warteschlange |
| stack | Stack | Pilha | Pilha | Pila | Stapel |
| frontier | Frontier | Fronteira | Fronteira | Frontera | Rand |
| connected component | Connected component | Componente conexa | Componente conexa | Componente conexa | Zusammenhangskomponente |
| undiscovered | Undiscovered | Não descoberto | Não descoberto | No descubierto | Unentdeckt |
| discovered | Discovered | Descoberto | Descoberto | Descubierto | Entdeckt |
| processing | Processing | Em processamento | Em processamento | En proceso | In Bearbeitung |
| processed | Processed | Processado | Processado | Procesado | Abgeschlossen |
| shortest path | Shortest path | Caminho mais curto | Caminho mínimo | Camino más corto | Kürzester Pfad |
| weight | Weight | Peso | Peso | Peso | Gewicht |
| intermediate vertex | Intermediate vertex | Vértice intermédio | Vértice intermediário | Vértice intermedio | Zwischenknoten |
| minimum spanning tree | Minimum spanning tree | Árvore geradora mínima | Árvore geradora mínima | Árbol de expansión mínima | Minimaler Spannbaum |
| minimum spanning forest | Minimum spanning forest | Floresta geradora mínima | Floresta geradora mínima | Bosque de expansión mínima | Minimaler Spannwald |
| Floyd–Warshall | Floyd–Warshall | Floyd–Warshall | Floyd–Warshall | Floyd–Warshall | Floyd–Warshall |
| Prim | Prim | Prim | Prim | Prim | Prim |
| Kruskal | Kruskal | Kruskal | Kruskal | Kruskal | Kruskal |
| disjoint-set | Disjoint-set (union-find) | Conjuntos disjuntos (union-find) | Conjuntos disjuntos (union-find) | Conjuntos disjuntos (union-find) | Union-Find (disjunkte Mengen) |
| directed graph | Directed graph | Grafo orientado | Grafo direcionado | Grafo dirigido | Gerichteter Graph |
| undirected graph | Undirected graph | Grafo não orientado | Grafo não direcionado | Grafo no dirigido | Ungerichteter Graph |
| weighted graph | Weighted graph | Grafo ponderado | Grafo ponderado | Grafo ponderado | Gewichteter Graph |
| arc | Arc | Arco | Arco | Arco | Gerichtete Kante |
| spanning tree | Spanning tree | Árvore geradora | Árvore geradora | Árbol de expansión | Spannbaum |
| topological order | Topological order | Ordenação topológica | Ordenação topológica | Orden topológico | Topologische Sortierung |
| DAG | Directed acyclic graph (DAG) | Grafo orientado acíclico (DAG) | Grafo direcionado acíclico (DAG) | Grafo dirigido acíclico (DAG) | Gerichteter azyklischer Graph (DAG) |
| in-degree | In-degree | Grau de entrada | Grau de entrada | Grado de entrada | Eingangsgrad |
| relaxation | Relaxation | Relaxação | Relaxamento | Relajación | Relaxation |
| negative cycle | Negative cycle | Ciclo negativo | Ciclo negativo | Ciclo negativo | Negativer Zyklus |
| settled vertex | Settled vertex | Vértice fechado | Vértice fechado | Vértice cerrado | Abgeschlossener Knoten |
| Dijkstra | Dijkstra | Dijkstra | Dijkstra | Dijkstra | Dijkstra |
| Bellman–Ford | Bellman–Ford | Bellman–Ford | Bellman–Ford | Bellman–Ford | Bellman–Ford |
| Kahn | Kahn's algorithm | Algoritmo de Kahn | Algoritmo de Kahn | Algoritmo de Kahn | Kahns Algorithmus |

## Rules

- "Visited" is ambiguous; the lab uses **discovered / processing / processed** and defines "visited" only as a general term.
- "Shortest path" means *fewest edges* in an unweighted graph (what BFS finds) and *smallest total weight* in a weighted one (Dijkstra, Bellman–Ford, Floyd–Warshall). Always make clear which of the two a sentence is about, and never call a BFS distance a shortest path in a weighted graph.
- Keep the abbreviations **BFS** and **DFS** in every language.
- pt-PT and pt-BR are separate locales: pt-PT uses *pesquisa*, *não orientado*, *utilizar*, *num*; pt-BR uses *busca*, *não direcionado*, *usar*, *em um*.
- de uses informal *du* for the learner and *Lehrkraft* (gender-neutral) for educator.
- Keep the algorithm names **Dijkstra**, **Bellman–Ford**, **Floyd–Warshall**, **Prim** and **Kruskal** untranslated, and keep *union-find* next to the translated name of the structure. Kahn takes the local word for "algorithm" (*Algoritmo de Kahn*, *Kahns Algorithmus*).
- A program loop is *laço* (pt), *bucle* (es), *Schleife* (de), so that *ciclo* / *Zyklus* stays the graph cycle.
- An intermediate stop on a path is *paragem intermédia* in pt-PT and *parada intermediária* in pt-BR.

- A vertex is *settled* (Dijkstra) once its distance is final; that is not the same as *processed*, which is about neighbours having been examined. Keep the two words apart.
- pt-PT says *orientado* / *não orientado* for direction, pt-BR *direcionado* / *não direcionado*.

## Open review questions

- de: "Rand" for *frontier* (alternatives: "Front", keep "Frontier"); "Pfad" vs. "Weg"; "Zyklus" vs. "Kreis".
- pt-PT: "ponderado" vs. "pesado" for *weighted*.
- es: "componente conexa" vs. "componente conexo" (both in use).
- es: "árbol de expansión mínima" vs. "árbol recubridor mínimo" (both in use in textbooks).
- de: "Minimaler Spannbaum" vs. "minimaler aufspannender Baum"; "Spannwald" is rarer than the tree term.
- pt: *relaxação* (pt-PT) vs. *relaxamento* (pt-BR) for *relaxation*; both are in use, each in its own variant.
- de: "Relaxation" vs. "Kantenrelaxation"; "Gerichtete Kante" vs. "Pfeil" for *arc*.
