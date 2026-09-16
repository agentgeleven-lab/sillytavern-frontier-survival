export const HARVEST={rabbit:{meat:1,hide:1},deer:{meat:3,hide:2},boar:{meat:3,hide:2},fox:{meat:1,hide:1},wolf:{meat:2,hide:1},rat:{meat:1,hide:0},bat:{meat:1,hide:0}};
export const RETALIATION={rabbit:1,deer:3,boar:8,fox:2,wolf:6,rat:1,bat:1};
export const SCARE_CHANCE={rabbit:.95,deer:.8,boar:.4,fox:.8,wolf:.55,rat:.95,bat:.95};
export const HUNT_ACTIONS={shootAnimal:{minutes:1,stamina:4},inspectAnimal:{minutes:1,stamina:0},scareAnimal:{minutes:1,stamina:3},attackAnimal:{minutes:1,stamina:6},butcherAnimal:{minutes:5,stamina:2},skinAnimal:{minutes:8,stamina:2},clearAnimal:{minutes:3,stamina:1},cookMeat:{minutes:10,stamina:0},processHide:{minutes:20,stamina:0}};
export const corpseAge=(s,a)=>Math.max(0,s.time-a.deadAt);
export const corpseFreshness=(s,a)=>corpseAge(s,a)<360?'新鲜':corpseAge(s,a)<720?'开始变质':'腐败';
