import { describe, expect, it } from 'vitest';
import {
  calculateAttendanceScore,
  calculateCodeforcesScore,
  calculateNowcoderScore,
  calculateStudentScore,
  resolveLevel
} from '../src/domain/score';
import {
  buildScoreboard,
  buildWindowedCodeforcesRecord,
  createScoreWindow
} from '../src/domain/ranking';
import { normalizeCodeforcesApi } from '../src/services/codeforces';
import type { CodeforcesRecord, ExamPeriod, ScoringRule, Student } from '../src/types';
import rules from '../src/data/rules.json';

const rule = rules[0] as ScoringRule;
const period: ExamPeriod = {
  id: 'period-2026-spring',
  name: '2026 春训',
  startDate: '2026-03-01',
  endDate: '2026-06-30',
  status: 'ACTIVE',
  ruleVersionId: rule.id
};

describe('score engine', () => {
  it('calculates attendance as a normalized rate', () => {
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
    expect(result).toEqual({ rate: 90, score: 90 });
  });

  it('supports average nowcoder aggregation and rating linearization', () => {
    const result = calculateNowcoderScore(
      [
        {
          id: '1',
          periodId: 'p',
          studentId: 's',
          contestId: 'c1',
          contestName: '1',
          contestDate: '2026-03-01',
          participantCount: 100,
          rank: 1,
          solvedCount: 5,
          source: 'MANUAL',
          isManualOverride: true,
          rating: 1010,
          updatedAt: '2026-08-30T00:00:00Z'
        },
        {
          id: '2',
          periodId: 'p',
          studentId: 's',
          contestId: 'c2',
          contestName: '2',
          contestDate: '2026-04-01',
          participantCount: 100,
          rank: 51,
          solvedCount: 3,
          source: 'MANUAL',
          isManualOverride: true,
          rating: 1040,
          updatedAt: '2026-08-30T00:00:00Z'
        }
      ],
      rule.nowcoder
    );
    expect(result?.contestScores).toEqual([50, 100]);
    expect(result?.score).toBe(75);
    expect(result?.ratingScore).toBe(52);
  });

  it('calculates codeforces sub-scores from the new scheme', () => {
    const result = calculateCodeforcesScore(
      {
        id: 'cf',
        periodId: 'p',
        studentId: 's',
        handle: 'demo',
        totalSolved: 50,
        difficultyStats: { '800': 10, '1200': 10, '1700': 10 },
        rating: 1180,
        contestCount: 1,
        contestRankPercentiles: [50, 75],
        source: 'API',
        fetchedAt: '2026-08-30T00:00:00Z',
        isManualOverride: false
      },
      rule.codeforces
    );
    expect(result?.quantityScore).toBeCloseTo(81.98, 2);
    expect(result?.difficultyScore).toBeCloseTo(26.67, 2);
    expect(result?.ratingScore).toBe(62);
    expect(result?.contestPerformanceScore).toBe(62.5);
  });

  it('calculates the full scheme 4 total score', () => {
    const result = calculateStudentScore(
      's',
      rule,
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
      [
        {
          id: '1',
          periodId: 'p',
          studentId: 's',
          contestId: 'c1',
          contestName: '1',
          contestDate: '2026-03-01',
          participantCount: 100,
          rank: 1,
          solvedCount: 5,
          source: 'MANUAL',
          isManualOverride: true,
          rating: 1010,
          updatedAt: '2026-08-30T00:00:00Z'
        },
        {
          id: '2',
          periodId: 'p',
          studentId: 's',
          contestId: 'c2',
          contestName: '2',
          contestDate: '2026-04-01',
          participantCount: 100,
          rank: 51,
          solvedCount: 3,
          source: 'MANUAL',
          isManualOverride: true,
          rating: 1040,
          updatedAt: '2026-08-30T00:00:00Z'
        }
      ],
      {
        id: 'cf',
        periodId: 'p',
        studentId: 's',
        handle: 'demo',
        totalSolved: 50,
        difficultyStats: { '800': 10, '1200': 10, '1700': 10 },
        rating: 1180,
        contestCount: 1,
        contestRankPercentiles: [50, 75],
        source: 'API',
        fetchedAt: '2026-08-30T00:00:00Z',
        isManualOverride: false
      }
    );

    expect(result.totalScore).toBeCloseTo(61.93, 2);
    expect(result.status).toBe('COMPLETE');
  });

  it('uses left-closed, right-open level bands', () => {
    expect(resolveLevel(90, rule)).toBe('S');
    expect(resolveLevel(89.99, rule)).toBe('A');
    expect(resolveLevel(60, rule)).toBe('C');
  });

  it('builds codeforces rolling windows from solved and contest history', () => {
    const record: CodeforcesRecord = {
      id: 'cf',
      periodId: period.id,
      studentId: 's',
      handle: 'demo',
      totalSolved: 5,
      difficultyStats: { '800': 2, '1200': 3 },
      rating: 1320,
      maxRating: 1350,
      contestCount: 3,
      contestRankPercentiles: [45, 66, 82],
      solvedHistory: [
        { problemKey: '1:A', solvedAt: '2026-06-10T10:00:00.000Z', rating: 800 },
        { problemKey: '1:B', solvedAt: '2026-06-24T10:00:00.000Z', rating: 1200 },
        { problemKey: '1:C', solvedAt: '2026-06-28T10:00:00.000Z', rating: 1200 },
        { problemKey: '1:D', solvedAt: '2026-06-29T10:00:00.000Z', rating: 1200 },
        { problemKey: '1:E', solvedAt: '2026-06-30T10:00:00.000Z', rating: 800 }
      ],
      contestHistory: [
        { contestId: 1, contestDate: '2026-06-12', newRating: 1200, percentile: 45 },
        { contestId: 2, contestDate: '2026-06-26', newRating: 1260, percentile: 66 },
        { contestId: 3, contestDate: '2026-06-30', newRating: 1320, percentile: 82 }
      ],
      snapshots: [
        {
          fetchedAt: '2026-06-30T12:00:00.000Z',
          totalSolved: 5,
          difficultyStats: { '800': 2, '1200': 3 },
          rating: 1320,
          maxRating: 1350,
          contestCount: 3
        }
      ],
      source: 'API',
      fetchedAt: '2026-06-30T12:00:00.000Z',
      isManualOverride: false
    };

    const recent = buildWindowedCodeforcesRecord(
      record,
      createScoreWindow(period, '7d', '2026-06-30')
    )!;

    expect(recent.totalSolved).toBe(4);
    expect(recent.difficultyStats).toEqual({ '800': 1, '1200': 3 });
    expect(recent.contestCount).toBe(2);
    expect(recent.contestRankPercentiles).toEqual([66, 82]);
    expect(recent.rating).toBe(1320);
  });

  it('falls back to aggregate codeforces data when legacy history is missing', () => {
    const legacyRecord: CodeforcesRecord = {
      id: 'cf',
      periodId: period.id,
      studentId: 's',
      handle: 'demo',
      totalSolved: 50,
      difficultyStats: { '800': 20, '1200': 30 },
      rating: 1180,
      contestCount: 5,
      contestRankPercentiles: [50, 75],
      source: 'API',
      fetchedAt: '2026-06-30T12:00:00.000Z',
      isManualOverride: false
    };

    const recent = buildWindowedCodeforcesRecord(
      legacyRecord,
      createScoreWindow(period, '30d', '2026-06-30')
    )!;

    expect(recent.totalSolved).toBe(50);
    expect(recent.contestCount).toBe(5);
    expect(recent.contestRankPercentiles).toEqual([50, 75]);
    expect(recent.difficultyStats.UNRATED).toBeUndefined();
  });

  it('merges incremental codeforces sync results with the previous record', () => {
    const previousRecord: CodeforcesRecord = {
      id: 'cf',
      periodId: period.id,
      studentId: 's',
      handle: 'demo',
      totalSolved: 1,
      difficultyStats: { '800': 1 },
      rating: 1200,
      maxRating: 1200,
      contestCount: 1,
      contestRankPercentiles: [40],
      solvedHistory: [
        {
          problemKey: '100:A',
          solvedAt: '2026-06-20T10:00:00.000Z',
          rating: 800
        }
      ],
      contestHistory: [{ contestId: 100, contestDate: '2026-06-20', newRating: 1200, percentile: 40 }],
      snapshots: [
        {
          fetchedAt: '2026-06-20T12:00:00.000Z',
          totalSolved: 1,
          difficultyStats: { '800': 1 },
          rating: 1200,
          maxRating: 1200,
          contestCount: 1
        }
      ],
      source: 'API',
      fetchedAt: '2026-06-20T12:00:00.000Z',
      isManualOverride: false
    };

    const merged = normalizeCodeforcesApi(
      period.id,
      's',
      { handle: 'demo', rating: 1250, maxRating: 1250 },
      [
        {
          verdict: 'OK',
          creationTimeSeconds: Date.parse('2026-06-25T10:00:00.000Z') / 1000,
          problem: { contestId: 101, index: 'B', rating: 1200 }
        }
      ],
      [
        {
          contestId: 100,
          contestName: 'Old',
          newRating: 1200,
          ratingUpdateTimeSeconds: Date.parse('2026-06-20T12:00:00.000Z') / 1000
        },
        {
          contestId: 101,
          contestName: 'New',
          newRating: 1250,
          ratingUpdateTimeSeconds: Date.parse('2026-06-25T12:00:00.000Z') / 1000
        }
      ],
      [
        { contestId: 100, percentile: 40 },
        { contestId: 101, percentile: 75 }
      ],
      previousRecord,
      '2026-06-25T12:30:00.000Z'
    );

    expect(merged.totalSolved).toBe(2);
    expect(merged.solvedHistory?.map((item) => item.problemKey)).toEqual(['100:A', '101:B']);
    expect(merged.contestHistory?.map((item) => item.contestId)).toEqual([100, 101]);
    expect(merged.snapshots).toHaveLength(2);
    expect(merged.contestRankPercentiles).toEqual([40, 75]);
  });

  it('adds an UNRATED bucket when legacy difficulty stats do not cover total solved', () => {
    const legacyRecord: CodeforcesRecord = {
      id: 'cf',
      periodId: period.id,
      studentId: 's',
      handle: 'yzb0420',
      totalSolved: 575,
      difficultyStats: {
        '800': 135,
        '900': 45,
        '1000': 38,
        '1100': 32,
        '1200': 98,
        '1300': 55,
        '1400': 69,
        '1500': 20,
        '1600': 5,
        '1700': 4,
        '1800': 2,
        '1900': 3,
        '2000': 1,
        '2400': 1
      },
      rating: 1282,
      contestCount: 24,
      contestRankPercentiles: [],
      source: 'API',
      fetchedAt: '2026-08-30T06:23:48.443Z',
      isManualOverride: false
    };

    const normalized = buildWindowedCodeforcesRecord(
      legacyRecord,
      createScoreWindow(period, 'all', '2026-06-30')
    )!;

    expect(normalized.difficultyStats.UNRATED).toBe(67);
  });

  it('prefers the matching handle when a student has multiple codeforces records', () => {
    const student: Student = {
      id: 'stu',
      studentNo: '2026001',
      name: 'Demo',
      className: '2601',
      grade: 2026,
      codeforcesHandle: 'yzb0420',
      status: 'ACTIVE'
    };
    const rows = buildScoreboard(
      [student],
      rule,
      {
        attendance: [],
        nowcoder: [],
        codeforces: [
          {
            id: 'cf-old',
            periodId: period.id,
            studentId: 'stu',
            handle: 'siyuan_cs',
            totalSolved: 61,
            difficultyStats: { '800': 25, '900': 15, '1000': 8, '1100': 7, '1200': 4, '1300': 2 },
            rating: 1040,
            contestCount: 5,
            contestRankPercentiles: [],
            source: 'API',
            fetchedAt: '2026-08-30T02:00:00Z',
            isManualOverride: false
          },
          {
            id: 'cf-new',
            periodId: period.id,
            studentId: 'stu',
            handle: 'yzb0420',
            totalSolved: 575,
            difficultyStats: { '800': 135 },
            rating: 1282,
            contestCount: 24,
            contestRankPercentiles: [],
            source: 'API',
            fetchedAt: '2026-08-30T06:23:48.443Z',
            isManualOverride: false
          }
        ]
      },
      {
        window: createScoreWindow(period, 'all', '2026-06-30')
      }
    );

    expect(rows[0].details.codeforcesRating).toBe(1282);
  });
});
