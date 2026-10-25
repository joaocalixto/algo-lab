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

## Rules

- "Visited" is ambiguous; the lab uses **discovered / processing / processed** and defines "visited" only as a general term.
- "Shortest path" always means *fewest edges in an unweighted graph*; never use it for weighted graphs.
- Keep the abbreviations **BFS** and **DFS** in every language.
- pt-PT and pt-BR are separate locales: pt-PT uses *pesquisa*, *não orientado*, *utilizar*, *num*; pt-BR uses *busca*, *não direcionado*, *usar*, *em um*.
- de uses informal *du* for the learner and *Lehrkraft* (gender-neutral) for educator.
- Keep the algorithm names **Floyd–Warshall**, **Prim** and **Kruskal** untranslated, as with Dijkstra and Bellman–Ford, and keep *union-find* next to the translated name of the structure.
- A program loop is *laço* (pt), *bucle* (es), *Schleife* (de), so that *ciclo* / *Zyklus* stays the graph cycle.
- An intermediate stop on a path is *paragem intermédia* in pt-PT and *parada intermediária* in pt-BR.

## Open review questions

- de: "Rand" for *frontier* (alternatives: "Front", keep "Frontier"); "Pfad" vs. "Weg"; "Zyklus" vs. "Kreis".
- pt-PT: "ponderado" vs. "pesado" for *weighted*.
- es: "componente conexa" vs. "componente conexo" (both in use).
- es: "árbol de expansión mínima" vs. "árbol recubridor mínimo" (both in use in textbooks).
- de: "Minimaler Spannbaum" vs. "minimaler aufspannender Baum"; "Spannwald" is rarer than the tree term.
