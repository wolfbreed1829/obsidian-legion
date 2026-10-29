import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const html = await readFile('dist/index.html', 'utf8');
assert(html.startsWith('<!doctype html>'), 'Output must be HTML, not compiler logs.');
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'Use one main heading.');
assert(html.includes('Built with Unison'), 'Missing language attribution.');
assert(!html.includes('\uFFFD'), 'Output has broken Unicode.');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size, 'Duplicate element IDs.');
for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const target = match[1];
  if (target === '#') continue;
  if (target.startsWith('#')) assert(ids.includes(target.slice(1)), `Missing anchor ${target}`);
  else if (!target.startsWith('https://')) await access(path.join('dist', target));
}
for (const match of html.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)) {
  assert(ids.includes(match[1]), `Missing accessible control target ${match[1]}`);
}
assert.equal((html.match(/role="tab"/g) || []).length, 3);
assert.equal((html.match(/role="tabpanel"/g) || []).length, 3);
assert.equal((html.match(/aria-selected="true"/g) || []).length, 1);
console.log('Generated HTML, local assets, anchors, and accessible tab relationships verified.');
