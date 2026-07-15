/* MS Planner · js/seed.js — PRNG determinista + helpers de siembra.
   Script CLÁSICO (global), cargado antes del principal (Fase 2). */
/* PRNG + helpers */
const rng=(()=>{let s=20260629;return()=>{s=(s*9301+49297)%233280;return s/233280}})();
const pick=a=>a[Math.floor(rng()*a.length)];
const rint=(a,b)=>Math.floor(rng()*(b-a+1))+a;
const chance=p=>rng()<p;
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function seededPick(arr,seed){return arr[hashStr(seed)%arr.length]}
function seededBool(seed,p){return (hashStr(seed)%1000)/1000<p}

/* --- puente a window (Fase b.1): expone símbolos como globales para
   compatibilidad con onclick inline y referencias entre módulos.
   getter=valor vivo; setter=permite `x=...` desde handlers inline. --- */
try{Object.defineProperties(window,{
  chance:{get(){return chance},configurable:true},
  hashStr:{get(){return hashStr},configurable:true},
  pick:{get(){return pick},configurable:true},
  rint:{get(){return rint},configurable:true},
  rng:{get(){return rng},configurable:true},
  seededBool:{get(){return seededBool},configurable:true},
  seededPick:{get(){return seededPick},configurable:true}
})}catch(e){console.error('bridge',e)}
export {chance, hashStr, pick, rint, rng, seededBool, seededPick};
