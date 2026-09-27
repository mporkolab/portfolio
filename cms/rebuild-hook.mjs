/**
 * The endpoint Directus calls when a project is saved: it runs cms/rebuild.sh.
 *
 * Binds to 127.0.0.1 only, so it is reachable from the Directus container over
 * the host gateway and from nothing else — it is not something to put behind
 * the tunnel. It also wants a shared secret, so that anything else that ends up
 * talking to localhost cannot trigger builds.
 *
 *   REBUILD_TOKEN=<secret> node cms/rebuild-hook.mjs
 *
 * Run it as a systemd service (or a launchd job) so it comes back with the box.
 */

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.REBUILD_TOKEN;
const PORT = Number(process.env.REBUILD_PORT ?? 9009);
/** Ten saves in a row should mean one rebuild, not ten. */
const DEBOUNCE_MS = Number(process.env.REBUILD_DEBOUNCE_MS ?? 15_000);

if (!TOKEN) {
  console.error('REBUILD_TOKEN is not set; refusing to start an unprotected trigger');
  process.exit(1);
}

let running = false;
/** A save that arrived while a build was running: rebuild once more after it. */
let pending = false;
let timer = null;

function build() {
  if (running) {
    pending = true;
    console.log('build already running; queued one more');
    return;
  }
  running = true;
  const child = spawn('bash', [join(HERE, 'rebuild.sh')], { stdio: 'inherit' });
  child.on('exit', (code) => {
    running = false;
    console.log(`rebuild exited ${code}`);
    if (pending) {
      pending = false;
      schedule();
    }
  });
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(build, DEBOUNCE_MS);
  console.log(`rebuild scheduled in ${DEBOUNCE_MS}ms`);
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method !== 'POST' || url.pathname !== '/rebuild') {
    res.writeHead(404).end('not found\n');
    return;
  }
  const given = req.headers['x-rebuild-token'];
  if (given !== TOKEN) {
    console.warn('rejected a trigger with a bad token');
    res.writeHead(401).end('unauthorized\n');
    return;
  }
  // Answer at once: Directus should not sit waiting for an image build.
  res.writeHead(202).end('queued\n');
  req.resume();
  schedule();
}).listen(PORT, '127.0.0.1', () => {
  console.log(`rebuild hook listening on http://127.0.0.1:${PORT}/rebuild`);
});
