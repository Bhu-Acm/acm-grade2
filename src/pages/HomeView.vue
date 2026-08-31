<template>
  <main class="site-shell">
    <header class="hero">
      <div>
        <p class="eyebrow">BHU ACM TRAINING SYSTEM <span>// 2026</span></p>
        <h1>新生综合能力榜</h1>
        <p class="hero-copy">
          支持近 7 天、近 30 天和全周期视图。窗口内会按牛客比赛日期与 Codeforces 历史记录重算分数。
        </p>
      </div>
      <div class="period-chip">
        <span class="live-dot"></span>
        {{ period.name }}
      </div>
    </header>

    <section class="stats-grid">
      <article class="stat-card">
        <span>当前视图</span>
        <strong>{{ activeWindow.label }}</strong>
        <small>{{ activeWindow.startDate }} ~ {{ activeWindow.endDate }}</small>
      </article>
      <article class="stat-card accent">
        <span>榜首分数</span>
        <strong>{{ topScore }}</strong>
        <small>BEST TOTAL SCORE</small>
      </article>
      <article class="stat-card">
        <span>平均分</span>
        <strong>{{ averageScore }}</strong>
        <small>GROUP AVERAGE</small>
      </article>
      <article class="stat-card">
        <span>评分方案</span>
        <strong class="sync-time">{{ rule.version }}</strong>
        <small>{{ rule.name }}</small>
      </article>
    </section>

    <section class="window-switcher panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">WINDOWS</p>
          <h2>时间窗口切换</h2>
        </div>
        <span class="rule-label">锚点 {{ activeWindow.anchorDate }}</span>
      </div>
      <div class="window-tabs">
        <button
          v-for="item in windows"
          :key="item.key"
          :class="{ active: windowKey === item.key }"
          @click="windowKey = item.key"
        >
          {{ item.label }}
        </button>
      </div>
      <p v-if="legacyCodeforcesData" class="muted">
        检测到旧版 Codeforces 聚合数据。窗口榜单已可用，但更精确的近 7 天 / 近 30 天和趋势图需要在管理台重新同步一次。
      </p>
      <p class="muted">考勤目前仍是周期聚合记录，因此在不同窗口中保持不变。</p>
    </section>

    <section class="content-grid">
      <article class="panel scoreboard-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">LIVE SCOREBOARD</p>
            <h2>{{ activeWindow.label }}排名</h2>
          </div>
          <span class="rule-label">方案 4 · 百分制归一化</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>选手</th>
                <th>等级</th>
                <th>总分</th>
                <th>牛客表现</th>
                <th>CF 过题</th>
                <th>参赛表现</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in scoreboard"
                :key="row.studentId"
                :class="{ selected: selectedStudentId === row.studentId }"
                @click="selectedStudentId = row.studentId"
              >
                <td><span class="rank-number" :class="`rank-${row.rank}`">{{ row.rank ?? '-' }}</span></td>
                <td>
                  <div class="student-name">{{ row.student.name }}</div>
                  <div class="student-meta">{{ row.student.studentNo }} / {{ row.student.className }}</div>
                </td>
                <td><span class="level" :class="`level-${row.level}`">{{ row.level }}</span></td>
                <td class="score">{{ formatScore(row.totalScore) }}</td>
                <td>{{ formatScore(row.breakdown.nowcoderPerformance) }}</td>
                <td>{{ formatScore(row.breakdown.codeforcesSolved) }}</td>
                <td>{{ formatScore(row.breakdown.codeforcesContestPerformance) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="panel detail-panel">
        <div v-if="selectedRow">
          <div class="profile-head">
            <div class="avatar">{{ selectedRow.student.name.slice(0, 1) }}</div>
            <div>
              <p class="eyebrow">CONTESTANT #{{ selectedRow.rank ?? '--' }}</p>
              <h2>{{ selectedRow.student.name }}</h2>
              <p class="muted">{{ selectedRow.student.className }} / {{ selectedRow.student.studentNo }}</p>
            </div>
          </div>

          <div class="total-score">
            <span>{{ activeWindow.label }}综合评分</span>
            <strong>{{ formatScore(selectedRow.totalScore) }}</strong>
            <span class="level large" :class="`level-${selectedRow.level}`">{{ selectedRow.level }}</span>
          </div>

          <div class="breakdown">
            <div v-for="item in breakdownItems" :key="item.label" class="breakdown-row">
              <span>{{ item.label }} <small>{{ item.weight }}</small></span>
              <strong>{{ formatScore(item.value) }}</strong>
              <div class="meter"><i :style="{ width: `${item.value ?? 0}%` }"></i></div>
            </div>
          </div>

          <section class="detail-metrics">
            <div class="panel-heading">
              <div>
                <p class="eyebrow">RAW METRICS</p>
                <h2>训练数据明细</h2>
              </div>
              <span class="rule-label">{{ activeWindow.label }}</span>
            </div>
            <div class="detail-stats">
              <div class="status-card">
                <span>牛客 Rating</span>
                <strong>{{ formatInteger(nowcoderSummary.rating) }}</strong>
              </div>
              <div class="status-card">
                <span>牛客总解题数</span>
                <strong>{{ formatInteger(nowcoderSummary.totalSolved) }}</strong>
              </div>
              <div class="status-card">
                <span>CF Rating</span>
                <strong>{{ formatInteger(codeforcesSummary.rating) }}</strong>
              </div>
              <div class="status-card">
                <span>CF 总过题数</span>
                <strong>{{ formatInteger(codeforcesSummary.totalSolved) }}</strong>
              </div>
            </div>
            <div class="detail-stats">
              <div class="status-card">
                <span>牛客比赛数</span>
                <strong>{{ formatInteger(nowcoderSummary.contestCount) }}</strong>
              </div>
              <div class="status-card">
                <span>牛客平均单场分</span>
                <strong>{{ formatScore(nowcoderSummary.averageContestScore) }}</strong>
              </div>
              <div class="status-card">
                <span>CF Max Rating</span>
                <strong>{{ formatInteger(codeforcesSummary.maxRating) }}</strong>
              </div>
              <div class="status-card">
                <span>CF 比赛数</span>
                <strong>{{ formatInteger(codeforcesSummary.contestCount) }}</strong>
              </div>
            </div>
            <div class="difficulty-panel">
              <p class="eyebrow">CF DIFFICULTY SPLIT</p>
              <div v-if="difficultyStats.length" class="difficulty-chips">
                <span v-for="item in difficultyStats" :key="item.label" class="difficulty-chip">
                  {{ item.label }} · {{ item.count }} 题
                </span>
              </div>
              <p v-else class="muted">当前窗口内还没有可用的 Codeforces 难度分布数据。</p>
            </div>
          </section>

          <section class="trend-panel">
            <div class="panel-heading">
              <div>
                <p class="eyebrow">TREND</p>
                <h2>阶段走势</h2>
              </div>
              <span class="rule-label">{{ trendDelta }}</span>
            </div>
            <svg v-if="trendPath" class="trend-chart" viewBox="0 0 320 120" preserveAspectRatio="none">
              <polyline class="trend-line" :points="trendPath" />
              <circle
                v-for="point in trendPlotPoints"
                :key="point.date"
                class="trend-dot"
                :cx="point.x"
                :cy="point.y"
                r="4"
              />
            </svg>
            <div class="trend-grid">
              <div v-for="point in trendPoints" :key="point.date" class="status-card">
                <span>{{ point.date.slice(5) }}</span>
                <strong>{{ formatScore(point.score) }}</strong>
              </div>
            </div>
          </section>

          <div class="next-step">
            <span class="next-icon">&gt;_</span>
            <div>
              <strong>{{ advice.title }}</strong>
              <p>{{ advice.text }}</p>
            </div>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getActivePeriod, getRule, useDataStore } from '../data/store';
import { buildWindowedCodeforcesRecord } from '../domain/ranking';
import {
  buildStudentTrend,
  getWindowOptions,
  loadScoreboard
} from '../domain/scoreboard';
import type { ScoreWindowKey } from '../domain/ranking';
import { pickCodeforcesRecord } from '../services/codeforces';
import { calculateNowcoderContestScore } from '../domain/score';

const TODAY = new Date().toISOString().slice(0, 10);

const data = useDataStore();
const selectedStudentId = ref('');
const windowKey = ref<ScoreWindowKey>('all');
const period = computed(() => getActivePeriod());
const rule = computed(() => getRule(period.value.ruleVersionId));
const windows = computed(() => getWindowOptions(period.value.id, TODAY));
const activeWindow = computed(
  () => windows.value.find((item) => item.key === windowKey.value) ?? windows.value[2]
);
const scoreboard = computed(() =>
  loadScoreboard(period.value.id, rule.value, { window: activeWindow.value })
);
const selectedRow = computed(() =>
  scoreboard.value.find((row) => row.studentId === selectedStudentId.value)
);

watch(
  scoreboard,
  (rows) => {
    if (!rows.some((row) => row.studentId === selectedStudentId.value)) {
      selectedStudentId.value = rows[0]?.studentId ?? '';
    }
  },
  { immediate: true }
);

const topScore = computed(() => formatScore(scoreboard.value[0]?.totalScore ?? null));
const averageScore = computed(() => {
  const complete = scoreboard.value.flatMap((row) =>
    row.totalScore === null ? [] : [row.totalScore]
  );
  return formatScore(
    complete.length
      ? complete.reduce((sum, score) => sum + score, 0) / complete.length
      : null
  );
});

const breakdownItems = computed(() => {
  const row = selectedRow.value;
  if (!row) return [];
  return [
    { label: '考勤率', weight: '15%', value: row.breakdown.attendance },
    { label: '牛客 Rating', weight: '10%', value: row.breakdown.nowcoderRating },
    { label: '牛客参赛表现', weight: '10%', value: row.breakdown.nowcoderPerformance },
    { label: 'CF Rating', weight: '25%', value: row.breakdown.codeforcesRating },
    { label: 'CF 过题量', weight: '15%', value: row.breakdown.codeforcesSolved },
    { label: 'CF 难度', weight: '15%', value: row.breakdown.codeforcesDifficulty },
    {
      label: 'CF 参赛排名',
      weight: '15%',
      value: row.breakdown.codeforcesContestPerformance
    },
    { label: '参赛次数', weight: '5%', value: row.breakdown.participation }
  ];
});

const selectedCodeforcesRecord = computed(() => {
  if (!selectedRow.value) return undefined;
  const record = pickCodeforcesRecord(
    data.codeforces,
    period.value.id,
    selectedRow.value.studentId
  );
  return buildWindowedCodeforcesRecord(record, activeWindow.value);
});

const selectedNowcoderRecords = computed(() => {
  if (!selectedRow.value) return [];
  return data.nowcoder
    .filter(
      (item) =>
        item.periodId === period.value.id &&
        item.studentId === selectedRow.value!.studentId &&
        item.contestDate >= activeWindow.value.startDate &&
        item.contestDate <= activeWindow.value.endDate
    )
    .sort((left, right) => right.contestDate.localeCompare(left.contestDate));
});

const nowcoderSummary = computed(() => {
  const rating = selectedNowcoderRecords.value.find(
    (item) => typeof item.rating === 'number' && Number.isFinite(item.rating) && item.rating > 0
  )?.rating;
  const totalSolved = selectedNowcoderRecords.value.reduce(
    (sum, item) => sum + Math.max(0, item.solvedCount),
    0
  );
  const averageContestScore = selectedNowcoderRecords.value.length
    ? selectedNowcoderRecords.value.reduce(
        (sum, item) => sum + calculateNowcoderContestScore(item),
        0
      ) / selectedNowcoderRecords.value.length
    : null;

  return {
    rating,
    totalSolved,
    contestCount: selectedNowcoderRecords.value.length,
    averageContestScore
  };
});

const codeforcesSummary = computed(() => ({
  rating: selectedCodeforcesRecord.value?.rating,
  maxRating: selectedCodeforcesRecord.value?.maxRating,
  totalSolved: selectedCodeforcesRecord.value?.totalSolved ?? null,
  contestCount: selectedCodeforcesRecord.value?.contestCount ?? null
}));

const difficultyStats = computed(() =>
  Object.entries(selectedCodeforcesRecord.value?.difficultyStats ?? {})
    .map(([rating, count]) => ({ label: rating, count: Number(count) }))
    .filter((item) => item.count > 0)
    .sort((left, right) => {
      if (left.label === 'UNRATED') return 1;
      if (right.label === 'UNRATED') return -1;
      return Number(left.label) - Number(right.label);
    })
);

const trendPoints = computed(() =>
  selectedRow.value
    ? buildStudentTrend(selectedRow.value.studentId, period.value.id, rule.value, TODAY)
    : []
);

const trendPlotPoints = computed(() => {
  const values = trendPoints.value.map((point) => point.score ?? 0);
  if (!values.length) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;

  return trendPoints.value.map((point, index) => {
    const x = 18 + (index * 284) / Math.max(trendPoints.value.length - 1, 1);
    const y = 102 - (((point.score ?? 0) - min) / spread) * 76;
    return { ...point, x, y };
  });
});

const trendPath = computed(() =>
  trendPlotPoints.value.map((point) => `${point.x},${point.y}`).join(' ')
);

const trendDelta = computed(() => {
  const scored = trendPoints.value.filter(
    (point): point is { date: string; score: number } => point.score !== null
  );
  if (scored.length < 2) return '趋势数据不足';
  const delta = scored.at(-1)!.score - scored[0].score;
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`;
});

const legacyCodeforcesData = computed(() =>
  data.codeforces.some(
    (record) => (record.solvedHistory?.length ?? 0) === 0 || (record.contestHistory?.length ?? 0) === 0
  )
);

const advice = computed(() => {
  const weakest = breakdownItems.value.reduce(
    (current, item) =>
      (item.value ?? -1) < (current.value ?? -1) ? item : current,
    breakdownItems.value[0] ?? { label: '训练基础', value: 0 }
  );
  return {
    title: `下一目标：提升${weakest.label}`,
    text: weakest.label.includes('参赛')
      ? '增加有效比赛参与，并在赛后复盘排名与失分点。'
      : '优先补齐这一项，持续训练后榜单和走势都会自动刷新。'
  };
});

function formatScore(score: number | null | undefined): string {
  return score === null || score === undefined ? '--' : score.toFixed(2);
}

function formatInteger(value: number | null | undefined): string {
  return value === null || value === undefined ? '--' : String(Math.round(value));
}

void data;
</script>
