import {spawn,spawnSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import pty from 'node-pty';
const root=resolve(import.meta.dirname,'..'), exe=resolve(root,'dist/windows-package/MindCraft.exe');
const output=resolve(root,'reports/runtime-stability-recovery'), base=resolve(root,'workspaces/runtime-stability-recovery');
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
 const t=await session('tui-resize',{tui:true});await t.wait(/MindCraft/);await sleep(1000);await t.send('setup mock deterministic');await sleep(600);for(const [cols,rows] of [[50,15],[180,50],[80,24],[120,35]]){t.child.resize(cols,rows);await sleep(250);await t.send('tasks');check('ConPTY resize '+cols+'x'+rows,t.code===null);}check('TUI quit after resize',await t.stop()===0);
 const bad=await session('bad-option',{args:['--unknown']});await bad.wait(/Unknown launch option/);await sleep(300);check('unknown option rejected',bad.code===2,bad.text);
 const corruptDir=resolve(base,'corrupt-config/.mindcraft');await mkdir(corruptDir,{recursive:true});await writeFile(resolve(corruptDir,'config.json'),'{broken');const badConfig=await session('corrupt-config');await badConfig.wait(/invalid config/);await sleep(300);check('corrupt config controlled failure',badConfig.code===1,badConfig.text);
 const s=await session('cancellation');await s.wait(/mindcraft>/);await s.send('setup mock deterministic');await s.wait(/setup=complete/);await s.send('task cancel run');await s.wait(/task=/);await s.send('run inspect');await s.wait(/event=tool_decision/);await s.send('cancel');await s.wait(/cancel=/);check('cancel approval-waiting run',/cancel=aborted/.test(s.text),s.text);await s.send('tasks');await s.wait(/mindcraft>/);check('responsive after cancellation',true);await s.stop();
 const k=await session('forced-kill');await k.wait(/mindcraft>/);await k.send('task survive crash');await k.wait(/task=/);const killed=spawnSync(resolve(process.env.SystemRoot,'System32/taskkill.exe'),['/PID',String(k.child.pid),'/T','/F'],{encoding:'utf8'});check('force kill command',killed.status===0,JSON.stringify({status:killed.status,error:killed.error?.message,stdout:killed.stdout,stderr:killed.stderr}));await sleep(1000);
 if(killed.status===0){const r=await session('crash-recovery',{workspace:'forced-kill'});await r.wait(/mindcraft>/);await r.send('tasks');await r.wait(/survive crash/);check('stale lock recovery preserves task',true);await r.stop();}
}catch(e){check('suite interruption',false,e.stack);}
finally{for(const s of sessions){if(s.code===null)await s.stop();await writeFile(resolve(output,s.name.replace(/[^a-zA-Z0-9_-]/g,'_')+'.json'),JSON.stringify({name:s.name,code:s.code,events:s.events},null,2));}await writeFile(resolve(output,'results.json'),JSON.stringify({time:new Date().toISOString(),exe,results},null,2));}
