export type PeriodStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type RuleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type DataSource = 'MANUAL' | 'API' | 'IMPORT' | 'SCRIPT';
export type MissingDataPolicy = 'ZERO' | 'BLOCK';
export type NowcoderAggregation = 'AVERAGE' | 'BEST' | 'RECENT_N';
export type ScoreStatus = 'COMPLETE' | 'INCOMPLETE' | 'BLOCKED';

export * from './help';

export interface Student {
  id: string;
  studentNo: string;
  name: string;
  className: string;
  grade: number;
  codeforcesHandle?: string;
  nowcoderUserId?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ExamPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  ruleVersionId: string;
}

export interface ScoreWeights {
  attendance: number;
  nowcoderRating: number;
  nowcoderPerformance: number;
  codeforcesRating: number;
  codeforcesSolved: number;
  codeforcesDifficulty: number;
  codeforcesContestPerformance: number;
  participation: number;
}

export interface AttendanceConfig {
  lateDeduction: number;
  absentDeduction: number;
  zeroRequiredScore: number;
}

export interface NowcoderConfig {
  aggregation: NowcoderAggregation;
  recentN: number;
  ratingBaseline: number;
  ratingDivisor: number;
}

export interface ParticipationConfig {
  targetContests: number;
}

export interface DifficultyBand {
  min: number;
  max?: number;
  coefficient: number;
}

export interface CodeforcesConfig {
  targetProblems: number;
  targetDifficultyProblems: number;
  ratingBaseline: number;
  ratingDivisor: number;
  difficultyBands: DifficultyBand[];
}

export interface LevelBand {
  level: string;
  min: number;
  max: number;
}

export interface ScoringRule {
  id: string;
  version: string;
  name: string;
  status: RuleStatus;
  weights: ScoreWeights;
  attendance: AttendanceConfig;
  nowcoder: NowcoderConfig;
  codeforces: CodeforcesConfig;
  participation: ParticipationConfig;
  levels: LevelBand[];
  missingDataPolicy: MissingDataPolicy;
  publishedAt: string;
}

export interface AttendanceRecord {
  id: string;
  periodId: string;
  studentId: string;
  requiredCount: number;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
  remark?: string;
  updatedAt: string;
}

export interface NowcoderContestScore {
  id: string;
  periodId: string;
  studentId: string;
  contestId: string;
  contestName: string;
  contestDate: string;
  participantCount: number;
  rank: number;
  solvedCount: number;
  source: DataSource;
  isManualOverride: boolean;
  nowcoderUserId?: string;
  contestScore?: number;
  platformScore?: number;
  rating?: number;
  ratingChange?: number;
  remark?: string;
  updatedAt: string;
}

export interface DifficultyStats {
  [rating: string]: number;
}

export interface CodeforcesSolvedProblem {
  problemKey: string;
  solvedAt: string;
  contestId?: number;
  index?: string;
  rating?: number;
}

export interface CodeforcesContestHistoryItem {
  contestId: number;
  contestName?: string;
  contestDate: string;
  ratingUpdateTime?: string;
  rank?: number;
  oldRating?: number;
  newRating?: number;
  percentile?: number | null;
}

export interface CodeforcesSnapshot {
  fetchedAt: string;
  totalSolved: number;
  difficultyStats: DifficultyStats;
  rating?: number;
  maxRating?: number;
  contestCount: number;
}

export interface CodeforcesRecord {
  id: string;
  periodId: string;
  studentId: string;
  handle: string;
  totalSolved: number;
  difficultyStats: DifficultyStats;
  rating?: number;
  maxRating?: number;
  contestCount: number;
  // Values are 0..100, where 100 means first place in a contest.
  contestRankPercentiles?: number[];
  solvedHistory?: CodeforcesSolvedProblem[];
  contestHistory?: CodeforcesContestHistoryItem[];
  snapshots?: CodeforcesSnapshot[];
  source: DataSource;
  fetchedAt: string;
  isManualOverride: boolean;
  remark?: string;
}

export interface ScoreBreakdown {
  attendance: number | null;
  nowcoderRating: number | null;
  nowcoderPerformance: number | null;
  codeforcesRating: number | null;
  codeforcesSolved: number | null;
  codeforcesDifficulty: number | null;
  codeforcesContestPerformance: number | null;
  participation: number | null;
}

export interface ScoreDetails {
  attendanceRate?: number;
  nowcoderContestScores?: number[];
  nowcoderRating?: number;
  codeforcesRating?: number;
  codeforcesQuantityScore?: number;
  codeforcesDifficultyScore?: number;
  codeforcesContestPerformanceScore?: number;
  participationCount?: number;
  participationScore?: number;
  missing: Array<keyof ScoreBreakdown>;
}

export interface ScoreResult {
  studentId: string;
  totalScore: number | null;
  breakdown: ScoreBreakdown;
  level: string;
  status: ScoreStatus;
  details: ScoreDetails;
  rank?: number;
}

export interface ScoreboardRow extends ScoreResult {
  student: Student;
}
