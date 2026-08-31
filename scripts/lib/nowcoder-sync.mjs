const API_ORIGIN = 'https://ac.nowcoder.com';
const API_PATH = '/acm-heavy/acm/contest/profile/contest-joined-history';
const REQUEST_DELAY_MS = 1200;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export function inferIncrementalFrom(records, periodId, studentId, fallbackDate) {
  const dates = records
    .filter((record) => record.periodId === periodId && record.studentId === studentId)
    .map((record) => record.contestDate)
    .sort();
  return dates.at(-1) ?? fallbackDate;
}

export async function fetchNowcoderRecords({
  userId,
  studentId,
  periodId,
  pageSize = 100,
  maxPages = Infinity,
  ratingOnly = false,
  from = null,
  to = null
}) {
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
      if (from && date < toDate(from)) continue;
      if (to && date > toDate(to)) continue;
      if (record.participantCount <= 0 || record.rank <= 0) continue;
      scraped.push(record);
    }
    if (page < pageCount) await wait(REQUEST_DELAY_MS);
    page += 1;
  }

  return {
    pages: Math.min(page - 1, pageCount),
    records: scraped
  };
}

export function mergeNowcoderRecords(existing, incoming) {
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
      (left, right) =>
        right.contestDate.localeCompare(left.contestDate) ||
        left.studentId.localeCompare(right.studentId)
    ),
    added,
    updated,
    preservedManual
  };
}
