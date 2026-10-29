import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { pages } from './pages.mjs';

process.chdir(path.resolve(import.meta.dirname, '..'));
const documents = new Map(await Promise.all(pages.map(async ({ file }) => [file, await readFile('dist/' + file, 'utf8')])));
const idsFor = html => [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const titles = new Set();
for (const [file, html] of documents) {
  assert(html.startsWith('<!doctype html>') && html.trimEnd().endsWith('</html>'), file + ': incomplete HTML');
  assert.equal((html.match(/<h1\b/g) || []).length, 1, file + ': one main heading');
  assert(html.includes('Built with Unison'), file + ': missing language attribution');
  assert(!html.includes('\uFFFD'), file + ': broken Unicode');
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  assert(title && !titles.has(title), file + ': title must be present and unique');
  titles.add(title);
  const canonical = 'https://wolfbreed1829.github.io/obsidian-legion/' + (file === 'index.html' ? '' : file);
  assert(html.includes('<link rel="canonical" href="' + canonical + '">'), file + ': canonical');
  const ids = idsFor(html);
  assert.equal(ids.length, new Set(ids).size, file + ': duplicate IDs');
  const current = [...html.matchAll(/<a href="([^"]+)" aria-current="page"/g)];
  assert.equal(current.length, file === 'index.html' ? 0 : 1, file + ': current navigation');
  if (current.length) assert.equal(current[0][1], file);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = match[1].replaceAll('&amp;', '&');
    const url = new URL(target, 'https://local.test/' + file);
    if (url.origin !== 'https://local.test') continue;
    const localFile = decodeURIComponent(url.pathname.slice(1));
    await access(path.join('dist', localFile));
    if (url.hash) {
      const destination = documents.get(localFile);
      assert(destination && idsFor(destination).includes(decodeURIComponent(url.hash.slice(1))), file + ': missing anchor ' + target);
    }
  }
  for (const match of html.matchAll(/aria-(?:controls|labelledby|describedby)="([^"]+)"/g)) {
    for (const id of match[1].split(/\s+/)) assert(ids.includes(id), file + ': missing accessible target ' + id);
  }
  const collective = file === 'collective.html';
  assert.equal((html.match(/role="tab"/g) || []).length, collective ? 3 : 0);
  assert.equal((html.match(/role="tabpanel"/g) || []).length, collective ? 3 : 0);
  assert.equal((html.match(/aria-selected="true"/g) || []).length, collective ? 1 : 0);
  assert.equal(html.includes('id="legionnaire-form"'), file === 'join.html', file + ': form belongs on signup page');
}
const home = documents.get('index.html');
assert(!/id="(?:manifesto|collective|build|join)"/.test(home), 'Home must not contain the old long-scroll sections.');
const signup = documents.get('join.html');
assert(signup.includes('action="https://obsidian-legion-enlistment.littlecrowsbe.chatgpt.site/api/applications" method="post"'), 'Signup service changed.');
for (const field of ['name', 'email', 'discipline', 'github', 'motivation', 'company', 'consent']) {
  assert(signup.includes('name="' + field + '"'), 'Missing signup field ' + field);
}
console.log('Five complete pages verified: unique metadata, navigation, assets, links, accessible controls, and signup service.');
