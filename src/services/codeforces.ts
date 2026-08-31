import { clamp, round2 } from '../domain/math';
import type {
  CodeforcesContestHistoryItem,
  CodeforcesRecord,
  CodeforcesSnapshot,
  CodeforcesSolvedProblem,
  DifficultyStats
} from '../types';

export interface CodeforcesUserInfo {
  handle: string;
  rating?: number;
  maxRating?: number;
}

export interface CodeforcesProblem {
  contestId?: number;
  index?: string;
  rating?: number;
}

export interface CodeforcesSubmission {
  verdict?: string;
  creationTimeSeconds?: number;
  problem: CodeforcesProblem;
}

export interface CodeforcesRatingChange {
  contestId: number;
  contestName?: string;
  rank?: number;
  oldRating?: number;
  newRating?: number;
  ratingUpdateTimeSeconds?: number;
}

export interface CodeforcesContestPercentile {
  contestId: number;
  percentile: number;
}

export interface CodeforcesFetchOptions {
  submissionSinceTime?: string;
  percentileFromDate?: string;
  percentileToDate?: string;
  cachedContestHistory?: CodeforcesContestHistoryItem[];
}

export interface CodeforcesApiResponse<T> {
  status: 'OK' | 'FAILED';
  result: T;
  comment?: string;
}

const API_DELAY_MS = 2100;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function toIsoDateTime(seconds?: number): string | undefined {
  if (!seconds) return undefined;
  return new Date(seconds * 1000).toISOString();
}

function toIsoDate(seconds?: number): string | undefined {
  return toIsoDateTime(seconds)?.slice(0, 10);
}

function normalizeDifficultyStats(history: CodeforcesSolvedProblem[]): DifficultyStats {
  return history.reduce<DifficultyStats>((stats, item) => {
    const key = item.rating === undefined ? 'UNRATED' : String(item.rating);
    stats[key] = (stats[key] ?? 0) + 1;
    return stats;
  }, {});
}

function normalizeHandle(handle?: string): string {
  return String(handle ?? '').trim().toLowerCase();
}

function mergeSolvedHistory(
  previous: CodeforcesSolvedProblem[] = [],
  current: CodeforcesSolvedProblem[]
): CodeforcesSolvedProblem[] {
  return [...new Map([...previous, ...current].map((item) => [item.problemKey, item])).values()].sort(
    (left, right) => left.solvedAt.localeCompare(right.solvedAt)
  );
}

function mergeContestHistory(
  previous: CodeforcesContestHistoryItem[] = [],
  current: CodeforcesContestHistoryItem[]
): CodeforcesContestHistoryItem[] {
  return [...new Map([...previous, ...current].map((item) => [item.contestId, item])).values()].sort(
    (left, right) =>
      left.contestDate.localeCompare(right.contestDate) ||
      left.contestId - right.contestId
  );
}

function mergeSnapshots(
  previous: CodeforcesSnapshot[] = [],
  current: CodeforcesSnapshot
): CodeforcesSnapshot[] {
  return [...new Map([...previous, current].map((item) => [item.fetchedAt, item])).values()].sort(
    (left, right) => left.fetchedAt.localeCompare(right.fetchedAt)
  );
}

