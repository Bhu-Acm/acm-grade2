import type {
  CodeforcesContestHistoryItem,
  CodeforcesRecord,
  CodeforcesSolvedProblem,
  DifficultyStats,
  ExamPeriod,
  ScoreboardRow,
  ScoringRule,
  Student
} from '../types';
import { calculateStudentScore } from './score';

export type ScoreWindowKey = '7d' | '30d' | 'all';

export interface ScoreWindow {
  key: ScoreWindowKey;
  label: string;
  startDate: string;
  endDate: string;
  anchorDate: string;
}

export interface ScoreboardBuildOptions {
  window?: ScoreWindow;
}

function compareNullableDesc(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  const next = parseDate(value);
  next.setUTCDate(next.getUTCDate() + days);
  return formatDate(next);
}

function minDate(left: string, right: string): string {
  return left <= right ? left : right;
}

function maxDate(left: string, right: string): string {
  return left >= right ? left : right;
}

function inWindow(date: string, window: ScoreWindow): boolean {
  return date >= window.startDate && date <= window.endDate;
}

function toDifficultyStats(records: CodeforcesSolvedProblem[]): DifficultyStats {
  return records.reduce<DifficultyStats>((stats, record) => {
    const key = record.rating === undefined ? 'UNRATED' : String(record.rating);
    stats[key] = (stats[key] ?? 0) + 1;
    return stats;
  }, {});
}

function normalizeDifficultyStatsTotal(
  difficultyStats: DifficultyStats,
  totalSolved: number
): DifficultyStats {
  const normalized = { ...difficultyStats };
  const counted = Object.values(normalized).reduce((sum, value) => sum + Number(value), 0);
  const unrated = Math.max(0, totalSolved - counted);
  if (unrated > 0) {
    normalized.UNRATED = (normalized.UNRATED ?? 0) + unrated;
  }
  return normalized;
}

function pickStudentCodeforcesRecord(
  records: CodeforcesRecord[],
  student: Student
): CodeforcesRecord | undefined {
  const expectedHandle = String(student.codeforcesHandle ?? '').trim().toLowerCase();
  return records
    .filter((item) => item.studentId === student.id)
    .sort((left, right) => {
      const leftHandleMatch = String(left.handle ?? '').trim().toLowerCase() === expectedHandle ? 1 : 0;
      const rightHandleMatch = String(right.handle ?? '').trim().toLowerCase() === expectedHandle ? 1 : 0;
      return rightHandleMatch - leftHandleMatch || String(right.fetchedAt).localeCompare(String(left.fetchedAt));
    })[0];
}

function dedupeSolvedHistory(records: CodeforcesSolvedProblem[]): CodeforcesSolvedProblem[] {
  return [...new Map(records.map((record) => [record.problemKey, record])).values()].sort(
    (left, right) => left.solvedAt.localeCompare(right.solvedAt)
  );
}

function dedupeContestHistory(
  records: CodeforcesContestHistoryItem[]
): CodeforcesContestHistoryItem[] {
  return [...new Map(records.map((record) => [record.contestId, record])).values()].sort(
    (left, right) =>
      left.contestDate.localeCompare(right.contestDate) ||
      left.contestId - right.contestId
  );
}

function latestContestBefore(
  record: CodeforcesRecord,
  endDate: string
): CodeforcesContestHistoryItem | undefined {
  return [...(record.contestHistory ?? [])]
    .filter((item) => item.contestDate <= endDate)
    .sort((left, right) => right.contestDate.localeCompare(left.contestDate))[0];
}

function latestSnapshotBefore(record: CodeforcesRecord, endDate: string) {
  return [...(record.snapshots ?? [])]
    .filter((item) => item.fetchedAt.slice(0, 10) <= endDate)
    .sort((left, right) => right.fetchedAt.localeCompare(left.fetchedAt))[0];
}

function resolveWindowRating(record: CodeforcesRecord, endDate: string): number | undefined {
  const snapshot = latestSnapshotBefore(record, endDate);
  if (snapshot?.rating !== undefined) return snapshot.rating;

  const contest = latestContestBefore(record, endDate);
  if (contest?.newRating !== undefined) return contest.newRating;

  return record.rating;
}

function resolveWindowMaxRating(record: CodeforcesRecord, endDate: string): number | undefined {
  const snapshot = latestSnapshotBefore(record, endDate);
  if (snapshot?.maxRating !== undefined) return snapshot.maxRating;

  const ratings = (record.contestHistory ?? [])
    .filter((item) => item.contestDate <= endDate)
    .flatMap((item) => (item.newRating === undefined ? [] : [item.newRating]));
  if (ratings.length) return Math.max(...ratings);

  return record.maxRating;
}

export function resolveWindowAnchor(
  period: ExamPeriod,
  today = new Date().toISOString().slice(0, 10)
): string {
  return minDate(maxDate(today, period.startDate), period.endDate);
}

