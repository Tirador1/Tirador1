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

// ── Languages SVG ──────────────────────────────────────────
function generateLanguages(user) {
  // Aggregate language bytes across repos
  const langMap = {};
  user.repositories.nodes.forEach(repo => {
    repo.languages.edges.forEach(edge => {
      const name = edge.node.name;
      langMap[name] = (langMap[name] || 0) + edge.size;
    });
  });

  // Sort and take top 8
  const sorted = Object.entries(langMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  const langs = sorted.map(([name, bytes]) => ({
    name,
    pct: ((bytes / total) * 100).toFixed(1),
    color: C.lang[name] || C.lang.Other,
  }));

  const W = 850, barW = 480, barH = 10, lineH = 36;
  const H = 60 + langs.length * lineH + 30;
  const labelX = 30, barX = 160, pctX = 670;

  let bars = '';
  langs.forEach((l, i) => {
    const y = 60 + i * lineH;
    const w = (l.pct / 100) * barW;
    const delay = (i * 0.1).toFixed(2);
    bars += `
    <g class="lang-row" style="animation-delay:${delay}s">
      <circle cx="${labelX}" cy="${y + 6}" r="4" fill="${l.color}"/>
      <text x="${labelX + 14}" y="${y + 10}" fill="${C.text}" font-family="${FONT}" font-size="13">${l.name}</text>
      <rect x="${barX}" y="${y}" width="${barW}" height="${barH}" rx="5" fill="${C.card}"/>
      <rect x="${barX}" y="${y}" width="${w}" height="${barH}" rx="5" fill="${l.color}" class="bar" style="animation-delay:${(i * 0.1 + 0.3).toFixed(2)}s">
        <title>${l.name}: ${l.pct}%</title>
      </rect>
      <text x="${pctX}" y="${y + 10}" fill="${C.muted}" font-family="${FONT}" font-size="12" text-anchor="end">${l.pct}%</text>
    </g>`;
  });

  // Composition bar at the top
  let compBar = '', cx = 30;
  const compW = W - 60;
  langs.forEach(l => {
    const w = (l.pct / 100) * compW;
    compBar += `<rect x="${cx}" y="40" width="${w}" height="6" fill="${l.color}"/>`;
    cx += w;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <style>
    @keyframes rowIn { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
    @keyframes barGrow { from { width:0; } }
    .lang-row { opacity:0; animation: rowIn 0.4s ease forwards; }
    .bar { animation: barGrow 0.8s ease forwards; }
    .head { fill:${C.text}; font-family:${FONT}; font-size:16px; font-weight:bold; letter-spacing:1px; }
  </style>
  <rect width="${W}" height="${H}" rx="12" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>
  <text class="head" x="${W/2}" y="28" text-anchor="middle">Languages</text>
  <rect x="30" y="40" width="${compW}" height="6" rx="3" fill="${C.card}"/>
  ${compBar}
  ${bars}
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

  // ── Nearest-neighbor pathfinding ──
  // Snake hunts only non-empty cells, walks grid to reach them
  function walkBetween(from, to) {
    const moves = [];
    let { w, d } = from;
    // Move horizontally first, then vertically
    while (w !== to.w) {
      w += w < to.w ? 1 : -1;
      moves.push({ w, d });
    }
    while (d !== to.d) {
      d += d < to.d ? 1 : -1;
      moves.push({ w, d });
    }
    return moves;
  }

  const remaining = [...targets];
  const fullPath = [{ w: 0, d: rows - 1 }]; // start bottom-left
  const eatStepMap = {}; // "w,d" -> step index when eaten

  let cur = fullPath[0];
  while (remaining.length > 0) {
    // Find nearest uneaten target
    let bestIdx = 0, bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const t = remaining[i];
      const dist = Math.abs(t.w - cur.w) + Math.abs(t.d - cur.d);
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    }
    const target = remaining.splice(bestIdx, 1)[0];
    const walkSteps = walkBetween(cur, target);
    fullPath.push(...walkSteps);
    eatStepMap[`${target.w},${target.d}`] = fullPath.length - 1;
    cur = target;
  }

  // Return to start for seamless loop
  const returnSteps = walkBetween(cur, { w: 0, d: rows - 1 });
  fullPath.push(...returnSteps);

  const totalSteps = fullPath.length;
  const stepDur = 0.07; // seconds per step
  const duration = totalSteps * stepDur;
  const pctPerStep = 100 / totalSteps;

  // ── Compress keyframes: merge consecutive same-direction moves ──
  const keyframes = [{ step: 0, w: fullPath[0].w, d: fullPath[0].d }];
  for (let i = 1; i < totalSteps; i++) {
    const prev = fullPath[i - 1];
    const curr = fullPath[i];
    const next = fullPath[i + 1];
    // Keep this point if direction changes or it's the last point
    if (!next ||
        (curr.w - prev.w) !== (next.w - curr.w) ||
        (curr.d - prev.d) !== (next.d - curr.d)) {
      keyframes.push({ step: i, w: curr.w, d: curr.d });
    }
  }

  // ── Generate snake movement CSS keyframes ──
  let moveKf = '@keyframes snakeMove {\n';
  keyframes.forEach(kf => {
    const pct = (kf.step * pctPerStep).toFixed(4);
    const px = ox + kf.w * step;
    const py = oy + kf.d * step;
    moveKf += `  ${pct}% { transform: translate(${px}px,${py}px); }\n`;
  });
  // Ensure 100% returns to start
  moveKf += `  100% { transform: translate(${ox}px,${oy + (rows - 1) * step}px); }\n`;
  moveKf += '}\n';

  // ── Cell eat keyframes (one per target cell) ──
  // Each cell: visible → flash cyan → shrink & vanish → stay gone → regenerate at loop end
  let eatKf = '';
  targets.forEach(t => {
    const key = `${t.w},${t.d}`;
    const eatStep = eatStepMap[key];
    if (eatStep === undefined) return;
    const eatPct = (eatStep * pctPerStep).toFixed(3);
    const flashPct = Math.min(parseFloat(eatPct) + 0.4, 99).toFixed(3);
    const gonePct = Math.min(parseFloat(flashPct) + 0.6, 99).toFixed(3);
    const color = cellColors[t.level];
    eatKf += `@keyframes e${t.w}_${t.d}{` +
      `0%,${eatPct}%{fill:${color};transform:scale(1);opacity:1}` +
      `${flashPct}%{fill:${C.cyan};transform:scale(1.5);opacity:1}` +
      `${gonePct}%{fill:${C.bg};transform:scale(0);opacity:0}` +
      `96%{fill:${C.bg};transform:scale(0);opacity:0}` +
      `98%{fill:${color};transform:scale(0);opacity:0}` +
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
      const cx = x + half;
      const cy = y + half;
      if (cell.level > 0 && eatStepMap[`${w},${d}`] !== undefined) {
        // Animated cell: wrapped so scale transforms from center
        cellEls += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${cellColors[cell.level]}" style="animation:e${w}_${d} ${duration.toFixed(2)}s linear infinite;transform-origin:${cx}px ${cy}px"/>\n`;
      } else {
        cellEls += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${cellColors[cell.level]}"/>\n`;
      }
    }
  }

  // ── Snake body segments ──
  // Rendered back-to-front (tail first, head last) so head draws on top
  const bodyLen = 16;
  let bodyEls = '';

  // Tail segments (furthest back → closest to head)
  for (let i = bodyLen - 1; i >= 1; i--) {
    const delay = -(i * stepDur);
    const t = i / bodyLen;
    const opacity = (1 - t * 0.8).toFixed(2);
    const radius = Math.max(1, Math.round(3 - t * 2));
    // Color gradient: orange head → dark orange tail
    const r = Math.round(249 - t * 130);
    const g = Math.round(115 - t * 80);
    const b = Math.round(22 - t * 10);
    bodyEls += `<rect width="${cellSize}" height="${cellSize}" rx="${radius}" ` +
      `fill="rgb(${r},${g},${b})" opacity="${opacity}" ` +
      `style="animation:snakeMove ${duration.toFixed(2)}s linear infinite;` +
      `animation-delay:${delay.toFixed(4)}s"/>\n`;
  }

  // Head (drawn last = on top)
  bodyEls += `<g style="animation:snakeMove ${duration.toFixed(2)}s linear infinite">
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
