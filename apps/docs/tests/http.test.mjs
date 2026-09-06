import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const appRoot = fileURLToPath(new URL('../', import.meta.url));
const packages = ['store', 'state', 'form', 'overlay', 'modal', 'toast', 'utilinent', 'fetcher'];
let server;
let origin;

before(async () => {
  await new Promise((resolve, reject) => {
    server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', '0'], {
      cwd: appRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let log = '';
    const timeout = setTimeout(() => reject(new Error(`Docs server did not start:\n${log}`)), 20_000);
    server.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Docs server exited with ${code}:\n${log}`));
    });
    const onData = (chunk) => {
      log += chunk.toString();
      const address = log.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (address && log.includes('Ready in')) {
        origin = address[0];
        clearTimeout(timeout);
        resolve();
      }
    };
    server.stdout.on('data', onData);
    server.stderr.on('data', onData);
  });
});

after(async () => {
  if (!server || server.exitCode !== null) return;
  await new Promise((resolve) => {
    server.once('exit', resolve);
    server.kill('SIGTERM');
  });
});

const request = (path) => fetch(`${origin}${path}`, { signal: AbortSignal.timeout(10_000) });

test('every canonical bilingual page is served from the production build', async () => {
  const routes = [];
  for (const name of packages) {
    const files = await readdir(new URL(`../../../packages/${name}/docs/`, import.meta.url), { recursive: true });
    for (const file of files.filter((file) => file.endsWith('.mdx'))) {
      const lang = file.endsWith('.ko.mdx') ? 'ko' : 'en';
      const slug = file.replace(/(?:\.ko)?\.mdx$/, '').replace(/(^|\/)index$/, '');
      routes.push(`/${lang}/${name}/${slug}`.replace(/\/$/, ''));
    }
  }
  for (let offset = 0; offset < routes.length; offset += 12) {
    await Promise.all(routes.slice(offset, offset + 12).map(async (route) => {
      const response = await request(route);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get('content-type'), /text\/html/);
      await response.arrayBuffer();
    }));
  }
}, { timeout: 30_000 });

test('home navigation and search expose every package in both languages', async () => {
  for (const lang of ['en', 'ko']) {
    const home = await (await request(`/${lang}`)).text();
    for (const name of packages) {
      assert.ok(home.includes(`href="/${lang}/${name}"`), `${lang}/${name}`);
    }
    const response = await request(`/api/search?query=store&locale=${lang}`);
    assert.equal(response.status, 200);
    const results = await response.json();
    assert.ok(results.length > 0);
    assert.ok(results.every((result) => result.url.startsWith(`/${lang}/`)));
  }
});

test('Markdown and image handlers preserve the requested locale without redirects', async () => {
  for (const lang of ['en', 'ko']) {
    const markdownPath = `/llms.mdx/docs/${lang}/store/content.md`;
    const markdown = await request(markdownPath);
    assert.equal(markdown.status, 200);
    assert.equal(markdown.url, origin + markdownPath);
    assert.match(markdown.headers.get('content-type'), /text\/markdown/);
    assert.ok((await markdown.text()).includes(`(/${lang}/store)`));
    const image = await request(`/og/docs/${lang}/store/image.webp`);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/webp');
    assert.ok((await image.arrayBuffer()).byteLength > 0);
  }
  for (const path of ['/llms.txt', '/llms-full.txt']) {
    const response = await request(path);
    assert.equal(response.status, 200);
    assert.equal(response.url, origin + path);
    assert.match(response.headers.get('content-type'), /text\/plain/);
    await response.arrayBuffer();
  }
});
