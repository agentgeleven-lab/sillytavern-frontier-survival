// All durations are game minutes. Existing food ids retain their original rules.
export const FOODS={
 food:{name:'食品',weight:.3,life:10080,edible:true,food:30,category:'旧版补给'},
 rawmeat:{name:'生肉',weight:.5,life:720,edible:false,category:'肉类'},
 cookedmeat:{name:'熟肉',weight:.3,life:1440,edible:true,food:30,meal:true,category:'熟食'},
 smokedmeat:{name:'熏肉',weight:.3,life:10080,edible:true,food:30,meal:true,category:'保存食品'},
 berries:{name:'浆果',weight:.2,life:2880,edible:true,food:12,water:5,category:'水果'},
 vegetables:{name:'蔬菜',weight:.3,life:4320,edible:true,food:10,category:'蔬菜'},
 grain:{name:'谷物',weight:.4,life:20160,edible:false,category:'谷物'},
 canned:{name:'罐头',weight:.4,life:43200,edible:true,food:35,category:'保存食品'},
 fish:{name:'鱼肉',weight:.5,life:720,edible:false,category:'鱼类'},
 grilledfish:{name:'烤鱼',weight:.3,life:1440,edible:true,food:35,spirit:1,meal:true,category:'熟食'},
 vegsoup:{name:'蔬菜汤',weight:.6,life:720,edible:true,food:20,water:25,spirit:2,meal:true,category:'汤与饭菜'},
 stew:{name:'肉菜炖锅',weight:.7,life:1440,edible:true,food:50,water:15,spirit:4,meal:true,category:'汤与饭菜'},
 porridge:{name:'粥',weight:.5,life:1440,edible:true,food:30,water:15,spirit:1,meal:true,category:'汤与饭菜'}
};
export const COOKING_RECIPES={grilledfish:{name:'烤鱼',cost:{fish:1},minutes:10,portable:true},vegsoup:{name:'蔬菜汤',cost:{vegetables:2,water:1},minutes:20},stew:{name:'肉菜炖锅',cost:{rawmeat:1,vegetables:1,water:1},minutes:30},porridge:{name:'粥',cost:{grain:1,water:1},minutes:20}};
export const EDIBLE_FOODS=Object.keys(FOODS).filter(id=>FOODS[id].edible);
