import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, rmSync } from 'node:fs';

const path = process.env.DB_PATH || './data/conference.db';
rmSync('./data', { recursive: true, force: true });
mkdirSync('./data', { recursive: true });

const db = new DatabaseSync(path);
db.exec(`
  CREATE TABLE teams(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, members TEXT DEFAULT '[]', circuit TEXT, sort INTEGER DEFAULT 0);
  CREATE TABLE tournaments(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, type TEXT, weight REAL DEFAULT 1.0, config TEXT DEFAULT '{}', sort INTEGER DEFAULT 0);
  CREATE TABLE scores(id INTEGER PRIMARY KEY AUTOINCREMENT, tournament_id INTEGER, team_id INTEGER, value TEXT DEFAULT '{}', updated_at TEXT, UNIQUE(tournament_id, team_id));
`);

const teams = [
  ['Red Foxes', 'A'], ['Blue Whales', 'B'], ['Gold Lions', 'A'],
  ['Green Vipers', 'B'], ['Purple Hawks', 'A'], ['Orange Bears', 'B'],
];
for (const [n, c] of teams)
  db.prepare('INSERT INTO teams(name, members, circuit) VALUES(?, ?, ?)').run(
    n, JSON.stringify(['p1', 'p2', 'p3', 'p4']), c,
  );

const T = (name, type, weight, config) =>
  db.prepare('INSERT INTO tournaments(name, type, weight, config) VALUES(?, ?, ?, ?)').run(
    name, type, weight, JSON.stringify(config),
  );
T('Music Quiz', 'points', 1, {});
T('Puzzle', 'time', 1.5, {});
T('Guesstimate', 'guesstimate', 1, { targets: [1000, 500, 2000] });
T('Orienteering', 'checkpoints', 2, {
  circuitA: [14, 3, 78, 9, 41, 60],
  circuitB: [22, 5, 88, 6, 17, 90],
});

const S = (tid, teamId, value) =>
  db.prepare("INSERT INTO scores(tournament_id, team_id, value, updated_at) VALUES(?, ?, ?, datetime('now'))").run(
    tid, teamId, JSON.stringify(value),
  );

[50, 40, 45, 30, 20, 35].forEach((v, i) => S(1, i + 1, { value: v }));
[120, 90, 150, 200, 90, 130].forEach((v, i) => S(2, i + 1, { seconds: v }));
// guesstimate: 3 answers per team vs targets [1000, 500, 2000]
[
  [1010, 480, 1950], // Red Foxes   -> Δ 10+20+50 = 80
  [950, 500, 2100], //  Blue Whales -> Δ 50+0+100 = 150
  [1200, 600, 2000], // Gold Lions  -> Δ 200+100+0 = 300
  [1000, 500, 2000], // Green Vipers -> Δ 0 (perfect)
  [800, 700, 1500], //  Purple Hawks -> Δ 200+200+500 = 900
  [1100, 450, 1900], // Orange Bears -> Δ 100+50+100 = 250
].forEach((a, i) => S(3, i + 1, { answers: a }));
// found per team, scored vs its own circuit (A: 14,3,78,9,41,60 / B: 22,5,88,6,17,90)
[
  [14, 3, 78],        // Red Foxes (A) -> 3
  [22, 5, 88, 6],     // Blue Whales (B) -> 4
  [14, 3, 78, 9, 41, 60], // Gold Lions (A) -> 6
  [22, 5],            // Green Vipers (B) -> 2
  [14],               // Purple Hawks (A) -> 1
  [22, 5, 88],        // Orange Bears (B) -> 3
].forEach((f, i) => S(4, i + 1, { found: f }));

console.log('seeded', db.prepare('SELECT count(*) c FROM scores').get());
