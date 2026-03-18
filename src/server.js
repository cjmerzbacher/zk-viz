'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { buildGraph } = require('./parser');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function createServer(notesDir, { port = 3000, linkMode = 'both', exclude, name } = {}) {
  let graph = buildGraph(notesDir, { linkMode, exclude });
  const sseClients = new Set();

  function rebuild() {
    try {
      graph = buildGraph(notesDir, { linkMode, exclude });
      console.log(`[zk-viz] Rebuilt: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
    } catch (e) {
      console.error('[zk-viz] Rebuild error:', e.message);
    }
    for (const res of sseClients) {
      res.write('data: reload\n\n');
    }
  }

  const watcher = chokidar.watch(path.join(path.resolve(notesDir), '**/*.md'), {
    ignoreInitial: true,
    persistent: true,
  });
  watcher.on('add', rebuild).on('change', rebuild).on('unlink', rebuild);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    if (url.pathname === '/graph.json') {
      const body = JSON.stringify(graph);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
      res.end(body);
      return;
    }

    if (url.pathname === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write(':\n\n'); // comment to flush
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    // Static files from public/
    if (url.pathname === '/' || url.pathname === '/index.html') {
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8', (err, html) => {
        if (err) { res.writeHead(500); res.end('Internal server error'); return; }
        if (name) {
          const escaped = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
          html = html.replace('<body ', `<body data-owner="${escaped}" `);
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      });
      return;
    }

    let filePath;
    if (url.pathname === '/app.js') {
      filePath = path.join(PUBLIC_DIR, 'app.js');
    } else {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(500); res.end('Internal server error'); return; }
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(data);
    });
  });

  server.listen(port, () => {
    console.log(`[zk-viz] Serving at http://localhost:${port}`);
    console.log(`[zk-viz] Watching ${path.resolve(notesDir)}`);
  });

  return server;
}

module.exports = { createServer };
