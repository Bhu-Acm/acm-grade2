export type PeriodStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type RuleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type DataSource = 'MANUAL' | 'API' | 'IMPORT' | 'SCRIPT';
export type MissingDataPolicy = 'ZERO' | 'BLOCK';
export type NowcoderAggregation = 'AVERAGE' | 'BEST' | 'RECENT_N';
export type ScoreStatus = 'COMPLETE' | 'INCOMPLETE' | 'BLOCKED';

export interface Student {
  id: string;
  studentNo: string;
  name: string;
  className: string;
  grade: number;
  codeforcesHandle?: string;
  nowcoderHandle?: string;
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
  nowcoder: number;
  codeforces: number;
}

export interface AttendanceConfig {
  lateDeduction: number;
  absentDeduction: number;
  zeroRequiredScore: number;
}

export interface NowcoderConfig {
  aggregation: NowcoderAggregation;
  recentN: number;
}

export interface DifficultyBand {
  min: number;
  max?: number;
  coefficient: number;
}

export interface CodeforcesConfig {
  targetProblems: number;
  targetDifficultyProblems: number;
  quantityWeight: number;
  difficultyWeight: number;
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
  remark?: string;
  updatedAt: string;
}

export interface DifficultyStats {
  [rating: string]: number;
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
  source: DataSource;
  fetchedAt: string;
  isManualOverride: boolean;
  remark?: string;
}

export interface ScoreBreakdown {
  attendance: number | null;
  nowcoder: number | null;
  codeforces: number | null;
}

export interface ScoreDetails {
  attendanceRate?: number;
  nowcoderContestScores?: number[];
  codeforcesQuantityScore?: number;
  codeforcesDifficultyScore?: number;
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
