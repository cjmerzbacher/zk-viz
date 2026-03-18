(function () {
  'use strict';

  // ── Page title from data-owner ────────────────────────────────────────────
  var owner = document.body.dataset.owner;
  if (owner) {
    var titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = owner + "'s Notes";
    document.title = owner + "'s Notes — zk-viz";
  }

  // ── Theme toggle ──────────────────────────────────────────────────────────
  var root = document.documentElement;
  var btn  = document.getElementById('theme-toggle');
  function isDark() { return root.classList.contains('dark'); }
  if (!localStorage.getItem('theme')) {
    root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  btn.addEventListener('click', function () {
    var dark = isDark();
    root.classList.toggle('dark',  !dark);
    root.classList.toggle('light',  dark);
    localStorage.setItem('theme', isDark() ? 'dark' : 'light');
  });

  // ── Marked custom renderer ────────────────────────────────────────────────
  var notesDir = document.body.dataset.notesDir || './';
  var figCounter = 0;

  var imgRenderer = new marked.Renderer();
  imgRenderer.image = function (href, title, text) {
    var src_raw  = (typeof href === 'object' && href !== null) ? (href.href  || '') : (href  || '');
    var title_str = (typeof href === 'object' && href !== null) ? (href.title || title || '') : (title || '');
    var text_str  = (typeof href === 'object' && href !== null) ? (href.text  || text  || '') : (text  || '');
    var src = /^https?:\/\//.test(src_raw) ? src_raw : notesDir.replace(/\/?$/, '/') + src_raw;
    var caption = title_str ? '<figcaption>Fig. ' + (++figCounter) + ': ' + title_str + '</figcaption>' : '';
    return '<figure><img src="' + src + '" alt="' + text_str + '">' + caption + '</figure>';
  };
  imgRenderer.link = function (href, title, text) {
    var href_str  = (typeof href === 'object' && href !== null) ? (href.href  || '') : (href  || '');
    var title_str = (typeof href === 'object' && href !== null) ? (href.title || title || '') : (title || '');
    var text_str  = (typeof href === 'object' && href !== null) ? (href.text  || text  || '') : (text  || '');
    if (href_str && href_str.endsWith('.md')) {
      var id = href_str.split('/').pop().replace(/\.md$/, '');
      return '<a class="note-link" data-id="' + id + '">' + text_str + '</a>';
    }
    return '<a href="' + href_str + '"' + (title_str ? ' title="' + title_str + '"' : '') + ' target="_blank">' + text_str + '</a>';
  };
  marked.use({ renderer: imgRenderer });

  document.getElementById('note-view-body').addEventListener('click', function (e) {
    var link = e.target.closest('.note-link');
    if (!link || !selectById) return;
    selectById(link.dataset.id);
    document.getElementById('layout').scrollIntoView({ behavior: 'smooth' });
  });

  // ── DOM refs ──────────────────────────────────────────────────────────────
  var canvasEl   = document.getElementById('canvas');
  var panelEl    = document.getElementById('panel');
  var noteViewEl = document.getElementById('note-view');
  var noteListEl = document.getElementById('note-list-items');

  var selectById = null;

  // ── D3 graph ──────────────────────────────────────────────────────────────
  function initGraph(data) {
    var nodes = data.nodes.map(function (n) { return Object.assign({}, n); });
    var nodeIds = new Set(nodes.map(function (n) { return n.id; }));
    var edges = (data.edges || [])
      .filter(function (e) { return nodeIds.has(e.source) && nodeIds.has(e.target); })
      .map(function (e) { return Object.assign({}, e); });

    var W = canvasEl.clientWidth  || 600;
    var H = canvasEl.clientHeight || 400;

    var svg = d3.select('#svg').attr('viewBox', '0 0 ' + W + ' ' + H);
    var g   = svg.append('g');

    svg.call(d3.zoom().scaleExtent([0.2, 5]).on('zoom', function (e) {
      g.attr('transform', e.transform);
    }));

    var deg = {};
    edges.forEach(function (e) {
      deg[e.source] = (deg[e.source] || 0) + 1;
      deg[e.target] = (deg[e.target] || 0) + 1;
    });
    function r(d) { return 5 + (deg[d.id] || 0) * 2; }

    var sim = d3.forceSimulation(nodes)
      .force('link',    d3.forceLink(edges).id(function (d) { return d.id; }).distance(90))
      .force('charge',  d3.forceManyBody().strength(-260))
      .force('center',  d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide(function (d) { return r(d) + 10; }));

    var edgeSel = g.append('g')
      .selectAll('line').data(edges).join('line').attr('class', 'edge');

    var nodeSel = g.append('g')
      .selectAll('g').data(nodes).join('g').attr('class', 'node')
      .call(d3.drag()
        .on('start', function (e, d) { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  function (e, d) { d.fx = e.x; d.fy = e.y; })
        .on('end',   function (e, d) { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('click', function (_, d) { select(d); });

    nodeSel.append('circle').attr('r', r);
    nodeSel.append('text').text(function (d) { return d.title; }).attr('x', function (d) { return r(d) + 4; }).attr('y', 0);

    sim.on('tick', function () {
      edgeSel.attr('x1', function (d) { return d.source.x; }).attr('y1', function (d) { return d.source.y; })
             .attr('x2', function (d) { return d.target.x; }).attr('y2', function (d) { return d.target.y; });
      nodeSel.attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });
    });

    function select(d) {
      var neighbours = new Set();
      edges.forEach(function (e) {
        var s = e.source.id || e.source;
        var t = e.target.id || e.target;
        if (s === d.id) neighbours.add(t);
        if (t === d.id) neighbours.add(s);
      });

      nodeSel.selectAll('circle').classed('active', function (n) { return n.id === d.id; });
      nodeSel.selectAll('text').classed('active',   function (n) { return n.id === d.id; });
      edgeSel.classed('lit', function (e) {
        return (e.source.id || e.source) === d.id || (e.target.id || e.target) === d.id;
      });

      var tags   = (d.tags || []).map(function (t) { return '<span class="tag">#' + t + '</span>'; }).join('');
      var linked = Array.from(neighbours).join(', ');

      panelEl.innerHTML =
        '<h3>' + d.title + '</h3>' +
        (d.date   ? '<p class="meta">' + d.date + '</p>'     : '') +
        (d.source ? '<p class="meta">' + d.source + '</p>'   : '') +
        (d.author ? '<p class="meta">— ' + d.author + '</p>' : '') +
        (tags     ? '<p style="margin-top:calc(var(--line-height)/2)">' + tags + '</p>' : '') +
        (linked   ? '<p class="meta" style="margin-top:calc(var(--line-height)/2)">Links: ' + linked + '</p>' : '') +
        (d.body   ? '<a class="read-link" href="#note-view">read note ↓</a>' : '');

      document.getElementById('note-view-title').textContent = d.title;
      var meta = [d.date, d.source, d.author ? '— ' + d.author : null].filter(Boolean).join(' · ');
      document.getElementById('note-view-meta').textContent = meta;
      figCounter = 0;
      document.getElementById('note-view-body').innerHTML = d.body ? marked.parse(d.body) : '';
      noteViewEl.classList.toggle('visible', !!d.body);
    }

    selectById = function (id) {
      var node = nodes.find(function (n) { return n.id === id; });
      if (node) select(node);
    };
  }

  // ── Note list ─────────────────────────────────────────────────────────────
  function buildNoteList(nodes) {
    noteListEl.innerHTML = nodes.map(function (n) {
      var meta = [n.date, n.source].filter(Boolean).join(' · ');
      var tags = (n.tags || []).map(function (t) { return '<span class="tag">#' + t + '</span>'; }).join('');
      return '<div class="note-item" data-id="' + n.id + '">' +
        '<p class="note-item-title">' + n.title + '</p>' +
        (meta ? '<p class="note-item-meta">' + meta + '</p>' : '') +
        (tags ? '<p class="note-item-meta" style="margin-top:0.3rem">' + tags + '</p>' : '') +
        '</div>';
    }).join('');

    noteListEl.addEventListener('click', function (e) {
      var item = e.target.closest('.note-item');
      if (!item || !selectById) return;
      selectById(item.dataset.id);
      document.getElementById('layout').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // ── SSE live reload (localhost only) ──────────────────────────────────────
  var host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    var es = new EventSource('/events');
    es.onmessage = function (e) {
      if (e.data === 'reload') location.reload();
    };
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  fetch('./graph.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) { initGraph(data); buildNoteList(data.nodes); })
    .catch(function () {
      panelEl.innerHTML = '<p class="hint">No graph data found.<br>Run <code>zk-viz build</code> to generate graph.json.</p>';
    });
})();
