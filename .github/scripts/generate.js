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
  const cellSize = 11, gap = 3, cellStep = cellSize + gap;
  const cols = weeks.length; // ~52
  const rows = 7;
  const gridW = cols * cellStep - gap;
  const gridH = rows * cellStep - gap;
  const offsetX = Math.floor((W - gridW) / 2);
  const offsetY = 50;
  const H = offsetY + gridH + 40;

  // Build grid data
  const grid = [];
  for (let w = 0; w < cols; w++) {
    for (let d = 0; d < rows; d++) {
      const day = weeks[w]?.contributionDays?.[d];
      const count = day ? day.contributionCount : 0;
      const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 8 ? 3 : 4;
      grid.push({ w, d, count, level });
    }
  }

  // Snake path: zigzag from bottom-left
  const snakePath = [];
  for (let d = rows - 1; d >= 0; d--) {
    const rowCells = grid.filter(c => c.d === d);
    if ((rows - 1 - d) % 2 === 0) {
      snakePath.push(...rowCells.sort((a, b) => a.w - b.w));
    } else {
      snakePath.push(...rowCells.sort((a, b) => b.w - a.w));
    }
  }

  // Duration per cell
  const totalDuration = 30; // seconds
  const cellDuration = totalDuration / snakePath.length;
  const snakeLength = 6;

  // Generate cells with eat animation
  let cells = '';
  const cellColors = [C.c0, C.c1, C.c2, C.c3, C.c4];

  // Create cell lookup for timing
  const timingMap = {};
  snakePath.forEach((cell, i) => {
    timingMap[`${cell.w}-${cell.d}`] = i;
  });

  grid.forEach(cell => {
    const x = offsetX + cell.w * cellStep;
    const y = offsetY + cell.d * cellStep;
    const fillColor = cellColors[cell.level];
    const eatIndex = timingMap[`${cell.w}-${cell.d}`];
    const eatTime = (eatIndex * cellDuration).toFixed(3);

    if (cell.level > 0) {
      cells += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${fillColor}">
      <animate attributeName="fill" to="${C.c0}" begin="${eatTime}s" dur="0.3s" fill="freeze"/>
      <animate attributeName="rx" to="0" begin="${eatTime}s" dur="0.3s" fill="freeze"/>
    </rect>\n`;
    } else {
      cells += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${fillColor}"/>\n`;
    }
  });

  // Snake head motion path
  let motionPath = '';
  snakePath.forEach((cell, i) => {
    const x = offsetX + cell.w * cellStep + cellSize / 2;
    const y = offsetY + cell.d * cellStep + cellSize / 2;
    motionPath += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
  });

  // Snake body (multiple circles with offset)
  let snakeBody = '';
  for (let s = 0; s < snakeLength; s++) {
    const opacity = (1 - s / snakeLength).toFixed(2);
    const size = (5 - s * 0.5).toFixed(1);
    const delay = (s * cellDuration).toFixed(3);
    const color = s === 0 ? C.orange : s < 3 ? '#fb923c' : '#fdba74';
    snakeBody += `
    <circle r="${size}" fill="${color}" opacity="${opacity}">
      <animateMotion path="${motionPath}" dur="${totalDuration}s" begin="${delay}s" fill="freeze" calcMode="linear"/>
    </circle>`;
  }

  // Snake eyes (on the head)
  snakeBody += `
    <g>
      <animateMotion path="${motionPath}" dur="${totalDuration}s" fill="freeze" calcMode="linear"/>
      <circle cx="-2" cy="-2" r="1.2" fill="${C.bg}"/>
      <circle cx="2" cy="-2" r="1.2" fill="${C.bg}"/>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <style>
    .snake-title { fill:${C.text}; font-family:${FONT}; font-size:16px; font-weight:bold; letter-spacing:1px; }
    .snake-sub { fill:${C.muted}; font-family:${FONT}; font-size:11px; }
  </style>
  <rect width="${W}" height="${H}" rx="12" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>
  <text class="snake-title" x="${W/2}" y="24" text-anchor="middle">Contribution Snake</text>
  <text class="snake-sub" x="${W/2}" y="40" text-anchor="middle">Watch the snake eat through my contribution graph</text>
  ${cells}
  ${snakeBody}
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
