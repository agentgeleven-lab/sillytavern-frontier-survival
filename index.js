import {cookMeal} from './src/cooking.js';
import {workshopAction} from './src/workshop.js';
import {waterAction} from './src/water.js';
import {campAction} from './src/camp-game.js';
import {nearCampFacility} from './src/camp-data.js';
import {developerAction} from './src/developer.js';
import {survivalAction} from './src/survival.js';
import {equipmentAction} from './src/equipment.js';
import {huntingAction} from './src/hunting.js';
import {knownWildlife} from './src/wildlife.js';
import {sleep} from './src/sleep.js';
import {createDiagnostics,diagnosedRequest} from './src/diagnostics.js';
import {lightingAction} from './src/lighting.js';
import * as F from './src/field.js';
import * as E from './src/engine.js';
import { RegionGameStore as GameStore } from './src/region-store.js';
import * as W from './src/world.js';
import { demoPlan, BUILDING_SIZES } from './src/layout.js';
import { apiSettings, requestJSON, PROMPTS } from './src/api.js';
import { createUI } from './src/ui.js';
import { messageIdentity, messageFingerprint, validateEvents, applyEvents, reconcileSources, revokeClue, manualClue } from './src/sync.js';

const EXT='frontier_survival',PROMPT_KEY='frontier_survival_scene';
const getContext=()=>globalThis.SillyTavern?.getContext?.()??null;
let instance;
export function cardBackground(card){
  const d=card?.data??card??{},entries=d.character_book?.entries??[];
  return [`角色/世界：${d.name??card?.name??''}`,d.description??'',d.scenario??'',d.personality??'',
    ...Object.values(entries).filter(e=>e.enabled!==false&&e.disable!==true).map(e=>`${e.comment??''}\n${e.content??''}`)].filter(Boolean).join('\n\n').slice(0,30000);
}
export function initialize(){
  if(instance)return instance;
  const ctx=getContext();let namespace='standalone';
  if(ctx?.extensionSettings){ctx.extensionSettings[EXT]??={namespace:crypto.randomUUID(),inject:true,sync:true};namespace=ctx.extensionSettings[EXT].namespace;ctx.saveSettingsDebounced?.();}
  const preferences=ctx?.extensionSettings?.[EXT]??{inject:true,sync:true};
  const store=new GameStore(localStorage,namespace),api=apiSettings(localStorage,namespace),diagnostics=createDiagnostics(localStorage,namespace);let ui,drainTimer=null,queued=new Map(),bindings=[],hostWarning='',switchSerial=0,stopped=false;
  function scope(){const c=getContext();if(!c)return 'standalone';const id=c.getCurrentChatId?.()??c.chatId??c.characters?.[c.characterId]?.chat;if(!id)return 'unbound';return `${c.groupId?'group:'+c.groupId:c.characters?.[c.characterId]?.avatar??'chat'}:${id}`;}
  function pushContext(){const c=getContext();if(!c?.setExtensionPrompt)return;const content=preferences.inject&&store.state?`[边境游戏 · 已知现场]\n以下为插件当前保存的游戏事实，仅用作世界背景与角色交流依据。未提供的隐藏战利品和未知地图不应当作已知信息。对话里的传闻可以提供线索，但不要声称已执行未经插件结算的物品转移或建设。\n${E.knownContext(store.state)}\n[/边境游戏]`:'';c.setExtensionPrompt(PROMPT_KEY,content,1,0,false);}
  async function changeChat(){
    const serial=++switchSerial;queued.clear();clearTimeout(drainTimer);
    try{
      await store.switch(scope());
      if(serial!==switchSerial)return;
      if(store.state&&getContext()){
        const restored=E.clone(store.state);
        if(reconcileSources(restored,getContext().chat??[]))await store.run(()=>restored);
      }
      if(serial!==switchSerial)return;
      hostWarning='';ui?.setStatus(store.state?'已载入当前聊天的游戏存档。':'当前聊天尚未创建游戏。');
    }catch(e){
      if(serial!==switchSerial)return;
      store.state=null;store.notify();hostWarning=`存档读取失败：${e.message}。原存档尚未覆盖。`;ui?.setStatus(hostWarning,true);
    }
    pushContext();
  }

  function request(kind,payload,signal,validator){
    const config=api.get();
    return diagnosedRequest({diagnostics,kind,payload,config,scope:store.scope,signal,validator,
      request:(input,onTrace)=>requestJSON(config,PROMPTS[kind],input,{signal,onTrace}),
      onRepair:()=>ui?.setStatus('模型结果未通过结构检查，正在请求修正…')});
  }
  const validatedRequest=(kind,payload,validator,signal)=>request(kind,payload,signal,validator);
  async function create(options){
    const input={theme:options.theme==='wild'?'荒野独居，以自然环境为主，人造建筑稀少':'末日废土，城市边缘与荒野相接',background:options.background,seed:options.seed};
    await store.run(async(_,signal)=>{
      const spec=W.fixedRegionSpec({seed:options.seed,theme:options.theme,atlas:{regions:{}}},0,0);
      const raw=options.mode==='demo'?W.demoRegion(spec):await validatedRequest('world',{...input,constraints:spec},raw=>W.validateRegion(raw,spec),signal);
      const game=E.newGame(raw,options);game.world=W.validateRegion(raw,spec);E.reveal(game);W.summarizeRegion(game);return game;
    },{create:true});
    ui.setStatus(options.mode==='demo'?'已创建离线演示。地图与物资来自示例数据。':'世界已生成并保存，可以开始独立探索。');
  }
  async function act(type,p){
    await store.run(async(s,signal,transaction)=>{
      if(['devToggle','devGrant','devStats','devRestore','devClearWounds','devAdvance'].includes(type)){developerAction(s,type,p);return;}
      if(type==='cookMeal'){cookMeal(s,p.recipe,p.qty);return;}
      if(['wearCoat','workshopCraft','upgradeBench','heaterFeed','heaterToggle','relaxFurniture'].includes(type)){workshopAction(s,type,p);return;}
      if(['enterShore','fishWater','collectWater','drinkDirty','boilWater','filterWater','craftFilter','treatStomach','rainTake','rainEmpty'].includes(type)){waterAction(s,type,p);return;}
      if(['campExpand','campBatchPlace','campSelectBed','campSetMode','campAutoPlace','campEnter','campExit','campMove','campPlace','campRelocate','campRemove','campDoor','campDeposit','campWithdraw','campRename'].includes(type)){campAction(s,type,p);return;}
      if(s.player.camp){E.assert(!['travel','field','cave','enter','move','approach','leave','survey','build','deposit','withdraw'].includes(type),'请先从营地入口离开');if(type==='sleep')E.assert(nearCampFacility(s,'bed'),'请先走到床铺旁睡眠');}
      E.assert(!s.ended,'本局角色已无法行动，请导出记录并开始新游戏');
      const payload={background:s.background,theme:s.theme,seed:s.seed,known:JSON.parse(E.knownContext(s))};
      if(['craftLight','lightOn','lightOff','reloadLight','faceLight','fireBuild','fireFeed','fireToggle'].includes(type))lightingAction(s,type,p.item);
      else if(type==='travel'){
        const plan=W.travelPlan(s,p.x,p.y),oldCoord=W.regionKey(s);
        const survival=E.clone(s);E.tick(survival,plan.minutes);E.assert(!survival.ended,'当前补给或健康不足以完成旅行，未结算');
        let data=s.atlas.regions[E.key(p.x,p.y)]?await transaction.loadRegion(s,p.x,p.y):null;
        if(s.atlas.regions[E.key(p.x,p.y)])E.assert(data,'旧区域存档缺失，停止旅行');
        if(!data){
          const spec=W.fixedRegionSpec(s,p.x,p.y);
          const raw=s.mode==='demo'?W.demoRegion(spec):await validatedRequest('world',{...payload,constraints:spec},raw=>W.validateRegion(raw,spec),signal);
          data={world:W.validateRegion(raw,spec),locals:{},clues:[],sync:{}};
        }
        const old=W.installRegion(s,p.x,p.y,data,plan);transaction.stageRegion(oldCoord,old);
        if(getContext())reconcileSources(s,getContext().chat??[]);
      }else if(type==='field'||type==='cave'){
        const zone=type==='cave'?'cave':'field',spec=F.fieldConstraints(s,E.cell(s),zone);
        const raw=s.locals[spec.id]?null:s.mode==='demo'?F.demoField(s,zone):await validatedRequest('field',{...payload,constraints:spec},raw=>F.validateField(raw,s,zone),signal);F.enterField(s,raw,zone);
      }else if(type==='gather')F.gather(s,p.x,p.y);
      else if(type==='weave')F.weave(s);
      else if(type==='enter'){
        const c=E.cell(s);E.assert(c.site,'当前位置没有建筑');
        const raw=s.locals[c.site.id]?null:s.mode==='demo'?demoPlan(c.site.size??'normal'):await validatedRequest('local',{...payload,site:c.site,size:c.site.size??'normal',maxWidth:BUILDING_SIZES[c.site.size??'normal'],maxHeight:BUILDING_SIZES[c.site.size??'normal']},raw=>E.validateLocal(raw,c.site.size??'normal'),signal);E.enter(s,raw);
      }else if(type==='search'){
        const c=E.localMap(s)?.containers[E.key(p.x,p.y)];E.assert(c&&!c.searched&&E.adjacent(s,p.x,p.y),'请站到尚未搜索的容器旁');
        const raw=s.mode==='demo'?E.demoLoot(c.name):await validatedRequest('loot',{...payload,action:'搜索容器',container:{name:c.name,kind:c.kind},site:E.cell(s).site},E.validateLoot,signal);E.searchContainer(s,p.x,p.y,raw);
      }else if(type==='survey'){
        F.quickGather(s);
      }else if(type==='build'){
        // Validate and debit only a draft; API failure discards the draft including time/material changes.
        const recipe=E.RECIPES[p.recipe];E.assert(recipe,'未知建设配方');E.build(s,p.recipe);
        if(s.mode==='api'){const raw=await request('build',{...payload,recipe},signal);const description=E.text(raw.description,1200);E.log(s,description);}
      }else if(type==='move')E.move(s,p.x,p.y);
      else if(type==='approach'){const path=E.approachPath(s,p.x,p.y);E.assert(path?.length,'无法沿已知路线走近这个物件');const end=path[path.length-1];E.move(s,end.x,end.y);}
      else if(type==='door')E.door(s,p.x,p.y);
      else if(type==='leave')E.leave(s);
      else if(['approachAnimal','inspectAnimal','scareAnimal','attackAnimal','shootAnimal','butcherAnimal','skinAnimal','clearAnimal','cookMeat','processHide'].includes(type))huntingAction(s,type,p.actor);
      else if(['buildFacility','campCook','smokeMeat','discardFood','bandage','treatInfection'].includes(type))survivalAction(s,type,p.item);
      else if(['craftGear','equipWeapon','stance'].includes(type))equipmentAction(s,type,p.item);
      else if(type==='observeWildlife'){E.assert(E.localMap(s)?.kind,'请进入自然地点观察');E.tick(s,5,0);E.log(s,`安静观察五分钟，目前看见 ${knownWildlife(s).visible.length} 个生物或遗骸。`);}
      else if(type==='rest')E.rest(s);
      else if(type==='sleep')sleep(s,p.choice,p.turnOff);
      else if(type==='take')E.take(s,p.x,p.y,p.item);
      else if(type==='use')E.useItem(s,p.item);
      else if(type==='deposit'||type==='withdraw')E.campTransfer(s,p.item,type==='deposit');
      else throw Error('未知操作');
    });ui.setStatus('行动已结算并保存。');
  }
  async function background(){const c=getContext();E.assert(c,'未连接酒馆');const character=c.characters?.[c.characterId];E.assert(character,'请先选择角色卡；群聊可通过 JSON 文件指定背景');const main=cardBackground(character),book=character.data?.extensions?.world;if(book&&c.loadWorldInfo){const data=await c.loadWorldInfo(book);const entries=Object.values(data?.entries??{}).filter(e=>e.disable!==true&&e.enabled!==false).map(e=>`${e.comment??''}\n${e.content??''}`).join('\n\n');return (main+'\n\n'+entries).slice(0,30000);}return main;}
  function queueMessage(index){const c=getContext(),m=c?.chat?.[index];if(!preferences.sync||!m||m.is_system||!store.state||store.state.mode==='demo')return;
    const id=messageIdentity(m,index),fingerprint=messageFingerprint(m);if(store.state.atlas.sources?.[id]&&store.state.atlas.sources[id]!==W.regionKey(store.state))return;if(store.state.sync[id]?.fingerprint===fingerprint)return;
    if(typeof m.mes!=='string'||m.mes.length<2||m.mes.length>16000)return;
    queued.set(id,{index,id,fingerprint,region:W.regionKey(store.state),scope:scope(),serial:switchSerial,target:{text:m.mes,isUser:!!m.is_user},name:m.name??'角色',surrounding:c.chat.slice(Math.max(0,index-2),index).map(e=>({name:e.name,text:String(e.mes??'').slice(-1500)}))});
    clearTimeout(drainTimer);drainTimer=setTimeout(drain,350);
  }
  async function drain(){
    if(!queued.size)return;if(store.busy){drainTimer=setTimeout(drain,500);return;}
    const [id,job]=queued.entries().next().value;queued.delete(id);
    try{
      if(!store.state||job.serial!==switchSerial||job.scope!==scope()||job.region!==W.regionKey(store.state))return;
      const current=getContext()?.chat?.[job.index];if(!current||messageFingerprint(current)!==job.fingerprint)return;
      await store.run(async(s,signal)=>{
        const raw=await request('sync',{target:job.target,surrounding:job.surrounding,known:JSON.parse(E.knownContext(s))},signal);
        const latest=getContext()?.chat?.[job.index];E.assert(job.serial===switchSerial&&job.scope===scope()&&latest&&messageFingerprint(latest)===job.fingerprint,'消息已经变化，旧同步结果已丢弃');
        const events=validateEvents(raw,job.target,s.world.size);applyEvents(s,events,job);s.atlas.sources??={};s.atlas.sources[id]=W.regionKey(s);
      });ui.setStatus('聊天线索已同步。');
    }catch(e){ui.setStatus(`聊天同步未完成：${e.message} 可在「线索与日志」手动重试。`,true);}
    finally{if(queued.size)drainTimer=setTimeout(drain,350);}
  }
  function reconcile(){
    // Content edits invalidate pending work before any result can commit.
    if(store.busy){store.cancel();ui?.setStatus('消息发生变化，正在进行的操作已取消，游戏未结算。');}
    queued.clear();if(!store.state)return;
    const messages=getContext()?.chat??[],draft=E.clone(store.state);
    if(reconcileSources(draft,messages))store.run(()=>draft).catch(e=>ui.setStatus(e.message,true));
  }
  const actions={create,act,background,cardFile:raw=>{E.assert(raw.length<3000000,'角色卡文件过大');return cardBackground(JSON.parse(raw));},
    import:raw=>store.import(raw),revoke:id=>store.run(s=>{revokeClue(s,id);}),clue:data=>store.run(s=>{manualClue(s,data);}),
    context:()=>E.knownContext(store.state),preferences,savePreferences(){getContext()?.saveSettingsDebounced?.();pushContext();},
    async sync(){E.assert(getContext(),'未连接酒馆聊天');E.assert(store.state?.mode==='api','离线演示不调用聊天提取 API');const c=getContext();for(let i=Math.max(0,c.chat.length-4);i<c.chat.length;i++)queueMessage(i);ui.setStatus('已加入同步队列；只检查最近四条消息。');},
  };
  ui=createUI({store,api,actions,diagnostics,hostAvailable:!!ctx});
  store.subscribe(()=>{try{pushContext();}catch(e){ui.setStatus('游戏已保存，但聊天上下文注入失败：'+e.message,true);}});
  function bind(name,fn){const type=ctx?.event_types?.[name];if(type&&ctx.eventSource?.on){ctx.eventSource.on(type,fn);bindings.push([type,fn]);}}
  bind('CHAT_CHANGED',changeChat);
  bind('GENERATION_AFTER_COMMANDS',()=>{stopped=false;pushContext();});
  bind('MESSAGE_SENT',index=>{pushContext();queueMessage(Number.isInteger(index)?index:(getContext()?.chat?.length??1)-1);});
  bind('GENERATION_STOPPED',()=>{stopped=true;queued.clear();});
  // Use completed messages only: streaming partials never become game facts.
  bind('GENERATION_ENDED',()=>{if(!stopped)queueMessage((getContext()?.chat?.length??1)-1);});
  bind('MESSAGE_EDITED',index=>{reconcile();queueMessage(index);});
  bind('MESSAGE_DELETED',reconcile);
  bind('MESSAGE_SWIPED',index=>{reconcile();setTimeout(()=>queueMessage(index),400);});
  changeChat();
  const entry=document.createElement('div');entry.className='fs-settings-entry';const open=document.createElement('button');open.type='button';open.textContent='打开「边境 · 探索生存」';open.onclick=ui.open;entry.append(open);(document.querySelector('#extensions_settings2')??document.querySelector('#extensions_settings'))?.append(entry);
  instance={open:ui.open,destroy(){store.cancel();clearTimeout(drainTimer);queued.clear();for(const[t,fn]of bindings)ctx?.eventSource?.removeListener?.(t,fn);getContext()?.setExtensionPrompt?.(PROMPT_KEY,'',1,0,false);ui.destroy();entry.remove();instance=null;delete globalThis.FrontierSurvival;}};
  globalThis.FrontierSurvival={open:ui.open,version:'0.22.0',getKnownContext:()=>E.knownContext(store.state)};
  if(!ctx)ui.open();if(hostWarning)ui.setStatus(hostWarning,true);return instance;
}
const ctx=getContext();
if(ctx?.eventSource&&ctx.event_types?.APP_INITIALIZED)ctx.eventSource.on(ctx.event_types.APP_INITIALIZED,initialize);
else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
else initialize();
