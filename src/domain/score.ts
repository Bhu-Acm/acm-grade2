import { clamp, round2 } from './math';
import type {
  AttendanceConfig,
  AttendanceRecord,
  CodeforcesConfig,
  CodeforcesRecord,
  MissingDataPolicy,
  NowcoderConfig,
  NowcoderContestScore,
  ScoreBreakdown,
  ScoreResult,
  ScoringRule
} from '../types';

export function calculateAttendanceScore(
  record: AttendanceRecord | undefined,
  config: AttendanceConfig
): { score: number; rate: number } | null {
  void config;
  if (!record) return null;
  if (record.requiredCount === 0) return { score: 100, rate: 100 };

  const rate = ((record.presentCount + record.lateCount) / record.requiredCount) * 100;
  const normalizedRate = round2(clamp(rate));
  return { score: normalizedRate, rate: normalizedRate };
}

export function calculateNowcoderContestScore(contest: NowcoderContestScore): number {
  if (contest.participantCount <= 0 || contest.rank <= 0) return 0;
  return round2(
    clamp(((contest.participantCount - contest.rank + 1) / contest.participantCount) * 100)
  );
}

export function calculateNowcoderScore(
  records: NowcoderContestScore[],
  config: NowcoderConfig
): { score: number; contestScores: number[]; ratingScore: number | null; rating?: number } | null {
  if (!records.length) return null;

  const ordered = [...records].sort((a, b) => b.contestDate.localeCompare(a.contestDate));
  const selected =
    config.aggregation === 'BEST'
      ? ordered
      : config.aggregation === 'RECENT_N'
        ? ordered.slice(0, Math.max(1, config.recentN))
        : ordered;
  const contestScores = selected.map(calculateNowcoderContestScore);
  const score =
    config.aggregation === 'BEST'
      ? Math.max(...contestScores)
      : contestScores.reduce((sum, value) => sum + value, 0) / contestScores.length;

  const latestRatedContest = ordered.find(
    (contest) =>
      typeof contest.rating === 'number' &&
      Number.isFinite(contest.rating) &&
      contest.rating > 0
  );
  const ratingScore =
    latestRatedContest === undefined
      ? null
      : round2(
          clamp(
            50 +
              (latestRatedContest.rating! - config.ratingBaseline) / config.ratingDivisor
          )
        );

  return {
    score: round2(score),
    contestScores,
    ratingScore,
    rating: latestRatedContest?.rating
  };
}

function difficultyCoefficient(rating: number, config: CodeforcesConfig): number {
  const band = config.difficultyBands.find(
    (item) => rating >= item.min && (item.max === undefined || rating <= item.max)
  );
  return band?.coefficient ?? 0;
}

export function calculateCodeforcesScore(
  record: CodeforcesRecord | undefined,
  config: CodeforcesConfig
): {
  ratingScore: number | null;
  quantityScore: number;
  difficultyScore: number;
  contestPerformanceScore: number | null;
} | null {
  if (!record) return null;

  const quantityScore = clamp(
    (100 * Math.log1p(Math.max(0, record.totalSolved))) / Math.log1p(config.targetProblems)
  );
  const weightedSolved = Object.entries(record.difficultyStats).reduce(
    (sum, [rating, count]) =>
      sum + Number(count) * difficultyCoefficient(Number(rating), config),
    0
  );
  const difficultyScore = clamp(
    (weightedSolved / config.targetDifficultyProblems) * 100
  );
  const ratingScore =
    typeof record.rating !== 'number' || !Number.isFinite(record.rating)
      ? null
      : round2(clamp(50 + (record.rating - config.ratingBaseline) / config.ratingDivisor));

  const percentiles = (record.contestRankPercentiles ?? []).filter((value) =>
    Number.isFinite(value)
  );
  const contestPerformanceScore = percentiles.length
    ? round2(clamp(percentiles.reduce((sum, value) => sum + value, 0) / percentiles.length))
    : null;

  return {
    ratingScore,
    quantityScore: round2(quantityScore),
    difficultyScore: round2(difficultyScore),
    contestPerformanceScore
  };
}

