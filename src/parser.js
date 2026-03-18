'use strict';

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { minimatch } = require('minimatch');

/**
 * Extract [[wikilinks]] from markdown body.
 * Handles: [[note]], [[note|alias]], [[note#heading]], [[folder/note]]
 */
function extractWikilinks(body) {
  const re = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
  const links = [];
  let m;
  while ((m = re.exec(body)) !== null) {
    // Strip path prefix, normalize to lowercase
    const name = path.basename(m[1].trim()).toLowerCase();
    if (name) links.push(name);
  }
  return links;
}

/**
 * Extract inline #tags from markdown body (excluding frontmatter).
 * Returns lowercase tag strings without the # prefix.
 */
function extractInlineTags(body) {
  const re = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_-]*)/g;
  const tags = [];
  let m;
  while ((m = re.exec(body)) !== null) {
    tags.push(m[1].toLowerCase());
  }
  return tags;
}

/**
 * Parse a single .md file.
 * Returns { id, title, tags, date, source, author, body, _fmLinks, _wikiLinks }
 */
function parseNote(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  let data, content;
  try {
    ({ data, content } = matter(raw));
  } catch (e) {
    const msg = e.reason || e.message;
    console.warn(`  Warning: skipping "${path.basename(filePath)}" — invalid YAML frontmatter (${msg})`);
    return null;
  }

  const id = path.basename(filePath, '.md');

  let date = null;
  if (data.date) {
    date = data.date instanceof Date
      ? data.date.toISOString().split('T')[0]
      : String(data.date).split('T')[0];
  }

  const fmTags = Array.isArray(data.tags) ? data.tags.map(t => String(t).toLowerCase()) : [];
  const inlineTags = extractInlineTags(content);
  const tags = [...new Set([...fmTags, ...inlineTags])];

  const _fmLinks = Array.isArray(data.links) ? data.links : [];
  const _wikiLinks = extractWikilinks(content);

  return {
    id,
    title: data.title || id,
    tags,
    date,
    source: data.source || null,
    author: data.author || null,
    body: content.trim(),
    _fmLinks,
    _wikiLinks,
  };
}

/**
 * Recursively collect all .md files under a directory.
 */
function collectMdFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Build a graph from a notes directory.
 *
 * @param {string} notesDir  Absolute or relative path to folder of .md files
 * @param {object} opts
 * @param {string} opts.linkMode  'frontmatter' | 'wikilinks' | 'both' (default: 'both')
 * @param {string} opts.exclude   Glob pattern to exclude files (relative to notesDir)
 * @returns {{ nodes: object[], edges: object[] }}
 */
function buildGraph(notesDir, { linkMode = 'both', exclude } = {}) {
  const absDir = path.resolve(notesDir);
  const files = collectMdFiles(absDir).filter(f => {
    if (!exclude) return true;
    const rel = path.relative(absDir, f);
    return !minimatch(rel, exclude);
  });

  const notes = [];
  for (const f of files) {
    const note = parseNote(f);
    if (note) notes.push(note);
  }

  // Build a case-insensitive lookup: lowercased id → note
  const byId = new Map(notes.map(n => [n.id.toLowerCase(), n]));

  // Build node list — strip internal _fmLinks/_wikiLinks from output
  const nodes = notes.map(({ _fmLinks, _wikiLinks, ...rest }) => rest);

  // Build edges
  const seen = new Set();
  const edges = [];

  for (const note of notes) {
    let targets = [];
    if (linkMode === 'frontmatter' || linkMode === 'both') {
      targets.push(...note._fmLinks);
    }
    if (linkMode === 'wikilinks' || linkMode === 'both') {
      targets.push(...note._wikiLinks);
    }

    for (const rawTarget of targets) {
      const targetKey = rawTarget.toLowerCase();
      const targetNote = byId.get(targetKey);
      if (!targetNote) {
        console.warn(`  Warning: "${note.id}" links to unknown note "${rawTarget}"`);
        continue;
      }
      const key = [note.id, targetNote.id].sort().join('||');
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ source: note.id, target: targetNote.id });
      }
    }
  }

  return { nodes, edges };
}

module.exports = { extractWikilinks, parseNote, buildGraph };
