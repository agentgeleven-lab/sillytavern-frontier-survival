export const BODY_PARTS={head:'头部',torso:'躯干',leftArm:'左臂',rightArm:'右臂',leftLeg:'左腿',rightLeg:'右腿'};
export const emptyWound=()=>({trauma:0,bleeding:0,infection:0,exposure:0});
export function bodyState(s){return s.injuries?.limbs??Object.fromEntries(Object.keys(BODY_PARTS).map(id=>[id,id==='torso'?{...emptyWound(),...s.injuries}:emptyWound()]));}
export function ensureBody(s){if(!s.injuries?.limbs){const limbs=bodyState(s);s.injuries={...emptyWound(),...s.injuries,limbs};}return s.injuries.limbs;}
export function syncBody(s){const w=s.injuries;if(!w?.limbs)return;const a=Object.values(w.limbs);w.trauma=Math.min(100,a.reduce((n,p)=>n+p.trauma,0));w.bleeding=Math.min(3,a.reduce((n,p)=>n+p.bleeding,0));w.infection=Math.max(...a.map(p=>p.infection));w.exposure=Math.max(...a.map(p=>p.exposure));}
export function setBodyValue(s,id,value){const w=s.injuries;if(!w?.limbs)return;for(const p of Object.values(w.limbs)){p[id]=0;if(id==='bleeding')p.exposure=0;}w.limbs.torso[id]=value;syncBody(s);}
export const limbPenalty=s=>{const b=bodyState(s);return {arms:Math.max(b.leftArm.trauma,b.rightArm.trauma),legs:Math.max(b.leftLeg.trauma,b.rightLeg.trauma),head:b.head.trauma};};