export function calculateParticipationScore(
  nowcoderContestCount: number,
  codeforcesContestCount: number,
  targetContests: number
): { score: number; contestCount: number } | null {
  const contestCount =
    Math.max(0, nowcoderContestCount) + Math.max(0, codeforcesContestCount);
  if (contestCount === 0) return null;

  return {
    contestCount,
    score: round2(clamp((contestCount / targetContests) * 100))
  };
}

function missingValue(
  key: keyof ScoreBreakdown,
  policy: MissingDataPolicy,
  missing: Array<keyof ScoreBreakdown>
): number | null {
  missing.push(key);
  return policy === 'ZERO' ? 0 : null;
}

export function calculateStudentScore(
  studentId: string,
  rule: ScoringRule,
  attendance: AttendanceRecord | undefined,
  nowcoder: NowcoderContestScore[],
  codeforces: CodeforcesRecord | undefined
): ScoreResult {
  const missing: Array<keyof ScoreBreakdown> = [];
  const attendanceResult = calculateAttendanceScore(attendance, rule.attendance);
  const nowcoderResult = calculateNowcoderScore(nowcoder, rule.nowcoder);
  const codeforcesResult = calculateCodeforcesScore(codeforces, rule.codeforces);
  const participationResult = calculateParticipationScore(
    nowcoder.length,
    codeforces?.contestCount ?? 0,
    rule.participation.targetContests
  );

  const breakdown: ScoreBreakdown = {
    attendance:
      attendanceResult?.score ??
      missingValue('attendance', rule.missingDataPolicy, missing),
    nowcoderRating:
      nowcoderResult?.ratingScore ??
      missingValue('nowcoderRating', rule.missingDataPolicy, missing),
    nowcoderPerformance:
      nowcoderResult?.score ??
      missingValue('nowcoderPerformance', rule.missingDataPolicy, missing),
    codeforcesRating:
      codeforcesResult?.ratingScore ??
      missingValue('codeforcesRating', rule.missingDataPolicy, missing),
    codeforcesSolved:
      codeforcesResult?.quantityScore ??
      missingValue('codeforcesSolved', rule.missingDataPolicy, missing),
    codeforcesDifficulty:
      codeforcesResult?.difficultyScore ??
      missingValue('codeforcesDifficulty', rule.missingDataPolicy, missing),
    codeforcesContestPerformance:
      codeforcesResult?.contestPerformanceScore ??
      missingValue('codeforcesContestPerformance', rule.missingDataPolicy, missing),
    participation:
      participationResult?.score ??
      missingValue('participation', rule.missingDataPolicy, missing)
  };

  const totalWeight = Object.values(rule.weights).reduce((sum, value) => sum + value, 0);
  const hasNull = Object.values(breakdown).some((value) => value === null);
  const totalScore = hasNull
    ? null
    : round2(
        (Object.entries(breakdown) as Array<[keyof ScoreBreakdown, number]>).reduce(
          (sum, [key, value]) => sum + value * rule.weights[key],
          0
        ) / totalWeight
      );

  return {
    studentId,
    totalScore,
    breakdown,
    level: totalScore === null ? '待完善' : resolveLevel(totalScore, rule),
    status: totalScore === null ? 'BLOCKED' : missing.length ? 'INCOMPLETE' : 'COMPLETE',
    details: {
      attendanceRate: attendanceResult?.rate,
      nowcoderContestScores: nowcoderResult?.contestScores,
      nowcoderRating: nowcoderResult?.rating,
      codeforcesRating: codeforces?.rating,
      codeforcesQuantityScore: codeforcesResult?.quantityScore,
      codeforcesDifficultyScore: codeforcesResult?.difficultyScore,
      codeforcesContestPerformanceScore:
        codeforcesResult?.contestPerformanceScore ?? undefined,
      participationCount: participationResult?.contestCount,
      participationScore: participationResult?.score,
      missing
    }
  };
}

export function resolveLevel(score: number, rule: ScoringRule): string {
  return rule.levels.find((band) => score >= band.min && score < band.max)?.level ?? 'D';
}
