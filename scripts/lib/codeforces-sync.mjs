const API_DELAY_MS = 2100;
const API_BASE = 'https://codeforces.com/api';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function toIsoDateTime(seconds) {
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : undefined;
}

function toIsoDate(seconds) {
  return toIsoDateTime(seconds)?.slice(0, 10);
}

function normalizeDifficultyStats(history) {
  return history.reduce((stats, item) => {
    const key = item.rating === undefined ? 'UNRATED' : String(item.rating);
    stats[key] = (stats[key] ?? 0) + 1;
    return stats;
  }, {});
}

function normalizeHandle(handle) {
  return String(handle ?? '').trim().toLowerCase();
}

function mergeSolvedHistory(previous = [], current = []) {
  return [...new Map([...previous, ...current].map((item) => [item.problemKey, item])).values()].sort(
    (left, right) => left.solvedAt.localeCompare(right.solvedAt)
  );
}

function mergeContestHistory(previous = [], current = []) {
  return [...new Map([...previous, ...current].map((item) => [item.contestId, item])).values()].sort(
    (left, right) =>
      left.contestDate.localeCompare(right.contestDate) ||
      left.contestId - right.contestId
  );
}

function mergeSnapshots(previous = [], current) {
  return [...new Map([...previous, current].map((item) => [item.fetchedAt, item])).values()].sort(
    (left, right) => left.fetchedAt.localeCompare(right.fetchedAt)
  );
}

async function requestJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Codeforces HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.status !== 'OK') {
    throw new Error(payload.comment || 'Codeforces API 返回失败');
  }
  return payload.result;
}

async function requestContestPercentile(handle, contestId) {
  const standings = await requestJson(`${API_BASE}/contest.standings?contestId=${contestId}`);
  const rows = standings.rows ?? [];
  if (!rows.length) return null;

  const row = rows.find((item) =>
    item.party?.members?.some(
      (member) => String(member.handle || '').toLowerCase() === String(handle).toLowerCase()
    )
  );
  if (!row || row.rank <= 0) return null;

  return {
    contestId,
    percentile: round2(clamp(((rows.length - row.rank + 1) / rows.length) * 100))
  };
}

async function requestContestPercentiles(handle, ratingHistory) {
  const result = [];
  for (const item of ratingHistory) {
    const percentile = await requestContestPercentile(handle, item.contestId);
    if (percentile) result.push(percentile);
    await wait(API_DELAY_MS);
  }
  return result;
}

function inDateRange(seconds, fromDate, toDate) {
  const date = toIsoDate(seconds);
  if (!date) return false;
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;
  return true;
}

function filterIncrementalSubmissions(submissions, submissionSinceTime) {
  if (!submissionSinceTime) return submissions;
  const sinceTime = Date.parse(submissionSinceTime);
  if (Number.isNaN(sinceTime)) return submissions;
  return submissions.filter(
    (item) =>
      typeof item.creationTimeSeconds === 'number' &&
      item.creationTimeSeconds * 1000 > sinceTime
  );
}

function buildSolvedHistory(submissions) {
  const earliestByProblem = new Map();

  for (const submission of submissions) {
    if (submission.verdict !== 'OK' || !submission.creationTimeSeconds) continue;

    const problem = submission.problem ?? {};
    const problemKey = `${problem.contestId ?? 'gym'}:${problem.index ?? 'unknown'}`;
    const record = {
      problemKey,
      solvedAt: new Date(submission.creationTimeSeconds * 1000).toISOString(),
      contestId: problem.contestId,
      index: problem.index,
      rating: problem.rating
    };
    const previous = earliestByProblem.get(problemKey);
    if (!previous || record.solvedAt < previous.solvedAt) {
      earliestByProblem.set(problemKey, record);
    }
  }

  return [...earliestByProblem.values()].sort((left, right) => left.solvedAt.localeCompare(right.solvedAt));
}

