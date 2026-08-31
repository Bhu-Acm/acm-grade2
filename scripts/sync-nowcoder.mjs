import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  fetchNowcoderRecords,
  inferIncrementalFrom,
  mergeNowcoderRecords
} from './lib/nowcoder-sync.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutput = path.join(root, 'src', 'data', 'nowcoder.json');

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
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

const userId = requiredArgument('nowcoderId');
const studentId = requiredArgument('studentId');
const periodId = argument('periodId', 'period-2026-spring');
const pageSize = parsePositiveInteger(argument('page-size', '100'), 'page-size');
const maxPages = argument('max-pages')
  ? parsePositiveInteger(argument('max-pages'), 'max-pages')
  : Infinity;
const outputPath = path.resolve(root, argument('output', path.relative(root, defaultOutput)));
const ratingOnly = hasFlag('rating-only');
const dryRun = hasFlag('dry-run');

const existing = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, 'utf8')) : [];
const from = argument('from') ?? inferIncrementalFrom(existing, periodId, studentId, '1970-01-01');
const to = argument('to') ?? null;
const payload = await fetchNowcoderRecords({
  userId,
  studentId,
  periodId,
  pageSize,
  maxPages,
  ratingOnly,
  from,
  to
});
const result = mergeNowcoderRecords(existing, payload.records);

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
      from,
      to,
      pages: payload.pages,
      scraped: payload.records.length,
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
