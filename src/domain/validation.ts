import type { AppData } from '../data/store';
import type {
  AttendanceRecord,
  CodeforcesRecord,
  NowcoderContestScore,
  RuleStatus,
  ScoringRule,
  Student
} from '../types';

export type DataSetKey = 'students' | 'periods' | 'rules' | 'attendance' | 'nowcoder' | 'codeforces';

const unique = (values: string[]) => values.length === new Set(values).size;
const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

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
    if (records.some((item) => !item.id || !item.version || !item.weights)) {
      return ['规则数据必须包含 id、version 和 weights'];
    }
    if (
      records.some(
        (item) =>
          Math.abs(
            item.weights.attendance + item.weights.nowcoder + item.weights.codeforces - 1
          ) > 0.000001
      )
    ) {
      return ['每个规则版本的权重总和必须等于 1'];
    }
    if (records.some((item) => !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(item.status as RuleStatus))) {
      return ['规则状态必须是 DRAFT、PUBLISHED 或 ARCHIVED'];
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
  for (const key of ['students', 'periods', 'rules', 'attendance', 'nowcoder', 'codeforces'] as DataSetKey[]) {
    const errors = validateDataSet(key, data[key], data);
    if (errors.length) return errors;
  }
  return [];
}
