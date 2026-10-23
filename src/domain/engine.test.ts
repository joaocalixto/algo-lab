import {describe,it,expect} from 'vitest';
import {example,traverse} from './engine';
describe('traversals',()=>{
 it('BFS finds shortest distances and excludes isolated vertices',()=>{const s=traverse(example,'A','bfs').snapshots.at(-1)!;expect(s.discoveryOrder).toEqual(['A','B','C','D','E','F']);expect(s.distance).toEqual({A:0,B:1,C:1,D:2,E:2,F:2});expect(s.vertexStates.G).toBe('undiscovered');});
 it('DFS matches recursive order through a cycle',()=>{const s=traverse(example,'A','dfs').snapshots.at(-1)!;expect(s.discoveryOrder).toEqual(['A','B','D','E','F','C']);expect(s.finishOrder).toEqual(['D','C','F','E','B','A']);expect(s.frontier).toEqual([]);});
 it('supports an isolated start and independent snapshots',()=>{for(const a of ['bfs','dfs'] as const){const t=traverse(example,'G',a);expect(t.snapshots.at(-1)!.discoveryOrder).toEqual(['G']);expect(t.snapshots[0]!.frontier).toEqual(['G']);}});
});
