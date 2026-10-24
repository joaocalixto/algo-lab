import {describe,expect,it} from 'vitest';
import {shortestPaths,reconstructPath,positiveGraph,negativeGraph,negativeCycleGraph} from './shortestPaths';

describe('weighted shortest paths',()=>{
  it('Dijkstra obtains correct distances and reconstructs a path',()=>{
    const trace=shortestPaths(positiveGraph,'A','dijkstra');
    const last=trace.steps.at(-1)!;
    expect(last.event).toBe('complete');
    expect(last.distance).toMatchObject({A:0,B:3,C:2,D:8,E:10});
    expect(reconstructPath(trace,'E')).toEqual(['A','C','B','D','E']);
  });
  it('Bellman-Ford supports a negative edge without negative cycles',()=>{
    const trace=shortestPaths(negativeGraph,'A','bellmanFord');
    expect(trace.steps.at(-1)!.distance).toMatchObject({A:0,B:4,C:2,D:5,E:7});
    expect(reconstructPath(trace,'E')).toEqual(['A','B','C','D','E']);
  });
  it('rejects Dijkstra on a graph containing negative edges',()=>{
    expect(()=>shortestPaths(negativeGraph,'A','dijkstra')).toThrow(/non-negative/);
  });
  it('detects a reachable negative cycle',()=>{
    const trace=shortestPaths(negativeCycleGraph,'A','bellmanFord');
    expect(trace.steps.at(-1)!.event).toBe('negativeCycle');
    expect(reconstructPath(trace,'D')).toBeNull();
  });
  it('ignores an unreachable negative cycle',()=>{
    const graph={vertices:['A','B','C','D'],edges:[{from:'A',to:'B',weight:2},{from:'C',to:'D',weight:-2},{from:'D',to:'C',weight:1}]};
    const trace=shortestPaths(graph,'A','bellmanFord');
    expect(trace.steps.at(-1)!.event).toBe('complete');
    expect(trace.steps.at(-1)!.distance.C).toBe(Infinity);
    expect(reconstructPath(trace,'C')).toBeNull();
  });
  it('handles zero-cost edges and isolated starts',()=>{
    const graph={vertices:['A','B','C'],edges:[{from:'A',to:'B',weight:0}]};
    for(const algorithm of ['dijkstra','bellmanFord'] as const) {
      const trace=shortestPaths(graph,'A',algorithm);
      expect(trace.steps.at(-1)!.distance.B).toBe(0);
      expect(reconstructPath(trace,'B')).toEqual(['A','B']);
      expect(reconstructPath(trace,'C')).toBeNull();
    }
  });
});
