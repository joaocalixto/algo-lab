/** Shortest paths on finite directed weighted graphs. Pure deterministic snapshots. */
export interface WeightedEdge { readonly from: string; readonly to: string; readonly weight: number }
export interface WeightedGraph { readonly vertices: readonly string[]; readonly edges: readonly WeightedEdge[] }
export type PathAlgorithm = 'dijkstra' | 'bellmanFord';
export type PathEvent = 'start' | 'select' | 'relax' | 'noChange' | 'pass' | 'complete' | 'negativeCycle';
export interface PathStep {
  readonly event: PathEvent;
  readonly vertex?: string;
  readonly edge?: WeightedEdge;
  readonly pass?: number;
  readonly distance: Readonly<Record<string, number>>;
  readonly previous: Readonly<Record<string, string | null>>;
  readonly settled: readonly string[];
  readonly negativeCycle: boolean;
}
export interface PathTrace { readonly steps: readonly PathStep[]; readonly algorithm: PathAlgorithm; readonly graph: WeightedGraph; readonly start: string }

export const positiveGraph: WeightedGraph = {
  vertices: ['A','B','C','D','E'],
  edges: [
    {from:'A',to:'B',weight:4},{from:'A',to:'C',weight:2},
    {from:'C',to:'B',weight:1},{from:'B',to:'D',weight:5},
    {from:'C',to:'D',weight:8},{from:'C',to:'E',weight:10},
    {from:'D',to:'E',weight:2}
  ]
};
export const negativeGraph: WeightedGraph = {
  vertices: ['A','B','C','D','E'],
  edges: [
    {from:'A',to:'B',weight:4},{from:'A',to:'C',weight:5},
    {from:'B',to:'C',weight:-2},{from:'B',to:'D',weight:6},
    {from:'C',to:'D',weight:3},{from:'D',to:'E',weight:2}
  ]
};
export const negativeCycleGraph: WeightedGraph = {
  vertices: ['A','B','C','D','E'],
  edges: [
    {from:'A',to:'B',weight:1},{from:'B',to:'C',weight:1},
    {from:'C',to:'B',weight:-3},{from:'C',to:'D',weight:2}
  ]
};

export function shortestPaths(graph: WeightedGraph, start: string, algorithm: PathAlgorithm): PathTrace {
  const vertices = graph.vertices;
  if (new Set(vertices).size !== vertices.length || !vertices.includes(start)) throw new Error('Invalid vertices or start vertex');
  for (const e of graph.edges) {
    if (!vertices.includes(e.from) || !vertices.includes(e.to) || !Number.isFinite(e.weight))
      throw new Error('Invalid weighted edge');
    if (algorithm === 'dijkstra' && e.weight < 0) throw new Error('Dijkstra requires non-negative edge weights');
  }
  const distance: Record<string, number> = Object.fromEntries(vertices.map(v=>[v, Infinity]));
  const previous: Record<string, string|null> = Object.fromEntries(vertices.map(v=>[v,null]));
  const settled = new Set<string>();
  const steps: PathStep[] = [];
  distance[start]=0;
  const emit=(event:PathEvent, other:Partial<Pick<PathStep,'edge'|'vertex'|'pass'>>={}) =>
    steps.push({event,...other,distance:{...distance},previous:{...previous},settled:[...settled],negativeCycle:event==='negativeCycle'});

  emit('start',{vertex:start});
  if (algorithm==='dijkstra') {
    while (true) {
      let current: string|undefined;
      for (const v of vertices) if (!settled.has(v) && Number.isFinite(distance[v]!) && (current===undefined || distance[v]! < distance[current]!)) current=v;
      if (current===undefined) break;
      settled.add(current);
      emit('select',{vertex:current});
      for (const edge of graph.edges) {
        if (edge.from!==current || settled.has(edge.to)) continue;
        const candidate=distance[current]!+edge.weight;
        if(candidate < distance[edge.to]!) {distance[edge.to]=candidate;previous[edge.to]=current;emit('relax',{edge});}
        else emit('noChange',{edge});
      }
    }
  } else {
    for(let pass=1;pass<vertices.length;pass++) {
      let changed=false;emit('pass',{pass});
      for(const edge of graph.edges) {
        const base=distance[edge.from]!;
        if(!Number.isFinite(base)) continue;
        const candidate=base+edge.weight;
        if(candidate<distance[edge.to]!) {distance[edge.to]=candidate;previous[edge.to]=edge.from;changed=true;emit('relax',{edge,pass});}
        else emit('noChange',{edge,pass});
      }
      if(!changed) break;
    }
    for(const edge of graph.edges) {
      if(Number.isFinite(distance[edge.from]!) && distance[edge.from]!+edge.weight<distance[edge.to]!) {
        emit('negativeCycle',{edge});return {steps,algorithm,graph,start};
      }
    }
  }
  emit('complete');
  return {steps,algorithm,graph,start};
}

/** A path is defined only when no reachable negative cycle was detected. */
export function reconstructPath(trace:PathTrace, target:string): readonly string[] | null {
  const last=trace.steps[trace.steps.length-1];
  if(!last || last.negativeCycle || trace.steps.some(s=>s.negativeCycle) ||
     !Number.isFinite(last.distance[target]!)) return null;
  const reversed:string[]=[];const visited=new Set<string>();
  let node:string|null=target;
  while(node!==null) {
    if(visited.has(node)) return null;
    visited.add(node);reversed.push(node);
    node=last.previous[node]??null;
  }
  reversed.reverse();
  return reversed[0]===trace.start?reversed:null;
}
