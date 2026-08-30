<template>
  <main class="site-shell">
    <header class="hero">
      <div>
        <p class="eyebrow">BHU ACM TRAINING SYSTEM <span>// 2026</span></p>
        <h1>新生综合能力榜</h1>
        <p class="hero-copy">
          把差距变成下一道题。每一次训练、每一场比赛，都会留下可见的进步。
        </p>
      </div>
      <div class="period-chip">
        <span class="live-dot"></span>
        {{ activePeriod.name }}
      </div>
    </header>

    <section class="stats-grid">
      <article class="stat-card">
        <span>当前选手</span>
        <strong>{{ scoreboard.length }}</strong>
        <small>ACTIVE MEMBERS</small>
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
        <span>最近同步</span>
        <strong class="sync-time">02:00</strong>
        <small>CODEFORCES API</small>
      </article>
    </section>

    <section class="content-grid">
      <article class="panel scoreboard-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">LIVE SCOREBOARD</p>
            <h2>训练排名</h2>
          </div>
          <span class="rule-label">{{ activeRule.version }} · {{ activeRule.name }}</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>选手</th>
                <th>等级</th>
                <th>总分</th>
                <th>出勤</th>
                <th>牛客</th>
                <th>Codeforces</th>
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
                  <div class="student-meta">{{ row.student.studentNo }} · {{ row.student.className }}</div>
                </td>
                <td><span class="level" :class="`level-${row.level}`">{{ row.level }}</span></td>
                <td class="score">{{ formatScore(row.totalScore) }}</td>
                <td>{{ formatScore(row.breakdown.attendance) }}</td>
                <td>{{ formatScore(row.breakdown.nowcoder) }}</td>
                <td>{{ formatScore(row.breakdown.codeforces) }}</td>
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
              <p class="muted">{{ selectedRow.student.className }} · {{ selectedRow.student.studentNo }}</p>
            </div>
          </div>
          <div class="total-score">
            <span>综合评分</span>
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
import { computed, ref } from 'vue';
import { activePeriod, activeRule } from './data';
import { loadScoreboard } from './domain/scoreboard';

const scoreboard = loadScoreboard();
const selectedStudentId = ref(scoreboard[0]?.studentId ?? '');
const selectedRow = computed(() => scoreboard.find((row) => row.studentId === selectedStudentId.value));

const topScore = computed(() => formatScore(scoreboard[0]?.totalScore ?? null));
const averageScore = computed(() => {
  const complete = scoreboard.flatMap((row) => (row.totalScore === null ? [] : [row.totalScore]));
  return formatScore(complete.length ? complete.reduce((sum, score) => sum + score, 0) / complete.length : null);
});

const breakdownItems = computed(() => {
  const row = selectedRow.value;
  if (!row) return [];
  return [
    { label: '出勤表现', weight: `${activeRule.weights.attendance * 100}%`, value: row.breakdown.attendance },
    { label: '牛客竞赛', weight: `${activeRule.weights.nowcoder * 100}%`, value: row.breakdown.nowcoder },
    { label: 'Codeforces', weight: `${activeRule.weights.codeforces * 100}%`, value: row.breakdown.codeforces }
  ];
});

const advice = computed(() => {
  const row = selectedRow.value;
  if (!row) return { title: '选择一名选手', text: '查看他的训练数据和下一步建议。' };
  const weakest = breakdownItems.value.reduce((current, item) =>
    (item.value ?? -1) < (current.value ?? -1) ? item : current
  );
  const messages: Record<string, string> = {
    出勤表现: '稳定参加训练，先把学习节奏固定下来。',
    牛客竞赛: '多参加周赛并复盘错题，把比赛经验转成解题速度。',
    Codeforces: '先完成基础题目标，再逐步挑战更高难度题目。'
  };
  return {
    title: `下一目标：提升${weakest.label}`,
    text: messages[weakest.label]
  };
});

function formatScore(score: number | null | undefined): string {
  return score === null || score === undefined ? '--' : score.toFixed(2);
}
</script>
