import type { CodeforcesRecord, DifficultyStats } from '../types';

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
  problem: CodeforcesProblem;
}

export interface CodeforcesRatingChange {
  contestId: number;
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

async function requestJson<T>(url: string): Promise<CodeforcesApiResponse<T>> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Codeforces HTTP ${response.status}`);
  return (await response.json()) as CodeforcesApiResponse<T>;
}

export function normalizeCodeforcesApi(
  periodId: string,
  studentId: string,
  user: CodeforcesUserInfo,
  submissions: CodeforcesSubmission[],
  ratingHistory: CodeforcesRatingChange[] = []
): Omit<CodeforcesRecord, 'id' | 'fetchedAt'> {
  const solved = new Set<string>();
  const difficultyStats: DifficultyStats = {};

  submissions.forEach((submission) => {
    if (submission.verdict !== 'OK') return;
    const { contestId, index, rating } = submission.problem;
    const problemKey = `${contestId ?? 'gym'}:${index ?? 'unknown'}`;
    if (solved.has(problemKey)) return;
    solved.add(problemKey);
    if (rating !== undefined) {
      const key = String(rating);
      difficultyStats[key] = (difficultyStats[key] ?? 0) + 1;
    }
  });

  return {
    periodId,
    studentId,
    handle: user.handle,
    totalSolved: solved.size,
    difficultyStats,
    rating: user.rating,
    maxRating: user.maxRating,
    contestCount: ratingHistory.length,
    source: 'API',
    isManualOverride: false
  };
}

export async function fetchCodeforcesData(handle: string): Promise<{
  user: CodeforcesUserInfo;
  submissions: CodeforcesSubmission[];
  ratingHistory: CodeforcesRatingChange[];
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

  return {
    user: user.result[0],
    submissions: submissions.result,
    ratingHistory: ratingHistory.result
  };
}
