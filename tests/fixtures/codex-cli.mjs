#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const config = JSON.parse(await readFile(join(process.env.CODEX_HOME, 'fixture.json'), 'utf8'));
if (config.record) await writeFile(config.record, JSON.stringify({args:process.argv.slice(2), cwd:process.cwd(), api:process.env.OPENAI_API_KEY, codexApi:process.env.CODEX_API_KEY}));
if (process.argv.includes('status')) {
 if (config.statusDelay) await new Promise(r=>setTimeout(r,config.statusDelay));
 console.error(config.auth === 'api' ? 'Logged in using an API key' : config.auth === 'none' ? 'Not logged in' : 'Logged in using ChatGPT');
 process.exit(config.auth === 'none' ? 1 : 0);
}
if (process.argv.includes('--device-auth')) {
 console.log('Welcome to Codex');
 console.log('https://auth.openai.com/codex/device');
 console.log('ABCD-12345');
 if (config.loginFail) process.exit(1);
 if (config.loginComplete) {await writeFile(join(process.env.CODEX_HOME,'fixture.json'),JSON.stringify({...config,auth:'chatgpt',statusDelay:400}));process.exit(0);}
 setInterval(()=>{},1000);
} else {
 let input='';
 for await (const c of process.stdin) input+=c;
 if (config.inputRecord) await writeFile(config.inputRecord,input);
 if (config.hang) setInterval(()=>{},1000);
 else if (config.fail) {console.error(config.fail); process.exit(1);}
 else if(config.large) console.log('x'.repeat(3*1024*1024));
 else {
  console.log(JSON.stringify({type:'thread.started',thread_id:'fixture'}));
  if(config.transientError) console.log(JSON.stringify({type:'error',message:'Reconnecting after a temporary stream interruption'}));
  console.log(JSON.stringify({type:'item.completed',item:{type:'reasoning',text:'private reasoning'}}));
  console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:config.answer ?? 'Объяснение силы: F = ma.'}}));
  if(!config.incomplete) console.log(JSON.stringify({type:config.turnFailed?'turn.failed':'turn.completed',usage:{input_tokens:1,output_tokens:1}}));
 }
}
