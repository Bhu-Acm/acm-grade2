import {
  activePeriod,
  activeRule,
  attendanceRecords,
  codeforcesRecords,
  nowcoderScores,
  periods,
  rules,
  students
} from '../data';
import { buildScoreboard } from './ranking';
import type { ExamPeriod, ScoreboardRow, ScoringRule } from '../types';

export function getPeriod(periodId = activePeriod.id): ExamPeriod {
  const period = periods.find((item) => item.id === periodId);
  return period ?? activePeriod;
}

export function getRule(ruleId = activeRule.id): ScoringRule {
  return rules.find((rule) => rule.id === ruleId) ?? activeRule;
}

export function loadScoreboard(
  periodId = activePeriod.id,
  rule = getRule(getPeriod(periodId).ruleVersionId)
): ScoreboardRow[] {
  return buildScoreboard(students, rule, {
    attendance: attendanceRecords.filter((item) => item.periodId === periodId),
    nowcoder: nowcoderScores.filter((item) => item.periodId === periodId),
    codeforces: codeforcesRecords.filter((item) => item.periodId === periodId)
  });
}

export function getStudentScore(studentId: string, periodId = activePeriod.id): ScoreboardRow | undefined {
  return loadScoreboard(periodId).find((row) => row.studentId === studentId);
}
