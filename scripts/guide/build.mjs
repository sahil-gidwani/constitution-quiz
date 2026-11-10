// Builds public/guide/Constitution-Quiz-Showdown-User-Guide.pdf.   Usage: npm run build && npx vite preview --port 4173 & node scripts/guide/build.mjs
// Needs Playwright + Chromium. Screenshots are taken from the real, running app (capture.mjs), so re-run after any restyle.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const build = resolve(here, '.build'); mkdirSync(resolve(build, 'shots'), { recursive: true });
execFileSync('node', [resolve(here, 'capture.mjs'), resolve(build, 'shots')], { stdio: 'inherit', cwd: root });
const require = createRequire(import.meta.url);
let playwright; try { playwright = require('playwright'); } catch { playwright = require('/opt/npm-tools/node_modules/playwright'); }
const rounds = JSON.parse(readFileSync(resolve(root, 'src/data/rounds.json'), 'utf8')).rounds;
const nQ = rounds.reduce((n, r) => n + r.categories.reduce((m, c) => m + c.questions.length, 0), 0);
const nT = rounds.reduce((n, r) => n + r.categories.length, 0);
const fdir = (p, f) => resolve(root, 'node_modules/@fontsource-variable', p, 'files', f);
const fontCss = `@font-face{font-family:'GuideSerif';src:url('file://${fdir('playfair-display', 'playfair-display-latin-wght-normal.woff2')}');font-weight:400 900}@font-face{font-family:'GuideSans';src:url('file://${fdir('figtree', 'figtree-latin-wght-normal.woff2')}');font-weight:300 900}`;
const shot = (n, cls = '', hmm = 0) => `<figure class="shot ${hmm ? 'crop' : ''} ${cls}" ${hmm ? `style="--h:${hmm}mm"` : ''}><img src="shots/${n}.jpg" alt=""></figure>`;
const cap = (t) => `<figcaption>${t}</figcaption>`;
const phone = (n, c, crop = 0) => `<div class="ph">${shot(n, '', crop)}${cap(c)}</div>`;
const starPts = (r) => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.42 : r; return `${(50 + Math.cos(a) * rr).toFixed(1)},${(53 + Math.sin(a) * rr).toFixed(1)}`; }).join(' ');
// The game's seal: red / gold / green bands inside a gold ring, with the black star.
const seal = (s) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><defs><clipPath id="sc"><circle cx="50" cy="50" r="41"/></clipPath></defs><circle cx="50" cy="50" r="47" fill="#120708" stroke="#d9a82b" stroke-width="5"/><g clip-path="url(#sc)"><rect width="100" height="34" fill="#ce1126"/><rect y="33" width="100" height="34" fill="#d9a82b"/><rect y="66" width="100" height="34" fill="#0f8a4b"/></g><polygon points="${starPts(27)}" fill="#0b0405"/></svg>`;
const star = (s) => seal(s);
const callout = (t, b, kind = '') => `<div class="callout ${kind}"><b>${t}</b><p>${b}</p></div>`;
const steps = (a) => `<ol class="steps">${a.map(([t, b]) => `<li><span></span><div><b>${t}</b><p>${b}</p></div></li>`).join('')}</ol>`;
const h = (kicker, title, lead) => `<header class="ph-head"><p class="kick">${kicker}</p><h2>${title}</h2>${lead ? `<p class="lead">${lead}</p>` : ''}</header>`;

const css = `${fontCss}
@page{size:A4;margin:0}
:root{--ink:#120708;--green:#4a0f16;--gold:#d9a82b;--goldd:#7a5409;--red:#ce1126;--paper:#fbf6e8;--text:#2a1a14;--soft:#5e4c43;--line:#e6d9bd}
*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font:10.5pt/1.55 GuideSans,system-ui,sans-serif;color:var(--text);counter-reset:pg}
h1,h2,h3{font-family:GuideSerif,Georgia,serif;margin:0;color:var(--green)}
.page{position:relative;width:210mm;height:297mm;overflow:hidden;background:var(--paper);padding:20mm 18mm 18mm;page-break-after:always;counter-increment:pg}
.page::before{content:'';position:absolute;left:0;right:0;top:0;height:5mm;background:linear-gradient(90deg,var(--red) 0 33.4%,#fcd116 33.4% 66.7%,#006b3f 66.7%)}
.page:not(.cover)::after{content:counter(pg);position:absolute;bottom:8mm;right:18mm;font-size:9pt;color:var(--soft)}
.page:not(.cover) .foot{position:absolute;bottom:8mm;left:18mm;font-size:9pt;color:var(--soft);display:flex;gap:6px;align-items:center}
.kick{margin:0 0 2mm;font-size:8.5pt;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--goldd)}
.ph-head{margin-bottom:6mm}.ph-head h2{font-size:25pt;line-height:1.12}.lead{margin:3mm 0 0;font-size:11.5pt;color:var(--soft);max-width:150mm}
h3{font-size:13pt;margin:5mm 0 1.5mm}p{margin:0 0 2.5mm}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:8mm;align-items:start}.cols3{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;align-items:start}
.shot{margin:0;border-radius:6mm;overflow:hidden;border:1.2mm solid #1c0b0d;box-shadow:0 3mm 8mm -3mm rgba(18,7,8,.5);background:#120708;line-height:0}
.shot img{width:100%;height:auto;display:block}.shot.wide{border-radius:3mm;border-width:.9mm}
figcaption{font-size:8.5pt;color:var(--soft);text-align:center;margin-top:2.5mm;line-height:1.35}
.ph{display:block}.ph.narrow{width:64mm;margin:0 auto}
.shot.crop{height:var(--h)}.shot.crop img{height:100%;object-fit:cover;object-position:top}
.callout{border-left:1.6mm solid var(--gold);background:#fff;border-radius:0 3mm 3mm 0;padding:3mm 4mm;margin:4mm 0;box-shadow:0 0 0 .2mm var(--line)}
.callout>b{display:block;color:var(--green);margin-bottom:.5mm}.callout p{margin:0;color:var(--text)}
.callout.tip{border-color:#0f9d58}.callout.warn{border-color:var(--red)}
.steps{list-style:none;margin:0;padding:0;counter-reset:s;display:grid;gap:3.5mm}
.steps li{display:flex;gap:4mm;align-items:flex-start;counter-increment:s}
.steps li>span{flex:none;width:8mm;height:8mm;border-radius:50%;background:linear-gradient(145deg,#f4d77a,#d9a82b 55%,#a97a12);display:grid;place-items:center;font:700 11pt GuideSerif,serif;color:#1a1203}
.steps li>span::before{content:counter(s)}.steps li>div>b{display:block;color:var(--green)}.steps p{margin:0;color:var(--soft)}
table{border-collapse:collapse;width:100%;font-size:9.5pt;background:#fff}th,td{padding:2.2mm 3mm;text-align:left;border-bottom:.2mm solid var(--line);vertical-align:top}
th{background:var(--green);color:#fff;font-weight:600}td b{color:var(--green)}
.pill{display:inline-block;padding:.4mm 2.4mm;border-radius:9mm;font-weight:700;font-size:9pt;color:#fff}
.t1{background:#3a1317}.t2{background:#5b1a20}.t3{background:#7c1824}.t4{background:#8a5f0b}.t5{background:#a8770c}
kbd{font:600 9pt GuideSans,sans-serif;background:#fff;border:.25mm solid #bdb48f;border-bottom-width:.6mm;border-radius:1.2mm;padding:.2mm 1.8mm}
ul.tick{list-style:none;padding:0;margin:0 0 3mm}ul.tick li{padding-left:6mm;position:relative;margin-bottom:1.5mm}ul.tick li::before{content:'';position:absolute;left:0;top:2.2mm;width:2.4mm;height:2.4mm;background:var(--gold);border-radius:50%}
/* cover */
.cover{background:radial-gradient(120% 80% at 20% 10%,#5a1a1f,#2a0d10 55%,#120708);color:#f6efe0;padding:0}
.cover::before{height:8mm}
.cover .in{position:absolute;inset:34mm 22mm 24mm;display:flex;flex-direction:column}
.medal{width:40mm;height:40mm;display:grid;place-items:center;filter:drop-shadow(0 0 6mm rgba(217,168,43,.4))}
.cover h1{color:#f6efe0;font-size:44pt;line-height:1.02;margin:14mm 0 0;font-weight:800}
.cover h1 em{display:block;font-style:normal;color:#e3b53a}
.cover .sub{font-size:15pt;color:#e7dfbf;margin:8mm 0 0;max-width:120mm}
.kente{height:4mm;margin-top:auto;background:repeating-linear-gradient(90deg,#ce1126 0 14mm,#000 14mm 15.5mm,#d9a82b 15.5mm 28mm,#000 28mm 29.5mm,#0f9d58 29.5mm 42mm,#000 42mm 43.5mm)}
.cover small{margin-top:5mm;color:#bdb89f;font-size:9.5pt}
.ghana-line{display:flex;gap:3mm;align-items:center;font-size:9pt;color:#bdb89f;margin-top:4mm}
.contents{columns:2;gap:10mm;margin-top:4mm}.contents p{display:flex;justify-content:space-between;border-bottom:.2mm dotted #b9b08c;padding:1.2mm 0;margin:0}
.contents b{color:var(--green)}
.back{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6mm}.back h2{color:#f6efe0;font-size:28pt}
`;

const roundRows = rounds.map((r, i) => `<tr><td><b>${i + 1}. ${r.title}</b></td><td>${r.tagline}</td><td>${r.categories.length}</td></tr>`).join('');

const pages = [];
pages.push(`<section class="page cover"><div class="in"><div class="medal">${star(78)}</div><h1>Constitution Quiz <em>Showdown</em></h1><p class="sub">The player's guide. Everything you need to set up, play and win, in plain language.</p><div class="kente"></div><small>A quiz show on the Constitution of Ghana and the nation around it, for one to five players. Free to play, works offline once installed.</small></div></section>`);

pages.push(`<section class="page">${h('Welcome', 'Let’s play', 'Constitution Quiz Showdown turns what you know about Ghana’s Constitution, symbols, leaders and institutions into a game show. Pick a topic, choose how many points to play for, and beat the clock.')}
<div class="cols"><div><h3>What you need</h3><ul class="tick"><li>A phone, tablet or computer with a web browser.</li><li>One to five players. Everyone shares the same device and takes turns buzzing in.</li><li>About 20 minutes for a round, or 2 minutes for a quick-fire sprint.</li><li>No account, no sign-up and no data to hand over.</li></ul><h3>What is inside</h3><ul class="tick"><li><b>${rounds.length} rounds</b> on the Constitution, flags and oaths, chiefs and courts, leaders, amendments and more.</li><li><b>${nT} topics</b> and <b>${nQ} questions</b>, each worth 10 to 50 points.</li><li>Solo, multiplayer and team play.</li><li>Optional extras such as power-ups and streak bonuses.</li></ul></div>
<div class="ph">${shot('01-home', 'wide')}${cap('The home screen. Press <b>Start playing</b> to begin.')}</div></div>
<h3>In this guide</h3><div class="contents"><p><span><b>1</b> Quick start</span><span>3</span></p><p><span><b>2</b> Setting up a game</span><span>4</span></p><p><span><b>3</b> Optional game rules</span><span>5</span></p><p><span><b>4</b> Choosing a round</span><span>6</span></p><p><span><b>5</b> The board</span><span>7</span></p><p><span><b>6</b> Answering questions</span><span>8</span></p><p><span><b>7</b> How points work</span><span>9</span></p><p><span><b>8</b> Quick-fire</span><span>10</span></p><p><span><b>9</b> Your own boards and rounds</span><span>11</span></p><p><span><b>10</b> Scores and sharing</span><span>12</span></p><p><span><b>11</b> Install, shortcuts and help</span><span>13</span></p></div><div class="foot">${star(12, '#b8801a')} Constitution Quiz Showdown</div></section>`);

pages.push(`<section class="page">${h('1 · Quick start', 'Your first game in five steps')}
<div class="cols"><div>${steps([['Open the game', 'Go to the game’s web address. It opens on the home screen.'], ['Press Start playing', 'You will be asked who is playing.'], ['Choose Solo or Multiplayer', 'Solo is you against the clock. Multiplayer is two to five people taking turns on one device.'], ['Pick a round', 'Each round is a board of topics. Start with Round 1 if you are not sure.'], ['Pick a tile and answer', 'Low numbers are easier. Choose an answer before the clock runs out.']])}
${callout('Good to know', 'Your game is saved automatically on your device. If you close the page, press <b>Resume</b> on the home screen to carry on.', 'tip')}</div>
<div class="ph">${shot('02-setup')}${cap('The "Who’s playing?" screen.')}</div></div></section>`);

pages.push(`<section class="page">${h('2 · Setting up', 'Who’s playing?', 'Everything is chosen on one screen. Nothing is complicated, and you can change your mind before you start.')}
<div class="cols"><div class="ph">${shot('02-setup')}${cap('Three players, board game format.')}</div><div>
<h3>Solo or Multiplayer</h3><p><b>Solo</b> means one player. You get 15 seconds per question and a single try.</p><p><b>Multiplayer</b> is for two to five players. Use the plus and minus buttons to set the number, then type a name for each person. Names must be different.</p>
<h3>Format</h3><p><b>Board game</b> is the classic: pick tiles from a board of topics, one question at a time.</p><p><b>Quick-fire</b> is a timed sprint of random questions with no board (see page 10).</p>
<h3>Game rules</h3><p>Tap <b>Game rules</b> to open the optional extras. Everything is switched off until you turn it on, so a standard game is always simple.</p>
${callout('Ready?', 'Press the gold button at the bottom: <b>Choose a round</b> (or <b>Start quick-fire</b>).')}</div></div></section>`);

pages.push(`<section class="page">${h('3 · Optional game rules', 'Spice it up, or keep it simple', 'These extras are all off by default. Switch on only what you fancy. You can also change them in the middle of a game from the <b>Rules</b> button.')}
<div class="cols"><div class="ph">${shot('03-rules', '', 205)}${cap('Game rules with 50/50, Double or nothing and Streak bonus switched on.')}</div><div>
<table><tr><th>Extra</th><th>What it does</th></tr>
<tr><td><b>50/50</b></td><td>Removes two wrong answers. Once per player or team, per game.</td></tr>
<tr><td><b>Skip</b></td><td>Skip a question with no penalty. In multiplayer it passes the question on.</td></tr>
<tr><td><b>Double or nothing</b></td><td>Correct pays double. Wrong loses the whole tile.</td></tr>
<tr><td><b>Streak bonus</b></td><td>Each correct answer in a row adds a bonus to the next one. You choose the step (5, 10 or 20%) and the cap (25, 50 or 100%).</td></tr>
<tr><td><b>Negative marking</b></td><td>Wrong answers and timeouts cost 25, 50 or 100% of the tile.</td></tr>
<tr><td><b>Speed bonus</b></td><td>The faster a correct answer, the more extra points (up to 25, 50 or 100%).</td></tr>
<tr><td><b>Teams</b></td><td>With 3 to 5 players you can make up to 3 teams. Scores, streaks and power-ups are shared by the team.</td></tr></table>
${callout('Tip for families and classrooms', 'Start with everything off. Add <b>50/50</b> once everyone knows the board, then try streaks and teams.', 'tip')}</div></div></section>`);

pages.push(`<section class="page">${h('4 · Choosing a round', 'Eleven rounds, play them in any order', 'Each round has its own board. Scores add up across rounds, so you can play one tonight and another tomorrow.')}
<div class="cols" style="grid-template-columns:.8fr 1.2fr"><div class="ph">${shot('04-rounds', '', 195)}${cap('The round list. The next round to play is highlighted.')}</div><div>
<table style="font-size:8.6pt"><tr><th>Round</th><th>About</th><th>Topics</th></tr>${roundRows}</table>
<p style="margin-top:3mm;font-size:9.5pt;color:var(--soft)">The first card, <b>Build your own board</b>, lets you mix topics from any round (see page 11). When you have played at least one question, <b>Finish game and see results</b> appears at the bottom.</p></div></div></section>`);

pages.push(`<section class="page">${h('5 · The board', 'Pick a tile, choose your risk', 'Each column is a topic. Each tile is a question. The bigger the number, the harder the question and the bigger the prize.')}
<div class="ph">${shot('05-board', 'wide')}${cap('Round 1 part-way through. Ticks show who won a tile, a cross is a missed one.')}</div>
<div class="cols" style="margin-top:6mm"><div><h3>Tile colours</h3><table><tr><td><span class="pill t1">10</span></td><td>Easiest. Warm-up questions.</td></tr><tr><td><span class="pill t2">20</span></td><td>Easy.</td></tr><tr><td><span class="pill t3">30</span></td><td>Medium.</td></tr><tr><td><span class="pill t4">40</span></td><td>Hard.</td></tr><tr><td><span class="pill t5">50</span></td><td>Toughest. Go for it!</td></tr></table></div>
<div><h3>Played tiles</h3><p>A tile can only be played once. After it is played it shows:</p><ul class="tick"><li><b>A tick</b> in the winner’s colour: someone got it right.</li><li><b>A cross</b>: nobody got it.</li><li><b>A skip arrow</b>: it was skipped.</li></ul>${callout('Round complete', 'When every tile is played you will see a celebration and buttons for the next round, the scoreboard or to finish.')}</div></div></section>`);

pages.push(`<section class="page">${h('6 · Answering questions', 'Beat the clock', 'The question screen is the heart of the game. Here is how it works for solo and for groups.')}
<div class="cols3">${phone('06-buzz', '<b>1. Buzz in.</b> Everyone gets 30 seconds to buzz in. Tap your name, or press your number key.')}${phone('07-answer', '<b>2. Answer.</b> The buzzer gets 10 seconds to choose A, B, C or D.')}${phone('08-reveal', '<b>3. Reveal.</b> The right answer turns green and points go to the winner.')}</div>
<div class="cols" style="margin-top:6mm"><div><h3>Playing solo</h3><p>There is no buzzing. You have <b>15 seconds</b> and one try. Tap your answer.</p><h3>Playing with others</h3><p>The first person to buzz answers. If they are wrong, or time out, they are out for that question and everyone else can buzz again. A wrong answer is crossed out for all players.</p></div>
<div>${callout('Typed answers', 'Some imported questions ask you to type the answer instead of choosing. Type it in the box and press Submit.')}${callout('Left by mistake?', 'If you press Back during a question, the game asks you first. Leaving forfeits the tile.', 'warn')}</div></div></section>`);

pages.push(`<section class="page">${h('7 · How points work', 'Simple by default', 'With no extras, a correct answer earns the number on the tile. A wrong answer or a timeout earns nothing.')}
<div class="cols"><div><h3>The basics</h3><table><tr><th>Situation</th><th>Points</th></tr><tr><td>Correct answer on a 30 tile</td><td><b>+30</b></td></tr><tr><td>Wrong answer or timeout</td><td><b>0</b></td></tr><tr><td>Skipped tile</td><td><b>0</b></td></tr></table>
<h3>With extras switched on</h3><table><tr><th>Extra</th><th>Example</th></tr><tr><td>Streak bonus (10% step)</td><td>Third correct in a row on a 30 tile: 30 + 20% = <b>36</b></td></tr><tr><td>Double or nothing</td><td>Correct on a 30 tile: <b>60</b>. Wrong: <b>−30</b></td></tr><tr><td>Negative marking (50%)</td><td>Wrong on a 40 tile: <b>−20</b></td></tr><tr><td>Speed bonus (up to 50%)</td><td>Answering very fast on a 20 tile: up to <b>30</b></td></tr></table></div>
<div><h3>Ties and winners</h3><p>The player (or team) with the most points at the end wins. If scores are level, the game says <b>It’s a tie</b>.</p><h3>Where to see points</h3><ul class="tick"><li>The gold pill at the top shows the top score.</li><li>Player chips above the board show everyone’s score.</li><li>After each answer a small summary shows how the points added up.</li></ul>${callout('Fair play', 'Scores are worked out from the list of answers, so they always add up correctly, even if you refresh the page.', 'tip')}</div></div></section>`);

pages.push(`<section class="page">${h('8 · Quick-fire', 'A two-minute sprint', 'No board and no choosing tiles. Questions from across the rounds come at you as fast as you can answer.')}
<div class="cols">${phone('10-quick-ready', '<b>Ready?</b> Each player takes a turn. Press Start when you are set.').replace('class="ph"','class="ph narrow"')}${phone('11-quick-play', '<b>Play.</b> Answer as many as you can before the ring runs out.').replace('class="ph"','class="ph narrow"')}</div>
<div class="cols" style="margin-top:6mm"><div><ul class="tick"><li>Choose <b>60, 90, 120 or 180 seconds</b> on the setup screen.</li><li>Pick which rounds the questions come from.</li><li><b>Pass</b> any question for free.</li><li>Streak, speed, negative marking, 50/50 and Double or nothing all work here too.</li></ul></div><div>${callout('Need at least 8 questions', 'If you narrow the rounds too much the game will ask you to select more.', 'warn')}</div></div></section>`);

pages.push(`<section class="page">${h('9 · Make it yours', 'Your own boards and rounds', 'Mix topics for a revision session, or bring in a quiz of your own.')}
<div class="cols"><div class="ph">${shot('12-builder', '', 205)}${cap('Build your own board: pick up to 8 topics.')}</div><div>
<h3>Build your own board</h3>${steps([['Open Choose a round', 'Tap the dashed card, <b>Build your own board</b>.'], ['Pick topics', 'Choose up to 8 topics from any round. Use search, or <b>Pick 5 at random</b>.'], ['Name it and play', 'Press <b>Build and play</b>. Your board is saved for later.']])}
<h3>Import your own round</h3><p>At the bottom of <b>Choose a round</b>, drop in a <b>.json</b> quiz file, or tap to choose one. Press <b>Template</b> to download an example to copy. If anything in the file is wrong, the game tells you exactly what to fix.</p>
${callout('Pictures and videos', 'Imported questions can include an image or a video. Ask whoever looks after the game to add the files.')}</div></div></section>`);

pages.push(`<section class="page">${h('10 · Scores and sharing', 'Who takes the crown?', 'Check the scoreboard at any time during a board game, and finish with a podium.')}
<div class="cols">${phone('09-scores', '<b>Scoreboard.</b> Open it from the <b>Scores</b> button at the top.')}${phone('13-final', '<b>Final results.</b> Confetti, a podium and a points breakdown.')}</div>
<div class="cols" style="margin-top:6mm"><div><h3>At the end</h3><ul class="tick"><li><b>Play again, same players</b> starts a fresh game with the same names.</li><li><b>New game</b> goes back to the start.</li></ul></div><div><h3>Share your result</h3><p>Press <b>Share result</b> to create a picture card with the final scores. Save it, or send it to friends and family.</p></div></div></section>`);

pages.push(`<section class="page">${h('11 · Install, shortcuts and help', 'Handy things to know')}
<div class="cols"><div><h3>Play offline</h3><p>After your first visit the game works without internet. To keep it on your phone like an app:</p><ul class="tick"><li><b>Android or computer (Chrome):</b> press <b>Install app</b> on the home screen.</li><li><b>iPhone or iPad:</b> tap Share in Safari, then <b>Add to Home Screen</b>.</li></ul>
<h3>Keyboard shortcuts</h3><table><tr><td><kbd>1</kbd>–<kbd>5</kbd></td><td>Buzz in as player 1 to 5</td></tr><tr><td><kbd>A</kbd>–<kbd>D</kbd></td><td>Choose an answer</td></tr><tr><td><kbd>Space</kbd> / <kbd>Enter</kbd></td><td>Continue</td></tr><tr><td><kbd>P</kbd></td><td>Pass (quick-fire)</td></tr></table></div>
<div><h3>Questions and answers</h3><p><b>Can I stop and come back?</b><br>Yes. Your game is saved on this device. Press Resume on the home screen.</p><p><b>Can I mute the sound?</b><br>Yes, use the speaker button at the top right.</p><p><b>Why can’t I press a tile?</b><br>It has already been played. Pick a numbered one.</p><p><b>A wrong answer took points away. Why?</b><br>Negative marking or Double or nothing is on. Check <b>Rules</b>.</p><p><b>I want to start again.</b><br>On the home screen press <b>Discard</b>, then Start a new game.</p><p><b>Does it need an account?</b><br>No. Nothing leaves your device.</p></div></div>
${callout('Have fun', 'Take turns, cheer loudly, and learn something about Ghana’s Constitution along the way.', 'tip')}</section>`);

pages.push(`<section class="page cover"><div class="in back"><div class="medal">${star(78)}</div><h2>Ready to play?</h2><p class="sub" style="margin:0">Open the game, press <b style="color:#e0a526">Start playing</b>, and may the best scholar win.</p><div class="kente" style="width:100%;margin-top:14mm"></div></div></section>`);

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Constitution Quiz Showdown: Player's Guide</title><style>${css}</style></head><body>${pages.join('\n')}</body></html>`;
const f = resolve(build, 'guide.html'); writeFileSync(f, html);
const b = await playwright.chromium.launch(); const pg = await b.newPage();
await pg.goto(`file://${f}`); await pg.waitForTimeout(400);
mkdirSync(resolve(root, 'public/guide'), { recursive: true });
await pg.pdf({ path: resolve(root, 'public/guide/Constitution-Quiz-Showdown-User-Guide.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
await b.close(); console.log('guide written');