export function createScoreWindow(
  period: ExamPeriod,
  key: ScoreWindowKey,
  today = new Date().toISOString().slice(0, 10)
): ScoreWindow {
  const anchorDate = resolveWindowAnchor(period, today);
  if (key === 'all') {
    return {
      key,
      label: '全部',
      startDate: period.startDate,
      endDate: anchorDate,
      anchorDate
    };
  }

  const lookbackDays = key === '7d' ? 7 : 30;
  return {
    key,
    label: key === '7d' ? '近 7 天' : '近 30 天',
    startDate: maxDate(period.startDate, addDays(anchorDate, -(lookbackDays - 1))),
    endDate: anchorDate,
    anchorDate
  };
}

export function buildWindowedCodeforcesRecord(
  record: CodeforcesRecord | undefined,
  window: ScoreWindow
): CodeforcesRecord | undefined {
  if (!record) return undefined;

  const solvedHistory = dedupeSolvedHistory(
    (record.solvedHistory ?? []).filter((item) => inWindow(item.solvedAt.slice(0, 10), window))
  );
  const contestHistory = dedupeContestHistory(
    (record.contestHistory ?? []).filter((item) => inWindow(item.contestDate, window))
  );

  const canSliceSolved = (record.solvedHistory?.length ?? 0) > 0;
  const canSliceContests = (record.contestHistory?.length ?? 0) > 0;
  const contestRankPercentiles = canSliceContests
    ? contestHistory.flatMap((item) =>
        typeof item.percentile === 'number' ? [item.percentile] : []
      )
    : record.contestRankPercentiles;

  return {
    ...record,
    totalSolved: canSliceSolved ? solvedHistory.length : record.totalSolved,
    difficultyStats: normalizeDifficultyStatsTotal(
      canSliceSolved ? toDifficultyStats(solvedHistory) : record.difficultyStats,
      canSliceSolved ? solvedHistory.length : record.totalSolved
    ),
    contestCount: canSliceContests ? contestHistory.length : record.contestCount,
    contestRankPercentiles,
    rating: resolveWindowRating(record, window.endDate),
    maxRating: resolveWindowMaxRating(record, window.endDate),
    solvedHistory: canSliceSolved ? solvedHistory : record.solvedHistory,
    contestHistory: canSliceContests ? contestHistory : record.contestHistory
  };
}

export function buildTrendDates(
  period: ExamPeriod,
  points = 6,
  today = new Date().toISOString().slice(0, 10)
): string[] {
  const anchorDate = resolveWindowAnchor(period, today);
  const start = parseDate(period.startDate).getTime();
  const end = parseDate(anchorDate).getTime();
  if (end <= start || points <= 1) return [period.startDate, anchorDate];

  const step = (end - start) / (points - 1);
  return [...new Set(Array.from({ length: points }, (_, index) => {
    if (index === 0) return period.startDate;
    if (index === points - 1) return anchorDate;
    return formatDate(new Date(Math.round(start + step * index)));
  }))];
}

export function buildScoreboard(
  students: Student[],
  rule: ScoringRule,
  inputs: {
    attendance: import('../types').AttendanceRecord[];
    nowcoder: import('../types').NowcoderContestScore[];
    codeforces: import('../types').CodeforcesRecord[];
  },
  options: ScoreboardBuildOptions = {}
): ScoreboardRow[] {
  const rows = students
    .filter((student) => student.status === 'ACTIVE')
    .map((student) => {
      const nowcoderRecords = inputs.nowcoder.filter(
        (item) =>
          item.studentId === student.id &&
          (!options.window || inWindow(item.contestDate, options.window))
      );
      const codeforcesRecord = buildWindowedCodeforcesRecord(
        pickStudentCodeforcesRecord(inputs.codeforces, student),
        options.window ??
          ({
            key: 'all',
            label: '全部',
            startDate: '',
            endDate: '9999-12-31',
            anchorDate: '9999-12-31'
          } satisfies ScoreWindow)
      );
      const result = calculateStudentScore(
        student.id,
        rule,
        inputs.attendance.find((item) => item.studentId === student.id),
        nowcoderRecords,
        codeforcesRecord
      );
      return { student, ...result };
    })
    .sort((left, right) => {
      return (
        compareNullableDesc(left.totalScore, right.totalScore) ||
        compareNullableDesc(left.breakdown.codeforcesRating, right.breakdown.codeforcesRating) ||
        compareNullableDesc(
          left.breakdown.codeforcesDifficulty,
          right.breakdown.codeforcesDifficulty
        ) ||
        compareNullableDesc(
          left.breakdown.nowcoderPerformance,
          right.breakdown.nowcoderPerformance
        ) ||
        compareNullableDesc(left.breakdown.attendance, right.breakdown.attendance) ||
        left.student.studentNo.localeCompare(right.student.studentNo)
      );
    });

  let previousScore: number | null = null;
  let previousRank = 0;
  rows.forEach((row, index) => {
    if (row.totalScore !== previousScore) {
      previousRank = index + 1;
      previousScore = row.totalScore;
    }
    row.rank = row.totalScore === null ? undefined : previousRank;
  });
  return rows;
}
