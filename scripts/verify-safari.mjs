import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const probe=createServer();
await new Promise(r=>probe.listen(0,'127.0.0.1',r));
const port=probe.address().port;
await new Promise(r=>probe.close(r));
const driver=spawn('/usr/bin/safaridriver',['--port',String(port)],{stdio:['ignore','ignore','pipe']});
let driverError='';driver.stderr.on('data',c=>driverError+=c);
const base=`http://127.0.0.1:${port}`;
const url=process.env.PHYSICS_VERIFY_URL || 'http://127.0.0.1:5174/';
const evidence={date:new Date().toISOString(),mode:'Safari WebDriver isolated automation window',url,checks:{},performance:[],scope:'macOS Safari; not a physical iPhone/iPad test'};
let session;
async function call(method,path,data){
 const response=await fetch(base+path,{method,headers:{'content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(25000)});
 const body=await response.json();
 if(!response.ok || body.value?.error)throw new Error(body.value?.message || JSON.stringify(body));
 return body.value;
}
const command=(path,data)=>call('POST',`/session/${session}${path}`,data);
const evaluate=(fn,...args)=>command('/execute/sync',{script:`return (${fn.toString()})(...arguments);`,args});
const asyncEvaluate=(fn,...args)=>command('/execute/async',{script:`const done=arguments[arguments.length-1];Promise.resolve((${fn.toString()})(...Array.from(arguments).slice(0,-1))).then(done,e=>done({error:String(e)}));`,args});
async function until(fn,...args){
 const start=Date.now();
 while(Date.now()-start<12000){const result=await evaluate(fn,...args);if(result)return result;await new Promise(r=>setTimeout(r,100));}
 throw new Error('Timed out: '+fn.toString().slice(0,160));
}
const elementId=e=>e['element-6066-11e4-a52e-4f735466cecf'];
async function click(name){
 const e=await until(name=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===name&&!b.disabled),name);
 await command(`/element/${elementId(e)}/click`,{});
}
async function field(label){return until(label=>document.querySelector(`[aria-label="${label}"]`) || Array.from(document.querySelectorAll('label')).find(e=>e.textContent.trim()===label)?.querySelector('input,textarea,select'),label);}
async function fill(label,text){const id=elementId(await field(label));await command(`/element/${id}/clear`,{});await command(`/element/${id}/value`,{text});}
async function select(label,value){
 const select=await field(label);
 const option=await evaluate((e,v)=>Array.from(e.options).find(o=>o.value===v),select,value);
 await command(`/element/${elementId(option)}/click`,{});
}
const text=(selector)=>evaluate(s=>document.querySelector(s)?.textContent.trim(),selector);
const snapshot=()=>asyncEvaluate(()=>new Promise((resolve,reject)=>{
 const request=indexedDB.open('physics-lab');request.onerror=()=>reject(request.error);
 request.onsuccess=()=>{const db=request.result;const get=db.transaction('workspace').objectStore('workspace').get('current');get.onsuccess=()=>{resolve(get.result);db.close();};get.onerror=()=>reject(get.error);};
}));
try{
 for(let i=0;i<60;i++){
  try{await call('GET','/status');break;}catch{if(driver.exitCode!==null)throw new Error(driverError||'Safari driver exited');await new Promise(r=>setTimeout(r,100));}
 }
 const created=await call('POST','/session',{capabilities:{alwaysMatch:{browserName:'safari'}}});
 session=created.sessionId;
 evidence.browser=created.capabilities;
 await command('/timeouts',{script:15000,pageLoad:20000,implicit:0});
 await command('/window/rect',{width:1440,height:1000});
 await command('/url',{url});
 await until(()=>document.querySelector('main button')!==null);
 await evaluate(()=>{window.__physicsErrors=[];addEventListener('error',e=>window.__physicsErrors.push(e.message));addEventListener('unhandledrejection',e=>window.__physicsErrors.push(String(e.reason)));});
 await click('Начать занятие');
 await until(()=>Array.from(document.querySelectorAll('[role="tab"]')).find(e=>e.textContent.includes('Эксперимент')));
 const experiment=await evaluate(()=>Array.from(document.querySelectorAll('[role="tab"]')).find(e=>e.textContent.includes('Эксперимент')));
 await command(`/element/${elementId(experiment)}/click`,{});
 await fill('Мой прогноз','Техническая проверка Safari: путь 16 м.');
 await click('К концу опыта');
 assert.equal(await text('[data-testid="distance-value"]'),'16 м');
 assert.equal(await text('[data-testid="velocity-value"]'),'8 м/с');
 await fill('Мои наблюдения','Путь 16 м, скорость 8 м/с.');
 await fill('Мой вывод','Техническая проверка Safari: средняя скорость 4 м/с.');
 await click('Сохранить опыт');
 await until(()=>document.body.textContent.includes('Опыт сохранён.'));
 const training=await evaluate(()=>Array.from(document.querySelectorAll('[role="tab"]')).find(e=>e.textContent.includes('Тренировка')));
 await command(`/element/${elementId(training)}/click`,{});
 await fill('Число','4');await select('Единица ответа','м/с²');await click('Проверить ответ');
 await until(()=>document.body.textContent.includes('Число верное. Проверьте единицу измерения.'));
 const before=await snapshot();
 await command('/refresh',{});
 await click('Результаты');
 await until(()=>document.body.textContent.includes('Техническая проверка Safari: средняя скорость 4 м/с.'));
 assert.deepEqual(await snapshot(),before);
 evidence.checks={k1ReferenceValues:true,unitErrorSeparate:true,saveAndReloadExact:true,attempts:before.attempts.length,experiments:before.experiments.length};
 console.log(JSON.stringify({stage:'K1 persistence and units passed',browser:created.capabilities.browserVersion}));
 await click('Игровая площадка');
 await select('Модель эксперимента','circular');
 await until(()=>document.querySelector('[data-testid="metric-acceleration"]'));
 const latencies=[];
 for(let i=0;i<20;i++){
  const ms=await asyncEvaluate(i=>new Promise((resolve,reject)=>{
   const slider=document.querySelector('input[type="range"][aria-label="Радиус R, м — ползунок"]');
   const metric=document.querySelector('[data-testid="metric-acceleration"]');
   const previous=metric.textContent,start=performance.now();
   const timeout=setTimeout(()=>reject(new Error('No response from slider')),1500);
   Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(slider,i%2?5:6);
   slider.dispatchEvent(new Event('input',{bubbles:true}));
   const check=()=>{if(metric.textContent!==previous){clearTimeout(timeout);resolve(performance.now()-start);}else requestAnimationFrame(check);};requestAnimationFrame(check);
  }),i);
  assert.equal(typeof ms,'number',JSON.stringify(ms));latencies.push(ms);
 }
 evidence.sliderLatencyMs={samples:latencies,maximum:Math.max(...latencies),mean:latencies.reduce((a,b)=>a+b,0)/latencies.length};
 for(const [model,selector] of [['circular','.model-scene'],['linear','.scene svg'],['gas','.model-scene'],['lightClock','.clock-panels'],['circuit','svg[aria-label^="Выделенная энергия E(t)"]']]){
  await select('Модель эксперимента',model);
  await until(s=>document.querySelector(s),selector);
  await evaluate(s=>document.querySelector(s).scrollIntoView({block:'center'}),selector);
  await click('Запустить');
  const result=await asyncEvaluate(selector=>new Promise(resolve=>{
   const node=document.querySelector(selector),start=performance.now();let frames=0,changes=0,previous='';
   const tick=now=>{frames++;const next=node.outerHTML;if(previous&&next!==previous)changes++;previous=next;
    if(now-start>=3000)resolve({durationMs:now-start,frames,changes,visible:!document.hidden,viewport:{width:innerWidth,height:innerHeight}});else requestAnimationFrame(tick);};requestAnimationFrame(tick);
  }),selector);
  assert.equal(result.visible,true,JSON.stringify(result));
  const updatesPerSecond=result.changes/(result.durationMs/1000);
  evidence.performance.push({model,...result,updatesPerSecond});
  console.log(JSON.stringify({model,updatesPerSecond}));
  await click('Пауза');
 }
 evidence.pageErrors=await evaluate(()=>window.__physicsErrors??[]);
 evidence.measurement='input event to changed metric observed at animation frame; changed SVG markup per visible animation frame, not display scanout';
 evidence.passed=evidence.sliderLatencyMs.maximum<100&&evidence.performance.every(s=>s.updatesPerSecond>=30)&&evidence.pageErrors.length===0;
 assert.equal(evidence.passed,true,'Performance target not met; see evidence');
} catch(error){evidence.passed=false;evidence.error=error.message;process.exitCode=1;}
finally{
 await writeFile('docs/verification/2026-10-15-safari-performance.json',JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify(evidence,null,2));
 if(session)await call('DELETE',`/session/${session}`).catch(()=>{});
 driver.kill('SIGTERM');
}
