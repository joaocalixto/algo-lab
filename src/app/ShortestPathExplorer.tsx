import {useMemo,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {negativeCycleGraph,negativeGraph,positiveGraph,reconstructPath,shortestPaths} from '../domain/shortestPaths';
import type {PathAlgorithm,WeightedGraph} from '../domain/shortestPaths';

const positions:Record<string,[number,number]>={A:[80,85],B:[230,40],C:[230,180],D:[390,100],E:[520,185]};
const OPTIONS={positive:positiveGraph,negative:negativeGraph,cycle:negativeCycleGraph} as const;
type GraphChoice=keyof typeof OPTIONS;
export function ShortestPathExplorer({algorithm}:{algorithm:PathAlgorithm}) {
  const {t}=useTranslation('explorer');
  const [choice,setChoice]=useState<GraphChoice>('positive');
  const [start,setStart]=useState('A');
  const [index,setIndex]=useState(0);
  const selected:WeightedGraph=OPTIONS[algorithm==='dijkstra'?'positive':choice];
  const graphChoice=algorithm==='dijkstra'?'positive':choice;
  const trace=useMemo(()=>shortestPaths(selected,start,algorithm),[selected,start,algorithm]);
  const step=trace.steps[Math.min(index,trace.steps.length-1)]!;
  const [target,setTarget]=useState('E');
  const ended=index===trace.steps.length-1;
  const path=ended&&step.event==='complete'?reconstructPath(trace,target):null;
  const setGraph=(value:GraphChoice)=>{setChoice(value);setIndex(0);setStart('A');setTarget('E');};
  const fmt=(v:number|undefined)=>v===undefined||!Number.isFinite(v)?'∞':String(v);
  return <section className="lab">
    <div className="controls">
      {algorithm==='bellmanFord'&&<label>{t('paths.graph')} <select value={graphChoice} onChange={e=>setGraph(e.target.value as GraphChoice)}>
        <option value="positive">{t('paths.positive')}</option><option value="negative">{t('paths.negative')}</option>
        <option value="cycle">{t('paths.cycle')}</option>
      </select></label>}
      <label>{t('lab.start')} <select value={start} onChange={e=>{setStart(e.target.value);setIndex(0);}}>
        {selected.vertices.map(v=><option key={v} value={v}>{v}</option>)}
      </select></label>
      <label>{t('paths.target')} <select value={target} onChange={e=>setTarget(e.target.value)}>{selected.vertices.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
      <button onClick={()=>setIndex(0)}>{t('lab.reset')}</button>
      <button disabled={index===0} onClick={()=>setIndex(i=>i-1)}>{t('lab.back')}</button>
      <button className="primary-button" disabled={ended} onClick={()=>setIndex(i=>i+1)}>{t('lab.next')}</button>
      <span>{index+1} / {trace.steps.length}</span>
    </div>
    <p className="hint">{t(algorithm==='dijkstra'?'paths.dijkstraRule':'paths.bellmanRule')}</p>
    <div className="lab-grid">
      <svg viewBox="0 0 610 290" role="img" aria-label={t('title')}>
        <title>{t('title')}</title>
        <defs><marker id="weighted-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#64748b"/></marker></defs>
        {selected.edges.map((e,i)=>{const [x1,y1]=positions[e.from]!,[x2,y2]=positions[e.to]!;const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,active=step.edge===e;return <g key={i}>
          <line x1={x1+ux*28} y1={y1+uy*28} x2={x2-ux*30} y2={y2-uy*30} stroke={active?'#b45309':'#64748b'} strokeWidth={active?4:2.5} markerEnd="url(#weighted-arrow)"/>
          <rect x={(x1+x2)/2-15} y={(y1+y2)/2-26} width="30" height="23" rx="6" fill="#f1f5f9"/>
          <text x={(x1+x2)/2} y={(y1+y2)/2-10} textAnchor="middle" fill="#172033" fontSize="15" fontWeight="700">{e.weight}</text>
        </g>})}
        {selected.vertices.map(v=>{const [x,y]=positions[v]!;return <g key={v}>
          <circle cx={x} cy={y} r="26" stroke={step.vertex===v?'#b45309':'#334155'} strokeWidth={step.vertex===v?5:2} fill={step.settled.includes(v)?'#bbf7d0':Number.isFinite(step.distance[v]!)?'#bfdbfe':'#fff'}/>
          <text x={x} y={y+6} textAnchor="middle" fill="#172033" fontSize="19" fontWeight="700">{v}</text>
          <text x={x} y={y+45} textAnchor="middle" fill="currentColor" fontSize="13">d={fmt(step.distance[v])}</text>
        </g>})}
      </svg>
      <aside>
        <h2>{t('paths.distances')}</h2>
        <p>{selected.vertices.map(v=>v+': '+fmt(step.distance[v])).join(' · ')}</p>
        <h3>{t('paths.predecessors')}</h3>
        <p>{selected.vertices.map(v=>v+': '+(step.previous[v]??'—')).join(' · ')}</p>
        {algorithm==='dijkstra'&&<><h3>{t('paths.settled')}</h3><p>{step.settled.join(' → ')||'—'}</p></>}
        {ended&&step.event==='complete'&&<><h3>{t('paths.selectedPath')}</h3><p>{path?path.join(' → '):t('paths.unreachable')}</p></>}
        {step.negativeCycle&&<p role="alert">{t('paths.negativeCycle')}</p>}
      </aside>
    </div>
    <p className="step-explanation" aria-live="polite">{t('paths.events.'+step.event,{
      vertex:step.vertex??'',from:step.edge?.from??'',to:step.edge?.to??'',weight:step.edge?.weight??'',pass:step.pass??''
    })}</p>
  </section>;
}
