import type { Graph } from './graph';
import type { TraversalAlgorithm, TraversalOperation, TraversalSnapshot, VertexState, TraversalTrace } from './traversal';
export function traverse(graph: Graph, start: string, algorithm: TraversalAlgorithm): TraversalTrace {
 const ids = graph.vertices.map(v => v.id);
 if (!ids.includes(start)) throw new Error('Invalid start vertex');
 const neighbors = (id: string) => ids.filter(n => graph.edges.some(e => (e.a === id && e.b === n) || (e.b === id && e.a === n)));
 const states: Record<string, VertexState> = Object.fromEntries(ids.map(id => [id, 'undiscovered']));
 const frontier: string[] = [], order: string[] = [], finished: string[] = [];
 const parent: Record<string, string | null> = { [start]: null }, distance: Record<string, number> = { [start]: 0 };
 const snapshots: TraversalSnapshot[] = [];
 const emit = (operation: TraversalOperation, current: string | null) => snapshots.push({ index: snapshots.length, operation, current, activeEdge: 'edge' in operation ? operation.edge : null, vertexStates: {...states}, frontier: [...frontier], discoveryOrder: [...order], finishOrder: [...finished], parent: {...parent}, ...(algorithm === 'bfs' ? {distance: {...distance}} : {}), explanation: {key: 'explorer:steps.' + operation.type, values: {vertex: 'vertex' in operation ? operation.vertex : ''}} });
 states[start] = algorithm === 'bfs' ? 'discovered' : 'processing'; frontier.push(start); order.push(start); emit({type: 'start', vertex: start}, start);
 if (algorithm === 'bfs') {
 while (frontier.length) {
 const v = frontier.shift()!; states[v] = 'processing'; emit({type:'dequeue',vertex:v},v);
 for (const n of neighbors(v)) {
 const edge = {a:v,b:n};
 if (states[n] === 'undiscovered') { states[n]='discovered'; parent[n]=v; distance[n]=distance[v]!+1; frontier.push(n); order.push(n); emit({type:'discover',vertex:n,parent:v,edge},v); }
 else emit({type:'skipNeighbor',vertex:n,from:v,edge,neighborState:states[n] as Exclude<VertexState,'undiscovered'>},v);
 }
 states[v]='processed'; finished.push(v); emit({type:'finish',vertex:v},v);
 }
 } else {
 const offsets: Record<string, number> = {[start]:0};
 while(frontier.length) {
 const v=frontier[frontier.length-1]!, ns=neighbors(v), n=ns[offsets[v]!];
 if(n === undefined) {frontier.pop();states[v]='processed';finished.push(v);emit({type:'finish',vertex:v},v);continue;}
 offsets[v] = offsets[v]!+1; const edge={a:v,b:n};
 if(states[n] === 'undiscovered') {parent[n]=v;states[n]='processing';offsets[n]=0;frontier.push(n);order.push(n);emit({type:'discover',vertex:n,parent:v,edge},n);}
 else emit({type:'skipNeighbor',vertex:n,from:v,edge,neighborState:states[n] as Exclude<VertexState,'undiscovered'>},v);
 }
 }
 emit({type:'complete'},null);
 return {algorithm,graph,startVertex:start,snapshots};
}
export const example: Graph = {vertices:'ABCDEFG'.split('').map(id=>({id,label:id})), edges:[['A','B'],['A','C'],['B','D'],['B','E'],['C','F'],['E','F']].map(([a,b])=>({a:a!,b:b!}))};