async function requestJson<T>(url: string): Promise<CodeforcesApiResponse<T>> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Codeforces HTTP ${response.status}`);
  return (await response.json()) as CodeforcesApiResponse<T>;
}

async function requestContestPercentile(
  handle: string,
  contestId: number
): Promise<CodeforcesContestPercentile | null> {
  const base = 'https://codeforces.com/api';
  const standings = await requestJson<{
    contest: { id: number };
    rows: Array<{
      rank: number;
      party: { members?: Array<{ handle?: string }> };
    }>;
  }>(`${base}/contest.standings?contestId=${contestId}`);

  if (standings.status !== 'OK') {
    return null;
  }

  const rows = standings.result.rows ?? [];
  if (!rows.length) return null;

  const row = rows.find((item) =>
    item.party.members?.some((member) => member.handle?.toLowerCase() === handle.toLowerCase())
  );
  if (!row || row.rank <= 0) return null;

  return {
    contestId,
    percentile: round2(clamp(((rows.length - row.rank + 1) / rows.length) * 100))
  };
}

async function requestContestPercentiles(
  handle: string,
  ratingHistory: CodeforcesRatingChange[]
): Promise<CodeforcesContestPercentile[]> {
  const result: CodeforcesContestPercentile[] = [];
  for (const item of ratingHistory) {
    const percentile = await requestContestPercentile(handle, item.contestId);
    if (percentile !== null) result.push(percentile);
    await wait(API_DELAY_MS);
  }
  return result;
}

function inDateRange(
  seconds: number | undefined,
  fromDate?: string,
  toDate?: string
): boolean {
  const date = toIsoDate(seconds);
  if (!date) return false;
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;
  return true;
}

function filterIncrementalSubmissions(
  submissions: CodeforcesSubmission[],
  submissionSinceTime?: string
) {
  if (!submissionSinceTime) return submissions;
  const sinceTime = Date.parse(submissionSinceTime);
  if (Number.isNaN(sinceTime)) return submissions;
  return submissions.filter(
    (item) =>
      typeof item.creationTimeSeconds === 'number' &&
      item.creationTimeSeconds * 1000 > sinceTime
  );
}

function buildSolvedHistory(submissions: CodeforcesSubmission[]): CodeforcesSolvedProblem[] {
  const earliestByProblem = new Map<string, CodeforcesSolvedProblem>();

  submissions.forEach((submission) => {
    if (submission.verdict !== 'OK' || !submission.creationTimeSeconds) return;

    const problemKey = `${submission.problem.contestId ?? 'gym'}:${submission.problem.index ?? 'unknown'}`;
    const record: CodeforcesSolvedProblem = {
      problemKey,
      solvedAt: new Date(submission.creationTimeSeconds * 1000).toISOString(),
      contestId: submission.problem.contestId,
      index: submission.problem.index,
      rating: submission.problem.rating
    };
    const previous = earliestByProblem.get(problemKey);
    if (!previous || record.solvedAt < previous.solvedAt) {
      earliestByProblem.set(problemKey, record);
    }
  });

  return [...earliestByProblem.values()].sort((left, right) => left.solvedAt.localeCompare(right.solvedAt));
}

function buildContestHistory(
  ratingHistory: CodeforcesRatingChange[],
  contestPercentiles: CodeforcesContestPercentile[]
): CodeforcesContestHistoryItem[] {
  const percentileByContest = new Map(
    contestPercentiles.map((item) => [item.contestId, item.percentile])
  );

  return ratingHistory
    .map((item) => ({
      contestId: item.contestId,
      contestName: item.contestName,
      contestDate: toIsoDate(item.ratingUpdateTimeSeconds) ?? '1970-01-01',
      ratingUpdateTime: toIsoDateTime(item.ratingUpdateTimeSeconds),
      rank: item.rank,
      oldRating: item.oldRating,
      newRating: item.newRating,
      percentile: percentileByContest.get(item.contestId) ?? null
    }))
    .sort((left, right) => left.contestDate.localeCompare(right.contestDate));
}

export function normalizeCodeforcesApi(
  periodId: string,
  studentId: string,
  user: CodeforcesUserInfo,
  submissions: CodeforcesSubmission[],
  ratingHistory: CodeforcesRatingChange[] = [],
  contestPercentiles: CodeforcesContestPercentile[] = [],
  previousRecord?: CodeforcesRecord,
  fetchedAt = new Date().toISOString()
): Omit<CodeforcesRecord, 'id'> {
  const solvedHistory = mergeSolvedHistory(
    previousRecord?.solvedHistory,
    buildSolvedHistory(submissions)
  );
  const difficultyStats = normalizeDifficultyStats(solvedHistory);
  const contestHistory = mergeContestHistory(
    previousRecord?.contestHistory,
    buildContestHistory(ratingHistory, contestPercentiles)
  );
  const snapshots = mergeSnapshots(previousRecord?.snapshots, {
    fetchedAt,
    totalSolved: solvedHistory.length,
    difficultyStats,
    rating: user.rating,
    maxRating: user.maxRating,
    contestCount: contestHistory.length
  });

  return {
    periodId,
    studentId,
    handle: user.handle,
    totalSolved: solvedHistory.length,
    difficultyStats,
    rating: user.rating,
    maxRating: user.maxRating,
    contestCount: contestHistory.length,
    contestRankPercentiles: contestHistory.flatMap((item) =>
      typeof item.percentile === 'number' ? [item.percentile] : []
    ),
    solvedHistory,
    contestHistory,
    snapshots,
    source: 'API',
    fetchedAt,
    isManualOverride: false
  };
}

export function pickCodeforcesRecord(
  records: CodeforcesRecord[],
  periodId: string,
  studentId: string,
  handle?: string
): CodeforcesRecord | undefined {
  const normalizedHandle = normalizeHandle(handle);
  return records
    .filter((item) => item.periodId === periodId && item.studentId === studentId)
    .sort((left, right) => {
      const leftHandleMatch = normalizeHandle(left.handle) === normalizedHandle ? 1 : 0;
      const rightHandleMatch = normalizeHandle(right.handle) === normalizedHandle ? 1 : 0;
      return (
        rightHandleMatch - leftHandleMatch ||
        right.fetchedAt.localeCompare(left.fetchedAt)
      );
    })[0];
}

export function canUseCodeforcesIncrementalSync(
  record: CodeforcesRecord | undefined,
  handle?: string
): boolean {
  if (!record) return false;
  if (handle && normalizeHandle(record.handle) !== normalizeHandle(handle)) return false;
  return (
    (record.solvedHistory?.length ?? 0) > 0 &&
    (record.contestHistory?.length ?? 0) > 0 &&
    typeof record.fetchedAt === 'string' &&
    record.fetchedAt.length > 0
  );
}

export async function fetchCodeforcesData(
  handle: string,
  options: CodeforcesFetchOptions = {}
): Promise<{
  user: CodeforcesUserInfo;
  submissions: CodeforcesSubmission[];
  ratingHistory: CodeforcesRatingChange[];
  contestPercentiles: CodeforcesContestPercentile[];
}> {
  const base = 'https://codeforces.com/api';
  const user = await requestJson<CodeforcesUserInfo[]>(
    `${base}/user.info?handles=${encodeURIComponent(handle)}`
  );
  await wait(API_DELAY_MS);
  const submissions = await requestJson<CodeforcesSubmission[]>(
    `${base}/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`
  );
  await wait(API_DELAY_MS);
  const ratingHistory = await requestJson<CodeforcesRatingChange[]>(
    `${base}/user.rating?handle=${encodeURIComponent(handle)}`
  );

  if (user.status !== 'OK') {
    throw new Error(user.comment || 'Codeforces 用户不存在或 API 返回失败');
  }
  if (submissions.status !== 'OK') {
    throw new Error(submissions.comment || 'Codeforces 提交记录读取失败');
  }
  if (ratingHistory.status !== 'OK') {
    throw new Error(ratingHistory.comment || 'Codeforces 比赛记录读取失败');
  }

  const cachedPercentiles = new Map(
    (options.cachedContestHistory ?? [])
      .filter((item) => typeof item.percentile === 'number')
      .map((item) => [item.contestId, item.percentile as number])
  );
  const ratingHistoryInRange = ratingHistory.result.filter((item) =>
    inDateRange(item.ratingUpdateTimeSeconds, options.percentileFromDate, options.percentileToDate)
  );
  const contestsToFetch = ratingHistoryInRange.filter(
    (item) => !cachedPercentiles.has(item.contestId)
  );
  const fetchedPercentiles = await requestContestPercentiles(user.result[0].handle, contestsToFetch);

  return {
    user: user.result[0],
    submissions: filterIncrementalSubmissions(
      submissions.result,
      options.submissionSinceTime
    ),
    ratingHistory: ratingHistory.result,
    contestPercentiles: [
      ...[...cachedPercentiles.entries()].map(([contestId, percentile]) => ({
        contestId,
        percentile
      })),
      ...fetchedPercentiles
    ]
  };
}
