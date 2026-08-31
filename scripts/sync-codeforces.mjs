import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  canUseCodeforcesIncrementalSync,
  fetchCodeforcesData,
  normalizeCodeforcesRecord,
  pickCodeforcesRecord
} from './lib/codeforces-sync.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'src', 'data', 'codeforces.json');
const periodsPath = path.join(root, 'src', 'data', 'periods.json');

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

function requiredArgument(name) {
  const value = argument(name);
  if (!value) {
    throw new Error(`缺少参数 --${name}`);
  }
  return value;
}

const studentId = requiredArgument('studentId');
const handle = requiredArgument('handle');
const periodId = argument('periodId', 'period-2026-spring');
const outputPath = path.resolve(root, argument('output', path.relative(root, dataPath)));
const today = new Date().toISOString().slice(0, 10);

const records = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, 'utf8')) : [];
const periods = fs.existsSync(periodsPath) ? JSON.parse(fs.readFileSync(periodsPath, 'utf8')) : [];
const period = periods.find((item) => item.id === periodId) ?? {
  id: periodId,
  startDate: '1970-01-01',
  endDate: today
};
const percentileToDate = today < period.endDate ? today : period.endDate;
const previousRecord = pickCodeforcesRecord(
  records,
  periodId,
  studentId,
  handle
);
const useIncremental = canUseCodeforcesIncrementalSync(previousRecord, handle);
const payload = await fetchCodeforcesData(handle, {
  submissionSinceTime: useIncremental ? previousRecord?.fetchedAt : undefined,
  percentileFromDate: useIncremental
    ? (previousRecord?.fetchedAt?.slice(0, 10) ?? period.startDate) >= period.startDate
      ? previousRecord?.fetchedAt?.slice(0, 10) ?? period.startDate
      : period.startDate
    : period.startDate,
  percentileToDate,
  cachedContestHistory: useIncremental ? previousRecord?.contestHistory : undefined
});
const nextRecord = normalizeCodeforcesRecord(periodId, studentId, payload, previousRecord);
const nextRecords = records.filter(
  (record) => !(record.periodId === periodId && record.studentId === studentId)
);

nextRecords.push(nextRecord);
nextRecords.sort((left, right) => left.studentId.localeCompare(right.studentId));
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(nextRecords, null, 2)}\n`, 'utf8');
console.log(
  JSON.stringify(
    {
      studentId,
      handle: nextRecord.handle,
      incrementalSince: previousRecord?.fetchedAt ?? null,
      totalSolved: nextRecord.totalSolved,
      contestCount: nextRecord.contestCount,
      contestPercentiles: nextRecord.contestRankPercentiles?.length ?? 0,
      output: path.relative(root, outputPath)
    },
    null,
    2
  )
);
