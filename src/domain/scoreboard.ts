import { getActivePeriod, getRule, useDataStore } from '../data/store';
import { buildScoreboard } from './ranking';
import type { ExamPeriod, ScoreboardRow, ScoringRule } from '../types';

export function getPeriod(periodId = getActivePeriod().id): ExamPeriod {
  const data = useDataStore();
  return data.periods.find((item) => item.id === periodId) ?? getActivePeriod();
}

export function getScoringRule(ruleId = getActivePeriod().ruleVersionId): ScoringRule {
  return getRule(ruleId);
}

export function loadScoreboard(
  periodId = getActivePeriod().id,
  rule = getScoringRule(getPeriod(periodId).ruleVersionId)
): ScoreboardRow[] {
  const data = useDataStore();
  return buildScoreboard(data.students, rule, {
    attendance: data.attendance.filter((item) => item.periodId === periodId),
    nowcoder: data.nowcoder.filter((item) => item.periodId === periodId),
    codeforces: data.codeforces.filter((item) => item.periodId === periodId)
  });
}

export function getStudentScore(
  studentId: string,
  periodId = getActivePeriod().id
): ScoreboardRow | undefined {
  return loadScoreboard(periodId).find((row) => row.studentId === studentId);
}
