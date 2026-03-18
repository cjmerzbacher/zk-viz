#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { program } = require('commander');
const { buildGraph } = require('./parser');

// Load optional zk-viz.config.js from cwd
function loadConfig() {
  const cfgPath = path.join(process.cwd(), 'zk-viz.config.js');
  if (fs.existsSync(cfgPath)) {
    try { return require(cfgPath); } catch (e) {
      console.warn(`Warning: could not load zk-viz.config.js — ${e.message}`);
    }
  }
  return {};
}

function promptName() {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("What's your name? (the graph will be titled \"[Name]'s Notes\")\n> ", answer => {
      rl.close();
      resolve(answer.trim() || null);
    });
  });
}

program
  .name('zk-viz')
  .description('Force-directed graph visualization for Zettelkasten / Obsidian vaults')
  .version('0.1.0');

// ─── build ───────────────────────────────────────────────────────────────────
program
  .command('build <notes-dir>')
  .description('Parse notes and write graph.json')
  .option('-o, --output <file>', 'Output path for graph JSON', 'graph.json')
  .option('--link-mode <mode>', 'Link extraction mode: frontmatter | wikilinks | both')
  .option('--exclude <glob>', 'Glob pattern to exclude files')
  .action((notesDir, opts) => {
    const cfg = loadConfig();
    const linkMode = opts.linkMode || cfg.linkMode || 'both';
    const exclude  = opts.exclude  || cfg.exclude  || undefined;
    const output   = opts.output   || cfg.output   || 'graph.json';

    console.log(`Building graph from ${path.resolve(notesDir)} (link-mode: ${linkMode})`);
    const graph = buildGraph(notesDir, { linkMode, exclude });
    const outPath = path.resolve(output);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(graph, null, 2));
    console.log(`Built graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges → ${outPath}`);
  });

// ─── serve ────────────────────────────────────────────────────────────────────
program
  .command('serve <notes-dir>')
  .description('Start dev server with live reload')
  .option('-p, --port <number>', 'Port to listen on')
  .option('--link-mode <mode>', 'Link extraction mode: frontmatter | wikilinks | both')
  .option('--exclude <glob>', 'Glob pattern to exclude files')
  .option('--name <name>', 'Your name for the graph title')
  .action(async (notesDir, opts) => {
    const cfg = loadConfig();
    const port     = parseInt(opts.port || cfg.port || 3000, 10);
    const linkMode = opts.linkMode || cfg.linkMode || 'both';
    const exclude  = opts.exclude  || cfg.exclude  || undefined;
    const name     = opts.name || cfg.name || await promptName();

    const { createServer } = require('./server');
    createServer(notesDir, { port, linkMode, exclude, name });
  });

// ─── export ───────────────────────────────────────────────────────────────────
program
  .command('export <notes-dir>')
  .description('Export a self-contained static site')
  .option('-o, --output <dir>', 'Output directory', 'zk-viz-export')
  .option('--link-mode <mode>', 'Link extraction mode: frontmatter | wikilinks | both')
  .option('--exclude <glob>', 'Glob pattern to exclude files')
  .option('--name <name>', 'Your name for the graph title')
  .action(async (notesDir, opts) => {
    const cfg = loadConfig();
    const linkMode = opts.linkMode || cfg.linkMode || 'both';
    const exclude  = opts.exclude  || cfg.exclude  || undefined;
    const outDir   = path.resolve(opts.output || cfg.output || 'zk-viz-export');
    const name     = opts.name || cfg.name || await promptName();

    fs.mkdirSync(outDir, { recursive: true });

    // Build and write graph.json
    console.log(`Building graph from ${path.resolve(notesDir)} (link-mode: ${linkMode})`);
    const graph = buildGraph(notesDir, { linkMode, exclude });
    fs.writeFileSync(path.join(outDir, 'graph.json'), JSON.stringify(graph, null, 2));

    // Copy and patch public/ files
    const PUBLIC_DIR = path.join(__dirname, '..', 'public');

    // index.html: inject data-owner attribute
    const htmlSrc = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(htmlSrc)) {
      let html = fs.readFileSync(htmlSrc, 'utf8');
      if (name) {
        const escaped = name.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        html = html.replace('<body ', `<body data-owner="${escaped}" `);
      }
      fs.writeFileSync(path.join(outDir, 'index.html'), html);
    }

    // app.js: copy as-is
    const appSrc = path.join(PUBLIC_DIR, 'app.js');
    if (fs.existsSync(appSrc)) {
      fs.copyFileSync(appSrc, path.join(outDir, 'app.js'));
    }

    console.log(`Exported ${graph.nodes.length} nodes, ${graph.edges.length} edges → ${outDir}`);
    console.log(`Serve with: python3 -m http.server -d ${outDir} 8080`);
  });

program.parse(process.argv);
