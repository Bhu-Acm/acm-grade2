import { getActivePeriod, getRule, useDataStore } from '../data/store';
import {
  buildScoreboard,
  buildTrendDates,
  createScoreWindow,
  resolveWindowAnchor,
  type ScoreWindow,
  type ScoreWindowKey
} from './ranking';
import type { ExamPeriod, ScoreboardRow, ScoringRule } from '../types';

export interface LoadScoreboardOptions {
  window?: ScoreWindow;
}

export interface TrendPoint {
  date: string;
  score: number | null;
}

export function getPeriod(periodId = getActivePeriod().id): ExamPeriod {
  const data = useDataStore();
  return data.periods.find((item) => item.id === periodId) ?? getActivePeriod();
}

export function getScoringRule(ruleId = getActivePeriod().ruleVersionId): ScoringRule {
  return getRule(ruleId);
}

export function getWindow(
  periodId = getActivePeriod().id,
  key: ScoreWindowKey = 'all',
  today = new Date().toISOString().slice(0, 10)
) {
  return createScoreWindow(getPeriod(periodId), key, today);
}

export function loadScoreboard(
  periodId = getActivePeriod().id,
  rule = getScoringRule(getPeriod(periodId).ruleVersionId),
  options: LoadScoreboardOptions = {}
): ScoreboardRow[] {
  const data = useDataStore();
  return buildScoreboard(
    data.students,
    rule,
    {
      attendance: data.attendance.filter((item) => item.periodId === periodId),
      nowcoder: data.nowcoder.filter((item) => item.periodId === periodId),
      codeforces: data.codeforces.filter((item) => item.periodId === periodId)
    },
    options
  );
}

export function getStudentScore(
  studentId: string,
  periodId = getActivePeriod().id,
  options: LoadScoreboardOptions = {}
): ScoreboardRow | undefined {
  return loadScoreboard(periodId, undefined, options).find((row) => row.studentId === studentId);
}

export function buildStudentTrend(
  studentId: string,
  periodId = getActivePeriod().id,
  rule = getScoringRule(getPeriod(periodId).ruleVersionId),
  today = new Date().toISOString().slice(0, 10)
): TrendPoint[] {
  const period = getPeriod(periodId);
  const points = buildTrendDates(period, 6, today);

  return points.map((date) => ({
    date,
    score:
      loadScoreboard(periodId, rule, {
        window: createScoreWindow(period, 'all', date)
      }).find((row) => row.studentId === studentId)?.totalScore ?? null
  }));
}

export function getWindowOptions(
  periodId = getActivePeriod().id,
  today = new Date().toISOString().slice(0, 10)
) {
  const period = getPeriod(periodId);
  const anchorDate = resolveWindowAnchor(period, today);
  return (['7d', '30d', 'all'] as const).map((key) => createScoreWindow(period, key, anchorDate));
}