function buildContestHistory(ratingHistory, contestPercentiles) {
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

export async function fetchCodeforcesData(handle, options = {}) {
  const encodedHandle = encodeURIComponent(handle);
  const user = (await requestJson(`${API_BASE}/user.info?handles=${encodedHandle}`))[0];
  await wait(API_DELAY_MS);
  const submissions = await requestJson(
    `${API_BASE}/user.status?handle=${encodedHandle}&from=1&count=10000`
  );
  await wait(API_DELAY_MS);
  const ratingHistory = await requestJson(`${API_BASE}/user.rating?handle=${encodedHandle}`);
  const cachedPercentiles = new Map(
    (options.cachedContestHistory ?? [])
      .filter((item) => typeof item.percentile === 'number')
      .map((item) => [item.contestId, item.percentile])
  );
  const ratingHistoryInRange = ratingHistory.filter((item) =>
    inDateRange(item.ratingUpdateTimeSeconds, options.percentileFromDate, options.percentileToDate)
  );
  const contestsToFetch = ratingHistoryInRange.filter((item) => !cachedPercentiles.has(item.contestId));
  const fetchedPercentiles = await requestContestPercentiles(user.handle, contestsToFetch);

  return {
    user,
    submissions: filterIncrementalSubmissions(submissions, options.submissionSinceTime),
    ratingHistory,
    contestPercentiles: [
      ...[...cachedPercentiles.entries()].map(([contestId, percentile]) => ({
        contestId,
        percentile
      })),
      ...fetchedPercentiles
    ]
  };
}

export function normalizeCodeforcesRecord(
  periodId,
  studentId,
  payload,
  previousRecord,
  fetchedAt = new Date().toISOString()
) {
  const solvedHistory = mergeSolvedHistory(previousRecord?.solvedHistory, buildSolvedHistory(payload.submissions));
  const difficultyStats = normalizeDifficultyStats(solvedHistory);
  const contestHistory = mergeContestHistory(
    previousRecord?.contestHistory,
    buildContestHistory(payload.ratingHistory, payload.contestPercentiles)
  );

  return {
    id: previousRecord?.id ?? `cf-${studentId}`,
    periodId,
    studentId,
    handle: payload.user.handle,
    totalSolved: solvedHistory.length,
    difficultyStats,
    rating: payload.user.rating,
    maxRating: payload.user.maxRating,
    contestCount: contestHistory.length,
    contestRankPercentiles: contestHistory.flatMap((item) =>
      typeof item.percentile === 'number' ? [item.percentile] : []
    ),
    solvedHistory,
    contestHistory,
    snapshots: mergeSnapshots(previousRecord?.snapshots, {
      fetchedAt,
      totalSolved: solvedHistory.length,
      difficultyStats,
      rating: payload.user.rating,
      maxRating: payload.user.maxRating,
      contestCount: contestHistory.length
    }),
    source: 'API',
    fetchedAt,
    isManualOverride: false
  };
}

export function pickCodeforcesRecord(records, periodId, studentId, handle) {
  const normalizedHandle = normalizeHandle(handle);
  return records
    .filter((item) => item.periodId === periodId && item.studentId === studentId)
    .sort((left, right) => {
      const leftHandleMatch = normalizeHandle(left.handle) === normalizedHandle ? 1 : 0;
      const rightHandleMatch = normalizeHandle(right.handle) === normalizedHandle ? 1 : 0;
      return rightHandleMatch - leftHandleMatch || String(right.fetchedAt).localeCompare(String(left.fetchedAt));
    })[0];
}

export function canUseCodeforcesIncrementalSync(record, handle) {
  if (!record) return false;
  if (handle && normalizeHandle(record.handle) !== normalizeHandle(handle)) return false;
  return (
    (record.solvedHistory?.length ?? 0) > 0 &&
    (record.contestHistory?.length ?? 0) > 0 &&
    typeof record.fetchedAt === 'string' &&
    record.fetchedAt.length > 0
  );
}
