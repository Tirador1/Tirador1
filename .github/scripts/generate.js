const fs = require('fs');
const path = require('path');

const USERNAME = 'Tirador1';
const TOKEN = process.env.GITHUB_TOKEN;

// ── Color Palette ──────────────────────────────────────────
const C = {
  bg:       '#0d1117',
  card:     '#161b22',
  border:   '#30363d',
  cyan:     '#00f0ff',
  purple:   '#bc8cff',
  orange:   '#f97316',
  green:    '#3fb950',
  red:      '#f85149',
  text:     '#e6edf3',
  muted:    '#6e7681',
  // Contribution levels (cyan palette)
  c0: '#161b22',
  c1: '#003845',
  c2: '#006d80',
  c3: '#00a6bf',
  c4: '#00f0ff',
  // Language colors (harmonious set)
  lang: {
    JavaScript:  '#f97316',
    TypeScript:  '#3b82f6',
    HTML:        '#ef4444',
    CSS:         '#a855f7',
    Python:      '#22c55e',
    Java:        '#eab308',
    Shell:       '#6ee7b7',
    Ruby:        '#f43f5e',
    Go:          '#06b6d4',
    PHP:         '#8b5cf6',
    'C#':        '#10b981',
    'C++':       '#6366f1',
    C:           '#64748b',
    Kotlin:      '#f59e0b',
    Swift:       '#f472b6',
    Rust:        '#fb923c',
    Dart:        '#38bdf8',
    Vue:         '#34d399',
    SCSS:        '#e879f9',
    Jupyter:     '#f97316',
    Other:       '#6e7681',
  },
};

const FONT = "ui-monospace, 'Cascadia Code', 'Fira Code', 'Courier New', monospace";

// ── GitHub GraphQL API ─────────────────────────────────────
async function fetchData() {
  const query = `query($user: String!) {
    user(login: $user) {
      name
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        totalPullRequestReviewContributions
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
              weekday
            }
          }
        }
      }
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: STARGAZERS, direction: DESC}) {
        totalCount
        nodes {
          stargazerCount
          primaryLanguage { name }
          languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
            edges {
              size
              node { name color }
            }
          }
        }
      }
      pullRequests(first: 1) { totalCount }
      issues(first: 1) { totalCount }
      followers { totalCount }
      following { totalCount }
      repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, PULL_REQUEST]) { totalCount }
    }
  }`;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'profile-generator',
    },
    body: JSON.stringify({ query, variables: { user: USERNAME } }),
  });

  const json = await res.json();
  if (json.errors) {
    console.error('GraphQL errors:', JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }
  return json.data.user;
}

