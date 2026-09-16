import {spawn,spawnSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import pty from 'node-pty';
const root=resolve(import.meta.dirname,'..'), exe=resolve(root,'dist/runtime-fixes/windows-package/MindCraft.exe');
const output=resolve(root,'reports/runtime-fixes-tui-native'), base=resolve(root,'workspaces/runtime-fixes-tui-native');
await mkdir(output,{recursive:true});await mkdir(base,{recursive:true});
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/KEY|TOKEN|SECRET|MINDCRAFT|AIROUTER/i.test(k)));
env.PATH=process.env.SystemRoot+'\\System32';env.TERM='xterm-256color';
// Explicit diagnostic workaround only; default setup failure is retained in prior logs.

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

}catch(e){check('suite interruption',false,e.stack);}
finally{for(const s of sessions){if(s.code===null)await s.stop();await writeFile(resolve(output,s.name.replace(/[^a-zA-Z0-9_-]/g,'_')+'.json'),JSON.stringify({name:s.name,code:s.code,events:s.events},null,2));}await writeFile(resolve(output,'results.json'),JSON.stringify({time:new Date().toISOString(),exe,results},null,2));}

process.exit(results.some(r=>!r.pass)?1:0);
