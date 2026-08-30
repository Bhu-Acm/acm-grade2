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
  ScoreDetails,
  ScoreResult,
  ScoringRule
} from '../types';

export function calculateAttendanceScore(
  record: AttendanceRecord | undefined,
  config: AttendanceConfig
): { score: number; rate: number } | null {
  if (!record) return null;
  if (record.requiredCount === 0) {
    return { score: round2(config.zeroRequiredScore), rate: 100 };
  }

  const rate = ((record.presentCount + record.lateCount) / record.requiredCount) * 100;
  const score = clamp(
    rate - record.lateCount * config.lateDeduction - record.absentCount * config.absentDeduction
  );
  return { score: round2(score), rate: round2(rate) };
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
): { score: number; contestScores: number[] } | null {
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
  return { score: round2(score), contestScores };
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
): { score: number; quantityScore: number; difficultyScore: number } | null {
  if (!record) return null;
  const quantityScore = clamp((record.totalSolved / config.targetProblems) * 100);
  const weightedSolved = Object.entries(record.difficultyStats).reduce(
    (sum, [rating, count]) => sum + Number(count) * difficultyCoefficient(Number(rating), config),
    0
  );
  const difficultyScore = clamp(
    (weightedSolved / config.targetDifficultyProblems) * 100
  );
  const score =
    quantityScore * config.quantityWeight + difficultyScore * config.difficultyWeight;

  return {
    score: round2(score),
    quantityScore: round2(quantityScore),
    difficultyScore: round2(difficultyScore)
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

  const breakdown: ScoreBreakdown = {
    attendance:
      attendanceResult?.score ??
      missingValue('attendance', rule.missingDataPolicy, missing),
    nowcoder:
      nowcoderResult?.score ??
      missingValue('nowcoder', rule.missingDataPolicy, missing),
    codeforces:
      codeforcesResult?.score ??
      missingValue('codeforces', rule.missingDataPolicy, missing)
  };

  const totalScore =
    breakdown.attendance === null ||
    breakdown.nowcoder === null ||
    breakdown.codeforces === null
      ? null
      : round2(
          breakdown.attendance * rule.weights.attendance +
            breakdown.nowcoder * rule.weights.nowcoder +
            breakdown.codeforces * rule.weights.codeforces
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
      codeforcesQuantityScore: codeforcesResult?.quantityScore,
      codeforcesDifficultyScore: codeforcesResult?.difficultyScore,
      missing
    }
  };
}

export function resolveLevel(score: number, rule: ScoringRule): string {
  return rule.levels.find((band) => score >= band.min && score < band.max)?.level ?? 'D';
}
