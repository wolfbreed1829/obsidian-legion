import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import path from 'node:path';

process.chdir(path.resolve(import.meta.dirname, '..'));
await mkdir('.ucm', { recursive: true });
await mkdir('dist', { recursive: true });
const source = await readFile('src/site.u', 'utf8');
// A transcript is UCM's native, scriptable build interface. The .u file
// is actually typechecked and compiled; Node only orchestrates and copies assets.
const transcript = [
  '```ucm',
  'obsidian-legion/main> lib.install @unison/base',
  '```',
  '```unison', source, '```',
  '```ucm',
  'obsidian-legion/main> update',
  'obsidian-legion/main> compile legion.main .ucm/site',
  '```', ''
].join('\n');
await writeFile('.ucm/build.md', transcript);

function ucm(args) {
  const windows = process.platform === 'win32';
  // All arguments below are fixed build paths/commands. Code page 65001 is
  // necessary for UCM's Unicode output on Windows, including redirected output.
  const result = windows
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'chcp 65001 >nul && ucm ' + args.join(' ')], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
    : spawnSync('ucm', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    process.stderr.write(result.stderr || '');
    process.stderr.write(result.stdout || '');
    throw result.error || new Error(`UCM exited with status ${result.status}`);
  }
  return result.stdout.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}
console.log('Typechecking and compiling src/site.u with Unison...');
ucm(['-C', '.ucm', 'transcript.in-place', '.ucm/build.md']);
const html = ucm(['run.compiled', '.ucm/site.uc']).trim();
if (!html.startsWith('<!doctype html>') || !html.endsWith('</html>')) {
  throw new Error('The Unison program did not emit a complete HTML document.');
}
await cp('public', 'dist', { recursive: true });
await writeFile('dist/index.html', html + '\n');
console.log(`Built dist/index.html from Unison (${Buffer.byteLength(html)} bytes).`);
