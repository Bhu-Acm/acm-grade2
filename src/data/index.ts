import studentsJson from './students.json';
import periodsJson from './periods.json';
import rulesJson from './rules.json';
import attendanceJson from './attendance.json';
import nowcoderJson from './nowcoder.json';
import codeforcesJson from './codeforces.json';
import helpPostsJson from './helpPosts.json';
import helpResourcesJson from './helpResources.json';
import type {
  AttendanceRecord,
  CodeforcesRecord,
  ExamPeriod,
  NowcoderContestScore,
  ScoringRule,
  Student
} from '../types';
import type { HelpPost, HelpResource } from '../types';

export const students = studentsJson as Student[];
export const periods = periodsJson as ExamPeriod[];
export const rules = rulesJson as ScoringRule[];
export const attendanceRecords = attendanceJson as AttendanceRecord[];
export const nowcoderScores = nowcoderJson as NowcoderContestScore[];
export const codeforcesRecords = codeforcesJson as CodeforcesRecord[];
export const helpPosts = helpPostsJson as HelpPost[];
export const helpResources = helpResourcesJson as HelpResource[];

export const activePeriod = periods.find((period) => period.status === 'ACTIVE') ?? periods[0];
export const activeRule = rules.find((rule) => rule.id === activePeriod.ruleVersionId) ?? rules[0];
