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

## Rules

- "Visited" is ambiguous; the lab uses **discovered / processing / processed** and defines "visited" only as a general term.
- "Shortest path" always means *fewest edges in an unweighted graph*; never use it for weighted graphs.
- Keep the abbreviations **BFS** and **DFS** in every language.
- pt-PT and pt-BR are separate locales: pt-PT uses *pesquisa*, *não orientado*, *utilizar*, *num*; pt-BR uses *busca*, *não direcionado*, *usar*, *em um*.
- de uses informal *du* for the learner and *Lehrkraft* (gender-neutral) for educator.

## Open review questions

- de: "Rand" for *frontier* (alternatives: "Front", keep "Frontier"); "Pfad" vs. "Weg"; "Zyklus" vs. "Kreis".
- pt-PT: "ponderado" vs. "pesado" for *weighted*.
- es: "componente conexa" vs. "componente conexo" (both in use).
