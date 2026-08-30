import { reactive } from 'vue';
import {
  attendanceRecords as initialAttendance,
  codeforcesRecords as initialCodeforces,
  nowcoderScores as initialNowcoder,
  periods as initialPeriods,
  rules as initialRules,
  students as initialStudents
} from './index';
import type {
  AttendanceRecord,
  CodeforcesRecord,
  ExamPeriod,
  NowcoderContestScore,
  ScoringRule,
  Student
} from '../types';
import { validateAppData, validateDataSet, type DataSetKey } from '../domain/validation';

export interface AppData {
  students: Student[];
  periods: ExamPeriod[];
  rules: ScoringRule[];
  attendance: AttendanceRecord[];
  nowcoder: NowcoderContestScore[];
  codeforces: CodeforcesRecord[];
}

const STORAGE_KEY = 'acm-grade2:maintenance-data:v1';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function initialData(): AppData {
  return {
    students: clone(initialStudents),
    periods: clone(initialPeriods),
    rules: clone(initialRules),
    attendance: clone(initialAttendance),
    nowcoder: clone(initialNowcoder),
    codeforces: clone(initialCodeforces)
  };
}

function readStoredData(): AppData {
  if (typeof localStorage === 'undefined') return initialData();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return initialData();

  try {
    const value = JSON.parse(stored) as AppData;
    return validateAppData(value).length ? initialData() : value;
  } catch {
    return initialData();
  }
}

const state = reactive<AppData>(readStoredData());

function persist() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function useDataStore() {
  return state;
}

export function getDataSnapshot(): AppData {
  return clone(state);
}

export function getActivePeriod(): ExamPeriod {
  return state.periods.find((period) => period.status === 'ACTIVE') ?? state.periods[0];
}

export function getRule(ruleId: string): ScoringRule {
  return state.rules.find((rule) => rule.id === ruleId) ?? state.rules[0];
}

export function replaceDataSet(key: DataSetKey, value: unknown) {
  const errors = validateDataSet(key, value, state);
  if (errors.length) throw new Error(errors[0]);
  state[key] = clone(value) as never;
  persist();
}

export function upsertStudent(student: Student) {
  const index = state.students.findIndex((item) => item.id === student.id);
  if (index === -1) state.students.push(clone(student));
  else state.students[index] = clone(student);
  persist();
}

export function updateRuleWeights(weights: ScoringRule['weights']) {
  const active = getRule(getActivePeriod().ruleVersionId);
  const index = state.rules.findIndex((rule) => rule.id === active.id);
  state.rules[index] = { ...state.rules[index], weights: clone(weights) };
  persist();
}

export function upsertCodeforcesRecord(record: CodeforcesRecord) {
  const index = state.codeforces.findIndex(
    (item) => item.periodId === record.periodId && item.studentId === record.studentId
  );
  if (index === -1) state.codeforces.push(clone(record));
  else state.codeforces[index] = clone(record);
  persist();
}

export function upsertNowcoderScore(record: NowcoderContestScore) {
  const duplicateIndex = state.nowcoder.findIndex(
    (item) =>
      item.periodId === record.periodId &&
      item.studentId === record.studentId &&
      item.contestId === record.contestId &&
      item.id !== record.id
  );
  if (duplicateIndex !== -1) {
    throw new Error('该学生在这场牛客比赛中已有记录，请改为编辑原记录。');
  }

  const index = state.nowcoder.findIndex((item) => item.id === record.id);
  if (index === -1) state.nowcoder.push(clone(record));
  else state.nowcoder[index] = clone(record);
  persist();
}

export function removeNowcoderScore(id: string) {
  state.nowcoder = state.nowcoder.filter((item) => item.id !== id) as never;
  persist();
}

export function resetMaintenanceData() {
  const fresh = initialData();
  Object.assign(state, fresh);
  persist();
}

export function clearMaintenanceData() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
}
