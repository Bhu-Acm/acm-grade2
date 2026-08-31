import {
  canUseCodeforcesIncrementalSync,
  fetchCodeforcesData,
  normalizeCodeforcesRecord,
  pickCodeforcesRecord
} from './codeforces-sync.mjs';
import {
  fetchNowcoderRecords,
  inferIncrementalFrom,
  mergeNowcoderRecords
} from './nowcoder-sync.mjs';

function periodEndOrToday(period, today = new Date().toISOString().slice(0, 10)) {
  return today < period.endDate ? today : period.endDate;
}

function maxDate(left, right) {
  return left >= right ? left : right;
}

export async function syncAllStudentsLocally({
  period,
  students,
  nowcoder,
  codeforces,
  today = new Date().toISOString().slice(0, 10)
}) {
  const upperBound = periodEndOrToday(period, today);
  const nextNowcoder = [...nowcoder];
  const nextCodeforces = [...codeforces];
  const summary = {
    studentsTotal: students.length,
    codeforcesSynced: 0,
    nowcoderSynced: 0,
    codeforcesSkipped: 0,
    nowcoderSkipped: 0,
    nowcoderAdded: 0,
    nowcoderUpdated: 0,
    nowcoderPreservedManual: 0,
    warnings: []
  };

  for (const student of students) {
    if (student.status !== 'ACTIVE') continue;

    if (student.codeforcesHandle) {
      try {
        const previousRecord = pickCodeforcesRecord(
          nextCodeforces,
          period.id,
          student.id,
          student.codeforcesHandle
        );
        const useIncremental = canUseCodeforcesIncrementalSync(
          previousRecord,
          student.codeforcesHandle
        );
        const payload = await fetchCodeforcesData(student.codeforcesHandle, {
          submissionSinceTime: useIncremental ? previousRecord?.fetchedAt : undefined,
          percentileFromDate: useIncremental
            ? maxDate(previousRecord?.fetchedAt?.slice(0, 10) ?? period.startDate, period.startDate)
            : period.startDate,
          percentileToDate: upperBound,
          cachedContestHistory: useIncremental ? previousRecord?.contestHistory : undefined
        });
        const normalized = normalizeCodeforcesRecord(
          period.id,
          student.id,
          payload,
          previousRecord
        );
        const index = nextCodeforces.findIndex(
          (record) => record.periodId === period.id && record.studentId === student.id
        );
        if (index === -1) nextCodeforces.push(normalized);
        else nextCodeforces[index] = normalized;
        summary.codeforcesSynced += 1;
      } catch (error) {
        summary.warnings.push(
          `Codeforces ${student.name}: ${error instanceof Error ? error.message : '同步失败'}`
        );
      }
    } else {
      summary.codeforcesSkipped += 1;
    }

    if (student.nowcoderUserId) {
      try {
        const from = inferIncrementalFrom(nextNowcoder, period.id, student.id, period.startDate);
        const payload = await fetchNowcoderRecords({
          userId: student.nowcoderUserId,
          studentId: student.id,
          periodId: period.id,
          from,
          to: upperBound
        });
        const merged = mergeNowcoderRecords(nextNowcoder, payload.records);
        nextNowcoder.splice(0, nextNowcoder.length, ...merged.records);
        summary.nowcoderSynced += 1;
        summary.nowcoderAdded += merged.added;
        summary.nowcoderUpdated += merged.updated;
        summary.nowcoderPreservedManual += merged.preservedManual;
      } catch (error) {
        summary.warnings.push(
          `Nowcoder ${student.name}: ${error instanceof Error ? error.message : '同步失败'}`
        );
      }
    } else {
      summary.nowcoderSkipped += 1;
    }
  }

  return {
    nowcoder: nextNowcoder,
    codeforces: nextCodeforces,
    summary
  };
}
