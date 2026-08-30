import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'src', 'data', 'codeforces.json');
const API_DELAY_MS = 2100;

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Codeforces HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.status !== 'OK') throw new Error(payload.comment || 'Codeforces API 返回失败');
  return payload.result;
}

const studentId = argument('studentId');
const handle = argument('handle');
const periodId = argument('periodId', 'period-2026-spring');

if (!studentId || !handle) {
  console.error(
    '用法: node scripts/sync-codeforces.mjs --studentId stu-001 --handle tourist [--periodId period-2026-spring]'
  );
  process.exit(1);
}

const base = 'https://codeforces.com/api';
const encodedHandle = encodeURIComponent(handle);
const user = (await requestJson(`${base}/user.info?handles=${encodedHandle}`))[0];
await wait(API_DELAY_MS);
const submissions = await requestJson(
  `${base}/user.status?handle=${encodedHandle}&from=1&count=10000`
);
await wait(API_DELAY_MS);
const ratingHistory = await requestJson(`${base}/user.rating?handle=${encodedHandle}`);

const solved = new Set();
const difficultyStats = {};
for (const submission of submissions) {
  if (submission.verdict !== 'OK') continue;
  const problem = submission.problem ?? {};
  const key = `${problem.contestId ?? 'gym'}:${problem.index ?? 'unknown'}`;
  if (solved.has(key)) continue;
  solved.add(key);
  if (problem.rating !== undefined) {
    const rating = String(problem.rating);
    difficultyStats[rating] = (difficultyStats[rating] ?? 0) + 1;
  }
}

const records = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const nextRecord = {
  id: `cf-${studentId}`,
  periodId,
  studentId,
  handle: user.handle,
  totalSolved: solved.size,
  difficultyStats,
  rating: user.rating,
  maxRating: user.maxRating,
  contestCount: ratingHistory.length,
  source: 'API',
  fetchedAt: new Date().toISOString(),
  isManualOverride: false
};

const nextRecords = records.filter(
  (record) => !(record.periodId === periodId && record.studentId === studentId)
);
nextRecords.push(nextRecord);
nextRecords.sort((a, b) => a.studentId.localeCompare(b.studentId));
fs.writeFileSync(dataPath, `${JSON.stringify(nextRecords, null, 2)}\n`, 'utf8');
console.log(
  `saved ${user.handle}: ${solved.size} solved, ${ratingHistory.length} contests -> ${path.relative(root, dataPath)}`
);
