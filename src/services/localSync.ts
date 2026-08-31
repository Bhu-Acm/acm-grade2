import type { CodeforcesRecord, ExamPeriod, NowcoderContestScore, Student } from '../types';

export interface LocalSyncSummary {
  studentsTotal: number;
  codeforcesSynced: number;
  nowcoderSynced: number;
  codeforcesSkipped: number;
  nowcoderSkipped: number;
  nowcoderAdded: number;
  nowcoderUpdated: number;
  nowcoderPreservedManual: number;
  warnings: string[];
}

export async function syncAllStudentsLocally(payload: {
  period: ExamPeriod;
  students: Student[];
  nowcoder: NowcoderContestScore[];
  codeforces: CodeforcesRecord[];
}): Promise<{
  nowcoder: NowcoderContestScore[];
  codeforces: CodeforcesRecord[];
  summary: LocalSyncSummary;
}> {
  const response = await fetch('/__dev/sync/all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `本地同步接口失败: HTTP ${response.status}`);
  }

  return (await response.json()) as {
    nowcoder: NowcoderContestScore[];
    codeforces: CodeforcesRecord[];
    summary: LocalSyncSummary;
  };
}
