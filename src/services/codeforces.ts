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
  const [userResponse, submissionResponse, ratingResponse] = await Promise.all([
    fetch(`${base}/user.info?handles=${encodeURIComponent(handle)}`),
    fetch(`${base}/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`),
    fetch(`${base}/user.rating?handle=${encodeURIComponent(handle)}`)
  ]);

  const user = (await userResponse.json()) as CodeforcesApiResponse<CodeforcesUserInfo[]>;
  const submissions = (await submissionResponse.json()) as CodeforcesApiResponse<
    CodeforcesSubmission[]
  >;
  const ratingHistory = (await ratingResponse.json()) as CodeforcesApiResponse<
    CodeforcesRatingChange[]
  >;

  if (user.status !== 'OK' || submissions.status !== 'OK' || ratingHistory.status !== 'OK') {
    throw new Error('Codeforces API 返回失败');
  }

  return {
    user: user.result[0],
    submissions: submissions.result,
    ratingHistory: ratingHistory.result
  };
}
