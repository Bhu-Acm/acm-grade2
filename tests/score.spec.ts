import { describe, expect, it } from 'vitest';
import { calculateAttendanceScore, calculateCodeforcesScore, calculateNowcoderScore, resolveLevel } from '../src/domain/score';
import type { ScoringRule } from '../src/types';
import rules from '../src/data/rules.json';

const rule = rules[0] as ScoringRule;

describe('score engine', () => {
  it('calculates attendance with late and absence deductions', () => {
    const result = calculateAttendanceScore(
      {
        id: 'a',
        periodId: 'p',
        studentId: 's',
        requiredCount: 10,
        presentCount: 8,
        lateCount: 1,
        leaveCount: 0,
        absentCount: 1,
        updatedAt: '2026-08-30T00:00:00Z'
      },
      rule.attendance
    );
    expect(result).toEqual({ rate: 90, score: 80 });
  });

  it('supports average nowcoder aggregation', () => {
    const result = calculateNowcoderScore(
      [
        { id: '1', periodId: 'p', studentId: 's', contestId: 'c1', contestName: '1', contestDate: '2026-03-01', participantCount: 100, rank: 1, solvedCount: 5, source: 'MANUAL', isManualOverride: true, updatedAt: '2026-08-30T00:00:00Z' },
        { id: '2', periodId: 'p', studentId: 's', contestId: 'c2', contestName: '2', contestDate: '2026-04-01', participantCount: 100, rank: 51, solvedCount: 3, source: 'MANUAL', isManualOverride: true, updatedAt: '2026-08-30T00:00:00Z' }
      ],
      rule.nowcoder
    );
    expect(result?.contestScores).toEqual([50, 100]);
    expect(result?.score).toBe(75);
  });

  it('calculates codeforces quantity and difficulty components', () => {
    const result = calculateCodeforcesScore(
      {
        id: 'cf',
        periodId: 'p',
        studentId: 's',
        handle: 'demo',
        totalSolved: 50,
        difficultyStats: { '800': 10, '1200': 10, '1700': 10 },
        contestCount: 1,
        source: 'API',
        fetchedAt: '2026-08-30T00:00:00Z',
        isManualOverride: false
      },
      rule.codeforces
    );
    expect(result).toEqual({ quantityScore: 50, difficultyScore: 16, score: 36.4 });
  });

  it('uses left-closed, right-open level bands', () => {
    expect(resolveLevel(90, rule)).toBe('S');
    expect(resolveLevel(89.99, rule)).toBe('A');
    expect(resolveLevel(60, rule)).toBe('C');
  });
});
