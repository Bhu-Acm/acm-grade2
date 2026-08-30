import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutput = path.join(root, 'src', 'data', 'nowcoder.json');
const API_ORIGIN = 'https://ac.nowcoder.com';
const API_PATH = '/acm-heavy/acm/contest/profile/contest-joined-history';
const REQUEST_DELAY_MS = 1200;

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requiredArgument(name) {
  const value = argument(name);
  if (!value) throw new Error(`缺少参数 --${name}`);
  return value;
}

function parsePositiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`--${name} 必须是正整数`);
  }
  return parsed;
}

function toDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`无法解析日期: ${value}`);
  return date;
}

function formatDate(milliseconds) {
  return new Date(milliseconds).toISOString().slice(0, 10);
}

function normalizedContestScore(rank, participantCount) {
  if (rank <= 0 || participantCount <= 0) return 0;
  return Math.round((((participantCount - rank + 1) / participantCount) * 100 + Number.EPSILON) * 100) / 100;
}

function requestUrl(userId, page, pageSize, ratingOnly) {
  const query = new URLSearchParams({
    uid: userId,
    page: String(page),
    pageSize: String(pageSize),
    searchContestName: '',
    onlyJoinedFilter: 'true',
    onlyRatingFilter: String(ratingOnly),
    contestEndFilter: 'true'
  });
  return `${API_ORIGIN}${API_PATH}?${query.toString()}`;
}

async function requestPage(userId, page, pageSize, ratingOnly) {
  const response = await fetch(requestUrl(userId, page, pageSize, ratingOnly), {
    headers: {
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'acm-grade2-nowcoder-sync/1.0'
    }
  });
  if (!response.ok) {
    throw new Error(`牛客接口 HTTP ${response.status}，请稍后重试`);
  }

  const payload = await response.json();
  if (payload.code !== 0 || payload.msg !== 'OK' || !payload.data) {
    throw new Error(payload.msg || '牛客接口返回失败');
  }
  return payload.data;
}

function mapContest(record, userId, studentId, periodId) {
  if (!record.contestId || !record.contestName || !record.startTime) return null;
  return {
    id: `nc-${periodId}-${studentId}-${record.contestId}`,
    periodId,
    studentId,
    contestId: String(record.contestId),
    contestName: record.contestName,
    contestDate: formatDate(record.startTime),
    participantCount: Number(record.userCount || record.signUpCnt || 0),
    rank: Number(record.rank || 0),
    solvedCount: Number(record.acceptedCount || 0),
    source: 'SCRIPT',
    isManualOverride: false,
    nowcoderUserId: String(userId),
    contestScore: normalizedContestScore(
      Number(record.rank || 0),
      Number(record.userCount || record.signUpCnt || 0)
    ),
    platformScore: Number(record.totalScore || 0),
    rating: Number(record.rating || 0),
    ratingChange: Number(record.changeValue || 0),
    remark: `牛客用户 ${userId} 自动抓取，Rating ${record.ratingStr || record.rating || '--'}`,
    updatedAt: new Date().toISOString()
  };
}

function sourcePriority(record) {
  if (record.isManualOverride || record.source === 'MANUAL') return 4;
  if (record.source === 'IMPORT') return 3;
  if (record.source === 'SCRIPT') return 2;
  return 1;
}

function mergeRecords(existing, incoming) {
  const merged = new Map(
    existing.map((record) => [`${record.periodId}:${record.studentId}:${record.contestId}`, record])
  );
  let added = 0;
  let updated = 0;
  let preservedManual = 0;

  for (const record of incoming) {
    const key = `${record.periodId}:${record.studentId}:${record.contestId}`;
    const previous = merged.get(key);
    if (!previous) {
      merged.set(key, record);
      added += 1;
      continue;
    }
    if (sourcePriority(previous) > sourcePriority(record)) {
      preservedManual += 1;
      continue;
    }
    merged.set(key, record);
    updated += 1;
  }

  return {
    records: [...merged.values()].sort(
      (a, b) => b.contestDate.localeCompare(a.contestDate) || a.studentId.localeCompare(b.studentId)
    ),
    added,
    updated,
    preservedManual
  };
}

const userId = requiredArgument('nowcoderId');
const studentId = requiredArgument('studentId');
const periodId = argument('periodId', 'period-2026-spring');
const pageSize = parsePositiveInteger(argument('page-size', '100'), 'page-size');
const maxPages = argument('max-pages') ? parsePositiveInteger(argument('max-pages'), 'max-pages') : Infinity;
const outputPath = path.resolve(root, argument('output', path.relative(root, defaultOutput)));
const from = argument('from') ? toDate(argument('from')) : null;
const to = argument('to') ? toDate(argument('to')) : null;
const ratingOnly = hasFlag('rating-only');
const dryRun = hasFlag('dry-run');

let page = 1;
let pageCount = 1;
const scraped = [];

while (page <= pageCount && page <= maxPages) {
  const data = await requestPage(userId, page, pageSize, ratingOnly);
  pageCount = Number(data.pageInfo?.pageCount || 1);
  for (const item of data.dataList || []) {
    const record = mapContest(item, userId, studentId, periodId);
    if (!record) continue;
    const date = toDate(record.contestDate);
    if (from && date < from) continue;
    if (to && date > to) continue;
    if (record.participantCount <= 0 || record.rank <= 0) continue;
    scraped.push(record);
  }
  if (page < pageCount) await wait(REQUEST_DELAY_MS);
  page += 1;
}

const existing = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, 'utf8')) : [];
const result = mergeRecords(existing, scraped);

if (!dryRun) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(result.records, null, 2)}\n`, 'utf8');
}

console.log(
  JSON.stringify(
    {
      nowcoderId: userId,
      studentId,
      periodId,
      pages: Math.min(page - 1, pageCount),
      scraped: scraped.length,
      added: result.added,
      updated: result.updated,
      preservedManual: result.preservedManual,
      output: dryRun ? null : path.relative(root, outputPath),
      dryRun
    },
    null,
    2
  )
);
