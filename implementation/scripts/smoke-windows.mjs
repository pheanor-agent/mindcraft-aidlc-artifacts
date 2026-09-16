import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const base = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const exe = resolve(base, 'dist/windows-package/MindCraft.exe');
const workspace = resolve(base, `workspaces/한글 공백 ${Date.now()}`);
await mkdir(workspace, { recursive: true });
const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/KEY|TOKEN|SECRET|MINDCRAFT|AIROUTER/i.test(key)));
environment.PATH = `${process.env.SystemRoot}\\System32`;
environment.MINDCRAFT_TUI = '0';
async function session(commands) {
  return new Promise((resolveSession, reject) => {
    const child = spawn(exe, ['--cli', '--mock', '--workspace', workspace], { cwd: workspace, env: environment, windowsHide: true });
    let stdout = '', stderr = '', buffer = '', index = 0;
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Timeout: ${stdout}\n${stderr}`)); }, 25000);
    child.stdout.on('data', data => {
      stdout += data; buffer += data;
      if (buffer.includes('mindcraft> ') && index < commands.length) {
        buffer = '';
        child.stdin.write(`${commands[index++]}\n`);
      }
    });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); resolveSession({ code, stdout, stderr }); });
  });
}
const first = await session(['setup mock deterministic', 'doctor', 'task Windows 한글 검증', 'status', 'quit']);
await writeFile(resolve(base, 'reports/exe-smoke-first.json'), JSON.stringify(first, null, 2));
assert.equal(first.code, 0, first.stderr);
assert.match(first.stdout, /task=[0-9a-f-]{36}/);
assert.match(first.stdout, /Windows 한글 검증/);
assert.equal(first.stderr, '');
const second = await session(['tasks', 'quit']);
await writeFile(resolve(base, 'reports/exe-smoke-restart.json'), JSON.stringify(second, null, 2));
assert.equal(second.code, 0, second.stderr);
assert.match(second.stdout, /Windows 한글 검증/);
assert.equal(second.stderr, '');
const journal = await readFile(resolve(workspace, '.mindcraft/state.jsonl'), 'utf8');
assert.match(journal, /Windows 한글 검증/);
console.log(JSON.stringify({ pass: true, executable: exe, workspace, checks: ['bundled runtime with Node absent from PATH', 'Unicode and spaces in workspace argument', 'mock setup', 'task creation', 'status', 'clean exit', 'restart and persisted task'] }, null, 2));
