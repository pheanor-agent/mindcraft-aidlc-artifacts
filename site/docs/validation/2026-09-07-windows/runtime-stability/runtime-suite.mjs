import {spawn,spawnSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import pty from 'node-pty';
const root=resolve(import.meta.dirname,'..'), exe=resolve(root,'dist/windows-package/MindCraft.exe');
const output=resolve(root,'reports/runtime-stability-extended'), base=resolve(root,'workspaces/runtime-stability-extended');
await mkdir(output,{recursive:true});await mkdir(base,{recursive:true});
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/KEY|TOKEN|SECRET|MINDCRAFT|AIROUTER/i.test(k)));
env.PATH=process.env.SystemRoot+'\\System32';env.TERM='xterm-256color';
// Explicit diagnostic workaround only; default setup failure is retained in prior logs.
env.MINDCRAFT_PROVIDER='mock';env.MINDCRAFT_MODEL='deterministic';
const results=[], sessions=[];const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function check(name,ok,detail=''){results.push({name,pass:!!ok,detail});console.log(JSON.stringify(results.at(-1)));}
async function session(name,{tui=false,workspace=name,args}={}){
 const cwd=resolve(base,workspace);await mkdir(cwd,{recursive:true});
 const argv=args??[tui?'--tui':'--cli','--mock','--workspace',cwd];
 const child=tui?pty.spawn(exe,argv,{cwd,env,cols:120,rows:35,useConpty:true}):spawn(exe,argv,{cwd,env,windowsHide:true});
 const s={name,cwd,child,text:'',code:null,events:[],tui};sessions.push(s);
 const data=x=>{s.text+=String(x);s.events.push({at:Date.now(),output:String(x)});};
 if(tui){child.onData(data);child.onExit(e=>s.code=e.exitCode);}else{child.stdout.on('data',data);child.stderr.on('data',data);child.on('exit',c=>s.code=c);}
 s.wait=async(pattern,timeout=12000)=>{let start=Date.now();while(!pattern.test(s.text)){if(Date.now()-start>timeout)throw Error(name+' timeout '+pattern);await sleep(50);}return s.text;};
 s.send=async command=>{s.text='';s.events.push({at:Date.now(),input:command});if(tui)child.write(command+'\r');else child.stdin.write(command+'\n');await sleep(220);};
 s.stop=async()=>{await s.send('quit');for(let i=0;i<100&&s.code===null;i++)await sleep(50);if(s.code===null){if(tui)child.kill();else spawnSync('taskkill',['/PID',String(child.pid),'/T','/F']);}return s.code;};
 return s;
}
try{
 const s=await session('한글 공백 workspace');await s.wait(/mindcraft>/);check('clean isolated startup',true);
 for(const [cmd,re] of [['run no task',/create a task first/],['setup',/Usage:/],['use missing',/error:/],['approve',/requires/],['cancel missing',/error:/],['mode invalid',/error:/],['knowledge-detail missing',/not found/]]){await s.send(cmd);await s.wait(re);check('invalid input: '+cmd,true);}
 await s.send('setup mock deterministic');await s.wait(/setup=complete/);check('offline setup',true);
 await s.send('task 안정성 검증 😀');await s.wait(/task=/);const id=s.text.match(/task=([^\s]+)/)[1];check('unicode task',true,id);
 await mkdir(resolve(s.cwd,'test'),{recursive:true});await writeFile(resolve(s.cwd,'test/release-check.test.mjs'),"import {test} from 'node:test'; import assert from 'node:assert/strict'; test('runtime fixture',()=>assert.equal(2+2,4));");
 await s.send('run inspect');await s.wait(/event=tool_decision|error:/);
 await s.send('approvals');await sleep(600);check('approval list responsive during run',/approval-/.test(s.text),s.text);
 const handled=new Set();let completed=false;
 for(let i=0;i<80;i++){
  const records=(await readFile(resolve(s.cwd,'.mindcraft/state.jsonl'),'utf8')).trim().split('\n').map(x=>JSON.parse(x).record);
  const pending=records.findLast(r=>r.kind==='tool_decision'&&r.status==='pending'&&!handled.has(r.id));
  if(pending){handled.add(pending.id);const action=handled.size===1?'reject':'approve';await s.send(action+' '+pending.id);await s.wait(new RegExp(action+'=|error:'));check(action+' via journal ID',new RegExp(action+'=').test(s.text),s.text);}
  if(/run=completed/.test(s.text)){completed=true;break;}await sleep(150);
 }
 check('mock run with diagnostic model override',completed,s.text.slice(-1800));
 for(const cmd of ['runs','history','knowledge','preview release','status']){await s.send(cmd);await s.wait(/mindcraft>/);check('query '+cmd,!/error:/.test(s.text),s.text.slice(-600));}
 const conflict=await session('lock-conflict',{workspace:'한글 공백 workspace'});await conflict.wait(/already in use|mindcraft>/);check('concurrent workspace blocked',/already in use/.test(conflict.text),conflict.text.slice(-400));if(conflict.code===null)await conflict.stop();
 check('normal quit exit',await s.stop()===0);
 const restart=await session('restart',{workspace:'한글 공백 workspace'});await restart.wait(/mindcraft>/);await restart.send('tasks');await restart.wait(new RegExp(id));check('task restored after restart',true);await restart.stop();
 for(let i=0;i<8;i++){const q=await session('cycle-'+i,{workspace:'cycles'});await q.wait(/mindcraft>/);await q.send('task cycle-'+i);await q.wait(/task=/);check('repeat launch '+i,await q.stop()===0);}
 const kill=await session('forced-kill');await kill.wait(/mindcraft>/);await kill.send('task survive crash');await kill.wait(/task=/);spawnSync('taskkill',['/PID',String(kill.child.pid),'/T','/F']);await sleep(700);
 const recovered=await session('crash-recovery',{workspace:'forced-kill'});await recovered.wait(/mindcraft>/);await recovered.send('tasks');await recovered.wait(/survive crash/);check('forced process tree kill and stale lock recovery',true);await recovered.stop();
 const t=await session('tui-resize',{tui:true});await t.wait(/MindCraft/);await sleep(1000);await t.send('setup mock deterministic');await sleep(600);for(const [cols,rows] of [[50,15],[180,50],[80,24],[120,35]]){t.child.resize(cols,rows);await sleep(250);await t.send('tasks');check('ConPTY resize '+cols+'x'+rows,t.code===null);}check('TUI quit after resize',await t.stop()===0);
 const bad=await session('bad-option',{args:['--unknown']});await sleep(1300);check('unknown option rejected',bad.code===2,bad.text);
 const corruptDir=resolve(base,'corrupt-config/.mindcraft');await mkdir(corruptDir,{recursive:true});await writeFile(resolve(corruptDir,'config.json'),'{broken');const badConfig=await session('corrupt-config');await sleep(1300);check('corrupt config controlled failure',badConfig.code===1&&/invalid config/.test(badConfig.text),badConfig.text);
}catch(e){check('suite interruption',false,e.stack);}
finally{for(const s of sessions){if(s.code===null)await s.stop();await writeFile(resolve(output,s.name.replace(/[^a-zA-Z0-9_-]/g,'_')+'.json'),JSON.stringify({name:s.name,code:s.code,events:s.events},null,2));}await writeFile(resolve(output,'results.json'),JSON.stringify({time:new Date().toISOString(),exe,results},null,2));}