// ── Stats SVG ──────────────────────────────────────────────
function generateStats(user) {
  const cc = user.contributionsCollection;
  const stars = user.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0);

  const metrics = [
    { label: 'Total Commits',    value: cc.totalCommitContributions,      icon: 'M3 2.5a2.5 2.5 0 015 0 2.5 2.5 0 01-5 0zM1.5 7.5a1.5 1.5 0 013 0v5a1.5 1.5 0 01-3 0v-5zm5 0a1.5 1.5 0 013 0v5a1.5 1.5 0 01-3 0v-5z', color: C.cyan },
    { label: 'Pull Requests',    value: user.pullRequests.totalCount,     icon: 'M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354z', color: C.purple },
    { label: 'Issues',           value: user.issues.totalCount,           icon: 'M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z', color: C.green },
    { label: 'Stars Earned',     value: stars,                            icon: 'M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z', color: C.orange },
    { label: 'Repositories',     value: user.repositories.totalCount,     icon: 'M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9z', color: C.red },
    { label: 'Contributed To',   value: user.repositoriesContributedTo.totalCount, icon: 'M1.5 3.25a2.25 2.25 0 013 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25z', color: '#3b82f6' },
  ];

  const W = 850, H = 195;
  const cardW = 125, cardH = 100, gap = 12;
  const totalW = metrics.length * cardW + (metrics.length - 1) * gap;
  const startX = (W - totalW) / 2;

  let cards = '';
  metrics.forEach((m, i) => {
    const x = startX + i * (cardW + gap);
    const y = 55;
    const delay = (i * 0.15).toFixed(2);
    cards += `
    <g class="metric" style="animation-delay:${delay}s">
      <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="10" fill="${C.card}" stroke="${m.color}22" stroke-width="1"/>
      <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="10" fill="none" stroke="${m.color}" stroke-width="1" opacity="0.15"/>
      <text x="${x + cardW/2}" y="${y + 42}" text-anchor="middle" fill="${m.color}" font-family="${FONT}" font-size="26" font-weight="bold">${m.value.toLocaleString()}</text>
      <text x="${x + cardW/2}" y="${y + 65}" text-anchor="middle" fill="${C.muted}" font-family="${FONT}" font-size="10">${m.label}</text>
      <circle cx="${x + cardW/2}" cy="${y + 82}" r="3" fill="${m.color}" opacity="0.6"/>
    </g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <style>
    @keyframes metricIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    .metric { opacity:0; animation: metricIn 0.5s ease forwards; }
    .title { fill:${C.text}; font-family:${FONT}; font-size:16px; font-weight:bold; letter-spacing:1px; }
    .subtitle { fill:${C.muted}; font-family:${FONT}; font-size:11px; }
  </style>
  <rect width="${W}" height="${H}" rx="12" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>
  <text class="title" x="${W/2}" y="28" text-anchor="middle">GitHub Activity</text>
  <text class="subtitle" x="${W/2}" y="43" text-anchor="middle">Contributions &amp; engagement metrics</text>
  ${cards}
</svg>`;
}

// ── Languages SVG (Donut Chart + Legend) ───────────────────
function generateLanguages(user) {
  const langMap = {};
  user.repositories.nodes.forEach(repo => {
    repo.languages.edges.forEach(edge => {
      langMap[edge.node.name] = (langMap[edge.node.name] || 0) + edge.size;
    });
  });

  const sorted = Object.entries(langMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  const langs = sorted.map(([name, bytes]) => ({
    name,
    pct: ((bytes / total) * 100).toFixed(1),
    color: C.lang[name] || C.lang.Other,
  }));

  const W = 850, H = 280;
  // Donut params
  const donutCx = 200, donutCy = 160, R = 85, strokeW = 22;
  const circumference = 2 * Math.PI * R;

  // Build donut segments
  let donutSegs = '';
  let offset = 0;
  langs.forEach((l, i) => {
    const segLen = (parseFloat(l.pct) / 100) * circumference;
    const gap = 4; // gap between segments
    const actualLen = Math.max(0, segLen - gap);
    const delay = (i * 0.15).toFixed(2);
    donutSegs += `<circle cx="${donutCx}" cy="${donutCy}" r="${R}" fill="none" ` +
      `stroke="${l.color}" stroke-width="${strokeW}" ` +
      `stroke-dasharray="${actualLen} ${circumference - actualLen}" ` +
      `stroke-dashoffset="${-offset}" ` +
      `transform="rotate(-90 ${donutCx} ${donutCy})" ` +
      `class="seg" style="animation-delay:${delay}s"/>\n`;
    offset += segLen;
  });

  // Center text
  const totalPct = langs.reduce((s, l) => s + parseFloat(l.pct), 0).toFixed(0);

  // Legend (right side)
  let legend = '';
  const legX = 400, legStartY = 75;
  const legLineH = 32;
  langs.forEach((l, i) => {
    const y = legStartY + i * legLineH;
    const delay = (i * 0.12).toFixed(2);
    // Color dot
    legend += `<g class="leg" style="animation-delay:${delay}s">`;
    legend += `<rect x="${legX}" y="${y - 8}" width="12" height="12" rx="3" fill="${l.color}"/>`;
    legend += `<text x="${legX + 22}" y="${y + 3}" fill="${C.text}" font-family="${FONT}" font-size="13">${l.name}</text>`;
    // Percentage bar (mini)
    const barW = 180;
    const bw = (parseFloat(l.pct) / 100) * barW;
    legend += `<rect x="${legX + 150}" y="${y - 4}" width="${barW}" height="8" rx="4" fill="${C.card}"/>`;
    legend += `<rect x="${legX + 150}" y="${y - 4}" width="${bw}" height="8" rx="4" fill="${l.color}" class="minibar" style="animation-delay:${(i * 0.12 + 0.3).toFixed(2)}s"/>`;
    legend += `<text x="${legX + 150 + barW + 12}" y="${y + 3}" fill="${l.color}" font-family="${FONT}" font-size="12" font-weight="bold">${l.pct}%</text>`;
    legend += `</g>\n`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<style>
  @keyframes segGrow{from{stroke-dasharray:0 ${circumference.toFixed(1)}}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes barIn{from{width:0}}
  .seg{animation:segGrow 1s ease forwards}
  .leg{opacity:0;animation:fadeUp .4s ease forwards}
  .minibar{animation:barIn .6s ease forwards}
  .title{fill:${C.text};font-family:${FONT};font-size:16px;font-weight:bold;letter-spacing:1px;text-anchor:middle}
  .sub{fill:${C.muted};font-family:${FONT};font-size:11px;text-anchor:middle}
  .center-num{fill:${C.cyan};font-family:${FONT};font-size:28px;font-weight:bold;text-anchor:middle}
  .center-lbl{fill:${C.muted};font-family:${FONT};font-size:10px;text-anchor:middle}
</style>
<rect width="${W}" height="${H}" rx="12" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>
<text class="title" x="${W/2}" y="28">Languages</text>
<text class="sub" x="${W/2}" y="44">By repository composition</text>
<!-- Donut background -->
<circle cx="${donutCx}" cy="${donutCy}" r="${R}" fill="none" stroke="${C.card}" stroke-width="${strokeW}"/>
${donutSegs}
<!-- Center label -->
<text class="center-num" x="${donutCx}" y="${donutCy + 4}">${langs.length}</text>
<text class="center-lbl" x="${donutCx}" y="${donutCy + 18}">languages</text>
<!-- Legend -->
${legend}
</svg>`;
}

// ── Snake SVG ──────────────────────────────────────────────
function generateSnake(user) {
  const weeks = user.contributionsCollection.contributionCalendar.weeks;
  const W = 850;
  const cellSize = 11, gapSize = 3, step = cellSize + gapSize;
  const cols = weeks.length;
  const rows = 7;
  const gridW = cols * step - gapSize;
  const gridH = rows * step - gapSize;
  const ox = Math.floor((W - gridW) / 2);
  const oy = 50;
  const H = oy + gridH + 35;
  const cellColors = [C.c0, C.c1, C.c2, C.c3, C.c4];
  const half = cellSize / 2;

  // ── Build grid ──
  const grid = Array.from({ length: cols }, () => Array(rows).fill(null));
  const targets = [];
  for (let w = 0; w < cols; w++) {
    for (let d = 0; d < rows; d++) {
      const day = weeks[w]?.contributionDays?.[d];
      const count = day?.contributionCount || 0;
      const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 8 ? 3 : 4;
      grid[w][d] = { w, d, level };
      if (level > 0) targets.push({ w, d, level });
    }
  }

  // ── Seeded PRNG (mulberry32) for deterministic random selection ──
  function mulberry32(seed) {
    let s = seed | 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const totalContribs = user.contributionsCollection.contributionCalendar.totalContributions;
  const rng = mulberry32(totalContribs || 42);

  const key = (w, d) => `${w},${d}`;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // ── Naive fallback walk (Manhattan) ──
  function walkBetweenNaive(from, to) {
    const moves = [];
    let { w, d } = from;
    while (w !== to.w) { w += w < to.w ? 1 : -1; moves.push({ w, d }); }
    while (d !== to.d) { d += d < to.d ? 1 : -1; moves.push({ w, d }); }
    return moves;
  }

  // ── BFS shortest path: returns first step toward target, or null ──
  // Blocks: body + uneaten targets (except the target itself)
  function bfsFirstStep(from, to, blocked) {
    if (from.w === to.w && from.d === to.d) return null;
    const visited = new Set([key(from.w, from.d)]);
    const queue = [[from.w, from.d]];
    const parent = new Map();

    while (queue.length > 0) {
      const [cw, cd] = queue.shift();
      for (const [dw, dd] of dirs) {
        const nw = cw + dw, nd = cd + dd;
        const nk = key(nw, nd);
        if (nw < 0 || nw >= cols || nd < 0 || nd >= rows) continue;
        if (visited.has(nk)) continue;
        if (blocked.has(nk) && !(nw === to.w && nd === to.d)) continue;
        visited.add(nk);
        parent.set(nk, [cw, cd]);
        if (nw === to.w && nd === to.d) {
          // Trace back to find the first step from `from`
          let c = [nw, nd];
          while (true) {
            const pk = parent.get(key(c[0], c[1]));
            if (!pk || (pk[0] === from.w && pk[1] === from.d)) break;
            c = pk;
          }
          return { w: c[0], d: c[1] };
        }
        queue.push([nw, nd]);
      }
    }
    return null;
  }

  // ── Flood-fill: find all reachable target keys from position ──
  function findReachableTargets(from, bodySet, uneatenSet) {
    const visited = new Set([key(from.w, from.d)]);
    const queue = [[from.w, from.d]];
    const reachable = [];
    while (queue.length > 0) {
      const [cw, cd] = queue.shift();
      for (const [dw, dd] of dirs) {
        const nw = cw + dw, nd = cd + dd;
        const nk = key(nw, nd);
        if (nw < 0 || nw >= cols || nd < 0 || nd >= rows) continue;
        if (visited.has(nk)) continue;
        if (bodySet.has(nk)) continue;
        if (uneatenSet.has(nk)) {
          visited.add(nk);
          reachable.push(nk);
          continue; // don't walk through uneaten targets
        }
        visited.add(nk);
        queue.push([nw, nd]);
      }
    }
    return reachable;
  }

  // ── Count walkable cells reachable from position (for lookahead) ──
  function countReachable(from, bodySet, uneatenSet) {
    const visited = new Set([key(from.w, from.d)]);
    const queue = [[from.w, from.d]];
    let count = 0;
    while (queue.length > 0) {
      const [cw, cd] = queue.shift();
      for (const [dw, dd] of dirs) {
        const nw = cw + dw, nd = cd + dd;
        const nk = key(nw, nd);
        if (nw < 0 || nw >= cols || nd < 0 || nd >= rows) continue;
        if (visited.has(nk)) continue;
        if (bodySet.has(nk) || uneatenSet.has(nk)) continue;
        visited.add(nk);
        count++;
        queue.push([nw, nd]);
      }
    }
    return count;
  }

  // ── Compute body set from last bodyLength positions in path ──
  function getBodySet(pathArr, bLen) {
    const s = new Set();
    for (let b = Math.max(0, pathArr.length - bLen); b < pathArr.length; b++) {
      s.add(key(pathArr[b].w, pathArr[b].d));
    }
    return s;
  }

  const startPos = { w: 0, d: rows - 1 };
  const PAUSE_FRAMES = 1; // 0.1s pause at each target

  // Initial padding so body segments start gathered at startPos
  const INIT_PAD = 5;
  const fullPath = [];
  for (let i = 0; i < INIT_PAD; i++) fullPath.push({ ...startPos });

  let cur = { ...startPos };
  const eatStepMap = {};
  const uneaten = new Set(targets.map(t => key(t.w, t.d)));
  const targetMap = {};
  targets.forEach(t => { targetMap[key(t.w, t.d)] = t; });
  const eaten = [];
  let bodyLength = 0;

  // ── Main loop: pick target, walk step-by-step with perfect body tracking ──
  let currentTarget = null;
  let failCount = 0;
  const MAX_TOTAL_STEPS = cols * rows * 20; // safety limit

  while (uneaten.size > 0 && fullPath.length < MAX_TOTAL_STEPS) {
    // Pick a new target if we don't have one
    if (!currentTarget) {
      const bodySet = getBodySet(fullPath, bodyLength);
      const reachable = findReachableTargets(cur, bodySet, uneaten);
      if (reachable.length === 0) break;

      // Lookahead: for each candidate, check how much space remains after eating it
      // Prefer targets that leave the most open space (avoid dead ends)
      let bestScore = -1;
      const scored = [];
      for (const tKey of reachable) {
        const [tw, td] = tKey.split(',').map(Number);
        // Quick heuristic: count walkable neighbors of target after eating it
        // (the target itself becomes walkable once eaten)
        const simUneaten = new Set(uneaten);
        simUneaten.delete(tKey);
        let openNeighbors = 0;
        for (const [dw, dd] of dirs) {
          const nw = tw + dw, nd = td + dd;
          if (nw < 0 || nw >= cols || nd < 0 || nd >= rows) continue;
          const nk = key(nw, nd);
          if (!simUneaten.has(nk) && !bodySet.has(nk)) openNeighbors++;
        }
        scored.push({ key: tKey, score: openNeighbors });
        if (openNeighbors > bestScore) bestScore = openNeighbors;
      }

      // Filter to targets with good scores (at least half of best)
      const goodTargets = scored.filter(s => s.score >= Math.max(1, bestScore - 1));
      const pool = goodTargets.length > 0 ? goodTargets : scored;
      currentTarget = pool[Math.floor(rng() * pool.length)].key;
      failCount = 0;
    }

    // Build blocked set: body + uneaten targets (except current target)
    const bodySet = getBodySet(fullPath, bodyLength);
    const blocked = new Set(bodySet);
    for (const uk of uneaten) {
      if (uk !== currentTarget) blocked.add(uk);
    }

    const [tw, td] = currentTarget.split(',').map(Number);
    const target = { w: tw, d: td };

    // Are we already at the target?
    if (cur.w === target.w && cur.d === target.d) {
      eatStepMap[currentTarget] = fullPath.length - 1;
      for (let p = 0; p < PAUSE_FRAMES; p++) fullPath.push({ ...cur });
      uneaten.delete(currentTarget);
      eaten.push(targetMap[currentTarget]);
      bodyLength++;
      currentTarget = null;
      continue;
    }

    // Take one step toward target
    const nextStep = bfsFirstStep(cur, target, blocked);
    if (nextStep) {
      fullPath.push(nextStep);
      cur = { w: nextStep.w, d: nextStep.d };
      failCount = 0;
    } else {
      // Can't reach target from here — abandon it, try another
      currentTarget = null;
      failCount++;
      if (failCount > uneaten.size + 5) break; // truly stuck
    }
  }

  // ── Return to start for infinite loop (step-by-step) ──
  let returnSteps = 0;
  const MAX_RETURN = cols * rows * 2;
  while (!(cur.w === startPos.w && cur.d === startPos.d) && returnSteps < MAX_RETURN) {
    const bodySet = getBodySet(fullPath, bodyLength);
    const blocked = new Set(bodySet);
    for (const uk of uneaten) blocked.add(uk);
    const nextStep = bfsFirstStep(cur, startPos, blocked);
    if (nextStep) {
      fullPath.push(nextStep);
      cur = { w: nextStep.w, d: nextStep.d };
    } else {
      // Fallback: naive walk ignoring body
      fullPath.push(...walkBetweenNaive(cur, startPos));
      cur = { ...startPos };
      break;
    }
    returnSteps++;
  }
  // End padding so all body segments gather at start before loop
  const endPad = Math.max(INIT_PAD, eaten.length);
  for (let i = 0; i < endPad; i++) fullPath.push({ ...startPos });

  const totalSteps = fullPath.length;
  const stepDur = 0.10;
  const duration = totalSteps * stepDur;
  const pctPerStep = 100 / totalSteps;

  // ── Helper: compress a path into direction-change keyframes ──
  function compressPath(pathArr) {
    const out = [{ idx: 0, w: pathArr[0].w, d: pathArr[0].d }];
    for (let i = 1; i < pathArr.length; i++) {
      const prev = pathArr[i - 1], curr = pathArr[i], next = pathArr[i + 1];
      if (!next ||
          (curr.w - prev.w) !== (next.w - curr.w) ||
          (curr.d - prev.d) !== (next.d - curr.d)) {
        out.push({ idx: i, w: curr.w, d: curr.d });
      }
    }
    return out;
  }

  // ── Single movement keyframe (head path) — all segments share it ──
  const headCompressed = compressPath(fullPath);
  let moveKf = '@keyframes snakeMove{';
  headCompressed.forEach(p => {
    const pct = (p.idx * pctPerStep).toFixed(3);
    moveKf += `${pct}%{transform:translate(${ox + p.w * step}px,${oy + p.d * step}px)}`;
  });
  moveKf += `100%{transform:translate(${ox + startPos.w * step}px,${oy + startPos.d * step}px)}`;
  moveKf += '}\n';

  // ── Growth keyframes: each segment appears when Nth cell is eaten ──
  const numSegs = eaten.length;
  const eatPctsSorted = eaten
    .map(t => eatStepMap[key(t.w, t.d)])
    .filter(s => s !== undefined)
    .sort((a, b) => a - b)
    .map(s => (s * pctPerStep).toFixed(3));

  // Compute when the body should fade (near end, before loop reset)
  const fadeStartPct = (90).toFixed(1);
  const fadeDonePct = (96).toFixed(1);
  // Compute when cells should respawn
  const respawnPct = (93).toFixed(1);
  const respawnDonePct = (97).toFixed(1);

  let growKf = '';
  for (let seg = 1; seg <= numSegs; seg++) {
    const eatIdx = seg - 1;
    const baseOpacity = Math.max(0.2, 1 - (seg / numSegs) * 0.8).toFixed(2);
    const showPct = eatPctsSorted[eatIdx];
    const showDone = Math.min(parseFloat(showPct) + 0.3, 98).toFixed(3);
    growKf += `@keyframes g${seg}{` +
      `0%,${showPct}%{opacity:0}` +
      `${showDone}%{opacity:${baseOpacity}}` +
      `${fadeStartPct}%{opacity:${baseOpacity}}` +
      `${fadeDonePct}%{opacity:0}` +
      `100%{opacity:0}` +
      `}\n`;
  }

  // ── Cell eat keyframes ──
  let eatKf = '';
  targets.forEach(t => {
    const k = key(t.w, t.d);
    const eatStep = eatStepMap[k];
    if (eatStep === undefined) return;
    const eatPct = (eatStep * pctPerStep).toFixed(3);
    const flashPct = Math.min(parseFloat(eatPct) + 0.2, 98).toFixed(3);
    const gonePct = Math.min(parseFloat(flashPct) + 0.3, 98).toFixed(3);
    const color = cellColors[t.level];
    const respawnStart = respawnPct;
    const respawnDone = respawnDonePct;
    eatKf += `@keyframes e${t.w}_${t.d}{` +
      `0%,${eatPct}%{fill:${color};transform:scale(1);opacity:1}` +
      `${flashPct}%{fill:${C.cyan};transform:scale(1.4);opacity:1}` +
      `${gonePct}%{fill:${C.c0};transform:scale(1);opacity:1}` +
      `${respawnStart}%{fill:${C.c0};transform:scale(1);opacity:1}` +
      `${respawnDone}%{fill:${color};transform:scale(1);opacity:1}` +
      `100%{fill:${color};transform:scale(1);opacity:1}` +
      `}\n`;
  });

  // ── Render grid cells ──
  let cellEls = '';
  for (let w = 0; w < cols; w++) {
    for (let d = 0; d < rows; d++) {
      const cell = grid[w][d];
      const x = ox + w * step;
      const y = oy + d * step;
      if (cell.level > 0 && eatStepMap[key(w, d)] !== undefined) {
        const cx = x + half, cy = y + half;
        cellEls += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${cellColors[cell.level]}" style="animation:e${w}_${d} ${duration.toFixed(2)}s linear infinite;transform-origin:${cx}px ${cy}px"/>\n`;
      } else {
        cellEls += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${cellColors[cell.level]}"/>\n`;
      }
    }
  }

  // ── Snake body (tail first → head last for z-order) ──
  // All segments share snakeMove keyframe, staggered by animation-delay
  let bodyEls = '';
  const dur = duration.toFixed(2);

  for (let i = numSegs; i >= 1; i--) {
    const t = i / Math.max(numSegs, 1);
    const radius = Math.max(1, Math.round(3 - t * 2));
    const r = Math.round(249 - t * 120);
    const g = Math.round(115 - t * 70);
    const b = Math.round(22 - t * 5);
    const delay = (i * stepDur).toFixed(2);
    bodyEls += `<g style="animation:snakeMove ${dur}s linear infinite;animation-delay:${delay}s">` +
      `<rect width="${cellSize}" height="${cellSize}" rx="${radius}" ` +
      `fill="rgb(${r},${g},${b})" ` +
      `style="animation:g${i} ${dur}s linear infinite"/>` +
      `</g>\n`;
  }

  // Head (always visible, drawn last = on top)
  bodyEls += `<g style="animation:snakeMove ${dur}s linear infinite">
  <rect width="${cellSize}" height="${cellSize}" rx="3" fill="${C.orange}"/>
  <rect x="1" y="1" width="${cellSize - 2}" height="${cellSize - 2}" rx="2" fill="#fb923c"/>
  <circle cx="3.5" cy="4" r="1.5" fill="${C.bg}"/>
  <circle cx="7.5" cy="4" r="1.5" fill="${C.bg}"/>
  <circle cx="3.5" cy="4" r="0.6" fill="#fff"/>
  <circle cx="7.5" cy="4" r="0.6" fill="#fff"/>
</g>\n`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<style>
${moveKf}
${growKf}
${eatKf}
.stitle{fill:${C.text};font-family:${FONT};font-size:16px;font-weight:bold;letter-spacing:1px}
.ssub{fill:${C.muted};font-family:${FONT};font-size:11px}
</style>
<rect width="${W}" height="${H}" rx="12" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>
<text class="stitle" x="${W/2}" y="24" text-anchor="middle">Contribution Snake</text>
<text class="ssub" x="${W/2}" y="40" text-anchor="middle">Watch the snake hunt through my contribution graph</text>
${cellEls}
${bodyEls}
</svg>`;
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  console.log('Fetching GitHub data...');
  const user = await fetchData();
  console.log(`Got data for ${user.name}`);

  const assetsDir = path.join(__dirname, '../../assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  console.log('Generating stats SVG...');
  fs.writeFileSync(path.join(assetsDir, 'stats.svg'), generateStats(user));

  console.log('Generating languages SVG...');
  fs.writeFileSync(path.join(assetsDir, 'languages.svg'), generateLanguages(user));

  console.log('Generating snake SVG...');
  fs.writeFileSync(path.join(assetsDir, 'snake.svg'), generateSnake(user));

  console.log('Done! All SVGs generated.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
