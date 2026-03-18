# zk-viz

Force-directed graph visualization for Zettelkasten notes and Obsidian vaults.

Point it at a folder of `.md` files and get an interactive, browser-based network graph — with live reload while you write.

---

## What it looks like

Nodes are notes. Edges are links between them. Click a node to read the note. The graph updates automatically when you save a file.

---

## Requirements

- Node.js 18 or later
- A folder of Markdown files (Obsidian vault, Zettelkasten, or any `.md` notes)

---

## Installation

```
npm install -g zk-viz
```

Or run without installing:

```
npx zk-viz serve ~/path/to/notes
```

---

## Usage

### Interactive dev server

```
zk-viz serve ~/path/to/notes
```

You'll be asked for your name — the graph will be titled **"[Your Name]'s Notes"**. Then open `http://localhost:3000`.

Pass `--name` to skip the prompt:

```
zk-viz serve ~/path/to/notes --name "Ada"
```

### Export a static site

Produces a self-contained folder you can host anywhere (GitHub Pages, Netlify, any static host):

```
zk-viz export ~/path/to/notes --output ./my-notes-site
```

Then serve it locally to verify:

```
python3 -m http.server -d ./my-notes-site 8080
```

### Build graph data only

```
zk-viz build ~/path/to/notes --output graph.json
```

Writes `graph.json` for use with your own frontend.

---

## Options

| Flag | Default | Description |
|---|---|---|
| `--name <name>` | prompted | Your name for the graph title |
| `--port <number>` | `3000` | Dev server port (`serve` only) |
| `--output <path>` | `graph.json` / `zk-viz-export` | Output file or directory |
| `--link-mode <mode>` | `both` | How to detect links (see below) |
| `--exclude <glob>` | — | Glob pattern for files to skip |

### Link modes

| Mode | Works with |
|---|---|
| `wikilinks` | Obsidian vaults — detects `[[linked note]]` syntax in note body |
| `frontmatter` | Zettelkasten with `links:` YAML frontmatter arrays |
| `both` | Either format, or both at once (default) |

### Obsidian example

```
zk-viz serve ~/Documents/my-obsidian-vault --link-mode wikilinks
```

### Zettelkasten example

```
zk-viz serve ~/notes/zettelkasten --link-mode frontmatter
```

---

## Note format

### Obsidian / wikilinks

Any standard Obsidian note works as-is. Links are extracted from `[[...]]` syntax:

```markdown
---
title: Emergence
tags: [complexity, systems]
---

Emergence relates to [[weak-emergence]] and [[self-organisation]].
```

### Frontmatter links

```markdown
---
title: Emergence
tags: [complexity, systems]
links: [weak-emergence, self-organisation]
date: 2024-03-01
source: Philip Anderson (1972)
author: Your Name
---

Note body here.
```

Supported frontmatter fields: `title`, `tags`, `links`, `date`, `source`, `author`.

---

## Config file

Create `zk-viz.config.js` in your working directory to set defaults:

```js
module.exports = {
  linkMode: 'wikilinks',
  name: 'Ada',
  port: 4000,
};
```

CLI flags always override config file values.

---

## Library usage

Use the parser directly in your own scripts:

```js
const { buildGraph, parseNote } = require('zk-viz');

const graph = buildGraph('./notes', { linkMode: 'both' });
console.log(graph.nodes.length, 'notes');
console.log(graph.edges.length, 'connections');
```

---

## License

MIT
