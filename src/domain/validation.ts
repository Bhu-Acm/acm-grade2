import type { AppData } from '../data/store';
import type {
  AttendanceRecord,
  CodeforcesRecord,
  NowcoderContestScore,
  RuleStatus,
  ScoringRule,
  Student
} from '../types';

export type DataSetKey =
  | 'students'
  | 'periods'
  | 'rules'
  | 'attendance'
  | 'nowcoder'
  | 'codeforces'
  | 'helpPosts'
  | 'helpResources';

const unique = (values: string[]) => values.length === new Set(values).size;
const isArray = (value: unknown): value is unknown[] => Array.isArray(value);
const hasKeys = (value: Record<string, unknown>, keys: string[]) =>
  keys.every((key) => value[key] !== undefined);

export function validateDataSet(
  key: DataSetKey,
  value: unknown,
  current?: AppData
): string[] {
  if (!isArray(value)) return [`${key}.json 必须是数组`];
  const items = value as Array<Record<string, unknown>>;
  if (items.some((item) => !item || typeof item !== 'object')) {
    return [`${key}.json 存在无效记录`];
  }

  if (key === 'students') {
    const records = items as unknown as Student[];
    if (records.some((item) => !item.id || !item.studentNo || !item.name || !item.className)) {
      return ['学生数据必须包含 id、学号、姓名和班级'];
    }
    if (!unique(records.map((item) => item.id))) return ['学生数据存在重复 id'];
    if (!unique(records.map((item) => item.studentNo))) return ['学生数据存在重复学号'];
  }

  if (key === 'rules') {
    const records = items as unknown as ScoringRule[];
    if (
      records.some(
        (item) =>
          !item.id ||
          !item.version ||
          !item.weights ||
          !item.attendance ||
          !item.nowcoder ||
          !item.codeforces ||
          !item.participation ||
          !hasKeys(item.weights as unknown as Record<string, unknown>, [
            'attendance',
            'nowcoderRating',
            'nowcoderPerformance',
            'codeforcesRating',
            'codeforcesSolved',
            'codeforcesDifficulty',
            'codeforcesContestPerformance',
            'participation'
          ])
      )
    ) {
      return ['规则数据缺少新的方案 4 字段'];
    }
    if (
      records.some(
        (item) =>
          Object.values(item.weights).some(
            (weight) => typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0
          ) ||
          Object.values(item.weights).reduce((sum, weight) => sum + weight, 0) <= 0
      )
    ) {
      return ['规则权重必须是非负数字，且总和必须大于 0'];
    }
    if (records.some((item) => !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(item.status as RuleStatus))) {
      return ['规则状态必须是 DRAFT、PUBLISHED 或 ARCHIVED'];
    }
  }

  if (key === 'helpPosts') {
    if (items.some((item) => !item.id || !item.question || !item.answer || !item.category)) {
      return ['helpPosts.json 存在缺少 id、分类、问题或答案的记录'];
    }
  }

  if (key === 'helpResources') {
    if (items.some((item) => !item.id || !item.title || !item.description || !item.path)) {
      return ['helpResources.json 存在缺少 id、标题、说明或路径的记录'];
    }
  }

  if (current && ['attendance', 'nowcoder', 'codeforces'].includes(key)) {
    const studentIds = new Set(current.students.map((item) => item.id));
    const periodIds = new Set(current.periods.map((item) => item.id));
    const records = items as unknown as Array<
      AttendanceRecord | NowcoderContestScore | CodeforcesRecord
    >;
    if (records.some((item) => !studentIds.has(item.studentId) || !periodIds.has(item.periodId))) {
      return [`${key}.json 存在不存在的 studentId 或 periodId`];
    }
  }

  return [];
}

export function validateAppData(data: AppData): string[] {
  for (const key of [
    'students',
    'periods',
    'rules',
    'attendance',
    'nowcoder',
    'codeforces',
    'helpPosts',
    'helpResources'
  ] as DataSetKey[]) {
    const errors = validateDataSet(key, data[key], data);
    if (errors.length) return errors;
  }
  return [];
}
