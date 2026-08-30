import type { ScoreboardRow, ScoringRule, Student } from '../types';
import { calculateStudentScore } from './score';

function compareNullableDesc(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

export function buildScoreboard(
  students: Student[],
  rule: ScoringRule,
  inputs: {
    attendance: import('../types').AttendanceRecord[];
    nowcoder: import('../types').NowcoderContestScore[];
    codeforces: import('../types').CodeforcesRecord[];
  }
): ScoreboardRow[] {
  const rows = students
    .filter((student) => student.status === 'ACTIVE')
    .map((student) => {
      const result = calculateStudentScore(
        student.id,
        rule,
        inputs.attendance.find((item) => item.studentId === student.id),
        inputs.nowcoder.filter((item) => item.studentId === student.id),
        inputs.codeforces.find((item) => item.studentId === student.id)
      );
      return { student, ...result };
    })
    .sort((a, b) => {
      return (
        compareNullableDesc(a.totalScore, b.totalScore) ||
        compareNullableDesc(a.breakdown.codeforces, b.breakdown.codeforces) ||
        compareNullableDesc(a.breakdown.nowcoder, b.breakdown.nowcoder) ||
        compareNullableDesc(a.breakdown.attendance, b.breakdown.attendance) ||
        a.student.studentNo.localeCompare(b.student.studentNo)
      );
    });

  let previousScore: number | null = null;
  let previousRank = 0;
  rows.forEach((row, index) => {
    if (row.totalScore !== previousScore) {
      previousRank = index + 1;
      previousScore = row.totalScore;
    }
    row.rank = row.totalScore === null ? undefined : previousRank;
  });
  return rows;
}
