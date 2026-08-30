<template>
  <main class="admin-shell">
    <header class="admin-header">
      <div>
        <p class="eyebrow">MAINTENANCE CONSOLE</p>
        <h1>管理台</h1>
        <p class="muted">先编辑本地草稿，确认后再同步到 GitHub。</p>
      </div>
      <div class="admin-header-actions">
        <button class="text-button" @click="lock">锁定管理台</button>
        <RouterLink to="/" class="back-link">&lt; 返回排行榜</RouterLink>
      </div>
    </header>

    <section class="github-bar panel">
      <div>
        <p class="eyebrow">GITHUB DATA SYNC</p>
        <strong>{{ githubConfig.owner }}/{{ githubConfig.repo }} · {{ githubConfig.branch }}</strong>
        <p class="muted">Token 仅用于当前页面请求，不会保存或提交到仓库。</p>
      </div>
      <div class="github-actions">
        <input v-model.trim="githubToken" type="password" placeholder="GitHub Token（Contents: Read and write）" />
        <input v-model.trim="commitMessage" placeholder="提交说明，例如：更新 2026 春训数据" />
        <button class="secondary-button" :disabled="githubBusy || !githubToken" @click="pullFromGithub">
          {{ githubBusy && githubAction === 'pull' ? '获取中...' : '从 GitHub 获取数据' }}
        </button>
        <button class="primary-button" :disabled="githubBusy || !githubToken" @click="pushToGithub">
          {{ githubBusy && githubAction === 'push' ? '提交中...' : '提交更改到 GitHub' }}
        </button>
      </div>
      <p v-if="githubMessage" class="form-message">{{ githubMessage }}</p>
    </section>

    <div class="admin-tabs">
      <button :class="{ active: tab === 'students' }" @click="tab = 'students'">学生录入</button>
      <button :class="{ active: tab === 'weights' }" @click="tab = 'weights'">评分权重</button>
      <button :class="{ active: tab === 'data' }" @click="tab = 'data'">数据维护</button>
    </div>

    <section v-if="tab === 'students'" class="admin-grid">
      <article class="panel admin-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">{{ editingStudentId ? 'EDIT CONTESTANT' : 'NEW CONTESTANT' }}</p>
            <h2>{{ editingStudentId ? '编辑学生' : '录入学生' }}</h2>
          </div>
          <button v-if="editingStudentId" class="text-button" @click="resetStudentForm">取消编辑</button>
        </div>
        <form class="admin-form" @submit.prevent="saveStudent">
          <label>学号<input v-model.trim="studentForm.studentNo" required /></label>
          <label>姓名<input v-model.trim="studentForm.name" required /></label>
          <label>班级<input v-model.trim="studentForm.className" required /></label>
          <label>年级<input v-model.number="studentForm.grade" type="number" required /></label>
          <label>Codeforces Handle<input v-model.trim="studentForm.codeforcesHandle" /></label>
          <label>牛客 Handle<input v-model.trim="studentForm.nowcoderHandle" /></label>
          <label>牛客用户 ID<input v-model.trim="studentForm.nowcoderUserId" placeholder="用于运行牛客抓取脚本" /></label>
          <button class="primary-button" type="submit">{{ editingStudentId ? '保存修改' : '加入榜单' }}</button>
        </form>
        <p v-if="studentMessage" class="form-message">{{ studentMessage }}</p>
      </article>

      <article class="panel admin-panel table-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">CONTESTANTS {{ data.students.length }}</p>
            <h2>学生列表</h2>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>学号</th><th>姓名</th><th>班级</th><th>Codeforces</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="student in data.students" :key="student.id">
                <td>{{ student.studentNo }}</td>
                <td class="student-name">{{ student.name }}</td>
                <td>{{ student.className }}</td>
                <td class="student-meta">{{ student.codeforcesHandle || '--' }}</td>
                <td><button class="text-button" @click="editStudent(student)">编辑</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section v-else-if="tab === 'weights'" class="admin-grid weights-grid">
      <article class="panel admin-panel">
        <p class="eyebrow">RULE VERSION {{ rule.version }}</p>
        <h2>调整评分权重</h2>
        <p class="muted">当前默认方案：出勤 20%，牛客 30%，Codeforces 50%；保存后排行榜即时重算。</p>
        <div class="weight-form">
          <label>出勤<input v-model.number="weightForm.attendance" type="number" min="0" max="1" step="0.05" /></label>
          <label>牛客<input v-model.number="weightForm.nowcoder" type="number" min="0" max="1" step="0.05" /></label>
          <label>Codeforces<input v-model.number="weightForm.codeforces" type="number" min="0" max="1" step="0.05" /></label>
        </div>
        <div class="weight-total" :class="{ invalid: !weightsValid }">
          <span>当前总和</span><strong>{{ weightTotal }}%</strong>
        </div>
        <button class="primary-button" :disabled="!weightsValid" @click="saveWeights">保存权重</button>
        <p v-if="weightMessage" class="form-message">{{ weightMessage }}</p>
      </article>
      <article class="panel admin-panel rule-preview">
        <p class="eyebrow">PREVIEW</p>
        <h2>当前规则</h2>
        <div v-for="item in weightItems" :key="item.label" class="preview-row">
          <span>{{ item.label }}</span><strong>{{ item.value }}%</strong><i :style="{ width: `${item.value}%` }"></i>
        </div>
        <p class="rule-note">牛客默认按最近 3 场平均，规则会在提交更改时同步为 `rules.json`。</p>
      </article>
    </section>

    <section v-else class="admin-grid">
      <article class="panel admin-panel nowcoder-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">{{ editingNowcoderId ? 'EDIT NOWCODER SCORE' : 'MANUAL NOWCODER ENTRY' }}</p>
            <h2>{{ editingNowcoderId ? '编辑牛客成绩' : '录入牛客成绩' }}</h2>
          </div>
          <button v-if="editingNowcoderId" class="text-button" @click="resetNowcoderForm">取消编辑</button>
        </div>
        <form class="admin-form nowcoder-form" @submit.prevent="saveNowcoder">
          <label>学生
            <select v-model="nowcoderForm.studentId" required>
              <option v-for="student in data.students" :key="student.id" :value="student.id">
                {{ student.name }} · {{ student.studentNo }}
              </option>
            </select>
          </label>
          <label>比赛名称<input v-model.trim="nowcoderForm.contestName" placeholder="例如：春训周赛 04" required /></label>
          <label>比赛日期<input v-model="nowcoderForm.contestDate" type="date" required /></label>
          <label>参赛人数<input v-model.number="nowcoderForm.participantCount" type="number" min="1" required /></label>
          <label>排名<input v-model.number="nowcoderForm.rank" type="number" min="1" required /></label>
          <label>解题数<input v-model.number="nowcoderForm.solvedCount" type="number" min="0" required /></label>
          <label class="full-field">备注<input v-model.trim="nowcoderForm.remark" placeholder="可选，例如人工核对来源" /></label>
          <div class="nowcoder-preview">
            <span>单场换算分</span>
            <strong>{{ nowcoderPreviewScore }}</strong>
            <small>=(参赛人数 - 排名 + 1) / 参赛人数 × 100</small>
          </div>
          <button class="primary-button" type="submit">
            {{ editingNowcoderId ? '保存牛客成绩' : '加入牛客数据' }}
          </button>
        </form>
        <p v-if="nowcoderMessage" class="form-message">{{ nowcoderMessage }}</p>
      </article>

      <article class="panel admin-panel table-panel nowcoder-records-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">NOWCODER RECORDS {{ periodNowcoderRecords.length }}</p>
            <h2>当前周期牛客数据</h2>
          </div>
          <span class="rule-label">保存后点击上方提交 GitHub</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>日期</th><th>学生</th><th>比赛</th><th>排名</th><th>人数</th><th>单场分</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="record in periodNowcoderRecords" :key="record.id">
                <td>{{ record.contestDate }}</td>
                <td class="student-name">{{ studentName(record.studentId) }}</td>
                <td>{{ record.contestName }}</td>
                <td>{{ record.rank }}</td>
                <td>{{ record.participantCount }}</td>
                <td class="score">{{ contestScore(record) }}</td>
                <td class="row-actions">
                  <button class="text-button" @click="editNowcoder(record)">编辑</button>
                  <button class="text-button danger" @click="deleteNowcoder(record.id)">删除</button>
                </td>
              </tr>
              <tr v-if="!periodNowcoderRecords.length">
                <td colspan="7" class="empty-cell">当前周期还没有牛客成绩</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="panel admin-panel">
        <p class="eyebrow">CODEFORCES API</p>
        <h2>同步用户数据</h2>
        <p class="muted">读取用户资料、提交记录和比赛记录，生成一条 Codeforces 快照。</p>
        <div class="admin-form">
          <label>学生
            <select v-model="syncStudentId">
              <option v-for="student in data.students" :key="student.id" :value="student.id">{{ student.name }} · {{ student.studentNo }}</option>
            </select>
          </label>
          <label>Handle<input v-model.trim="syncHandle" placeholder="例如 tourist" /></label>
          <button class="primary-button" :disabled="syncing || !syncHandle" @click="syncCodeforces">
            {{ syncing ? '同步中（约 5 秒）' : '同步 Codeforces' }}
          </button>
        </div>
        <p v-if="syncMessage" class="form-message">{{ syncMessage }}</p>
      </article>

      <article class="panel admin-panel">
        <p class="eyebrow">JSON IMPORT / EXPORT</p>
        <h2>手动导入和导出</h2>
        <p class="muted">导入单个数据文件，或导出当前草稿。导出后也可以直接用 Git 提交。</p>
        <label>数据类型
          <select v-model="uploadTarget">
            <option value="students">students.json</option>
            <option value="attendance">attendance.json</option>
            <option value="nowcoder">nowcoder.json</option>
            <option value="codeforces">codeforces.json</option>
            <option value="rules">rules.json</option>
          </select>
        </label>
        <input class="file-input" type="file" accept="application/json,.json" @change="importJson" />
        <div class="export-actions">
          <button class="secondary-button" @click="downloadDataSet(uploadTarget)">导出当前文件</button>
          <button class="secondary-button" @click="downloadAllData">导出全部数据</button>
          <button class="text-button danger" @click="resetData">恢复仓库初始数据</button>
        </div>
        <p v-if="dataMessage" class="form-message">{{ dataMessage }}</p>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { lockAdmin } from '../adminAuth';
import {
  getActivePeriod,
  getDataSnapshot,
  getRule,
  removeNowcoderScore,
  resetMaintenanceData,
  replaceAllData,
  replaceDataSet,
  upsertCodeforcesRecord,
  upsertNowcoderScore,
  upsertStudent,
  updateRuleWeights,
  useDataStore
} from '../data/store';
import { validateDataSet, type DataSetKey } from '../domain/validation';
import { calculateNowcoderContestScore } from '../domain/score';
import { fetchCodeforcesData, normalizeCodeforcesApi } from '../services/codeforces';
import { commitGithubData, fetchGithubData, githubConfig } from '../services/github';
import type { NowcoderContestScore, Student } from '../types';

const router = useRouter();
const data = useDataStore();
const tab = ref<'students' | 'weights' | 'data'>('students');
const period = computed(() => getActivePeriod());
const rule = computed(() => getRule(period.value.ruleVersionId));

const githubToken = ref('');
const commitMessage = ref('更新 ACM 新生训练数据');
const githubBusy = ref(false);
const githubAction = ref<'pull' | 'push' | ''>('');
const githubMessage = ref('');
async function pullFromGithub() {
  githubBusy.value = true;
  githubAction.value = 'pull';
  githubMessage.value = '';
  try {
    const remote = await fetchGithubData();
    replaceAllData({
      students: remote.students ?? data.students,
      periods: remote.periods ?? data.periods,
      rules: remote.rules ?? data.rules,
      attendance: remote.attendance ?? data.attendance,
      nowcoder: remote.nowcoder ?? data.nowcoder,
      codeforces: remote.codeforces ?? data.codeforces
    });
    githubMessage.value = '已从 GitHub 获取最新数据，并覆盖当前浏览器草稿。';
  } catch (error) {
    githubMessage.value = error instanceof Error ? error.message : 'GitHub 数据获取失败。';
  } finally {
    githubBusy.value = false;
    githubAction.value = '';
  }
}

async function pushToGithub() {
  githubBusy.value = true;
  githubAction.value = 'push';
  githubMessage.value = '';
  try {
    const results = await commitGithubData(getDataSnapshot(), githubToken.value, commitMessage.value);
    githubMessage.value = `已提交 ${results.length} 个数据文件到 GitHub。公开排行榜刷新后即可看到新数据。`;
  } catch (error) {
    githubMessage.value = error instanceof Error ? error.message : 'GitHub 提交失败。';
  } finally {
    githubBusy.value = false;
    githubAction.value = '';
  }
}

async function lock() {
  lockAdmin();
  await router.replace('/admin-access');
}

const blankStudent = () => ({
  studentNo: '',
  name: '',
  className: '',
  grade: 2026,
  codeforcesHandle: '',
  nowcoderHandle: '',
  nowcoderUserId: ''
});
const studentForm = reactive(blankStudent());
const editingStudentId = ref('');
const studentMessage = ref('');

function resetStudentForm() {
  Object.assign(studentForm, blankStudent());
  editingStudentId.value = '';
  studentMessage.value = '';
}

function editStudent(student: Student) {
  Object.assign(studentForm, student);
  editingStudentId.value = student.id;
  studentMessage.value = '';
}

function saveStudent() {
  const student: Student = {
    id: editingStudentId.value || `stu-${Date.now()}`,
    studentNo: studentForm.studentNo,
    name: studentForm.name,
    className: studentForm.className,
    grade: studentForm.grade,
    codeforcesHandle: studentForm.codeforcesHandle || undefined,
    nowcoderHandle: studentForm.nowcoderHandle || undefined,
    nowcoderUserId: studentForm.nowcoderUserId || undefined,
    status: 'ACTIVE'
  };
  if (data.students.some((item) => item.studentNo === student.studentNo && item.id !== student.id)) {
    studentMessage.value = '学号已存在，请检查后再保存。';
    return;
  }
  upsertStudent(student);
  studentMessage.value = `已保存 ${student.name}，提交更改后才会同步到 GitHub。`;
  if (!editingStudentId.value) resetStudentForm();
}

const weightForm = reactive({ ...rule.value.weights });
const weightTotal = computed(() =>
  Math.round((weightForm.attendance + weightForm.nowcoder + weightForm.codeforces) * 100)
);
const weightsValid = computed(() => Math.abs(weightTotal.value - 100) < 0.001);
const weightMessage = ref('');
const weightItems = computed(() => [
  { label: '出勤表现', value: Math.round(weightForm.attendance * 100) },
  { label: '牛客竞赛', value: Math.round(weightForm.nowcoder * 100) },
  { label: 'Codeforces', value: Math.round(weightForm.codeforces * 100) }
]);

watch(
  () => rule.value.weights,
  (weights) => Object.assign(weightForm, weights),
  { deep: true }
);

function saveWeights() {
  updateRuleWeights({ ...weightForm });
  weightMessage.value = '权重已保存到本地草稿，点击上方提交按钮同步 GitHub。';
}

const nowcoderForm = reactive({
  studentId: data.students[0]?.id ?? '',
  contestName: '',
  contestDate: '2026-08-30',
  participantCount: 0,
  rank: 0,
  solvedCount: 0,
  remark: ''
});
const editingNowcoderId = ref('');
const nowcoderMessage = ref('');
const periodNowcoderRecords = computed(() =>
  [...data.nowcoder]
    .filter((record) => record.periodId === period.value.id)
    .sort((a, b) => b.contestDate.localeCompare(a.contestDate))
);
const nowcoderPreviewScore = computed(() => {
  if (nowcoderForm.participantCount <= 0 || nowcoderForm.rank <= 0) return '--';
  return calculateNowcoderContestScore({
    id: 'preview',
    periodId: period.value.id,
    studentId: nowcoderForm.studentId,
    contestId: 'preview',
    contestName: nowcoderForm.contestName || 'preview',
    contestDate: nowcoderForm.contestDate,
    participantCount: nowcoderForm.participantCount,
    rank: nowcoderForm.rank,
    solvedCount: nowcoderForm.solvedCount,
    source: 'MANUAL',
    isManualOverride: true,
    updatedAt: new Date().toISOString()
  }).toFixed(2);
});

function studentName(studentId: string) {
  return data.students.find((student) => student.id === studentId)?.name ?? '未知学生';
}

function contestScore(record: NowcoderContestScore) {
  return calculateNowcoderContestScore(record).toFixed(2);
}

function resetNowcoderForm() {
  Object.assign(nowcoderForm, {
    studentId: data.students[0]?.id ?? '',
    contestName: '',
    contestDate: '2026-08-30',
    participantCount: 0,
    rank: 0,
    solvedCount: 0,
    remark: ''
  });
  editingNowcoderId.value = '';
  nowcoderMessage.value = '';
}

function editNowcoder(record: NowcoderContestScore) {
  Object.assign(nowcoderForm, {
    studentId: record.studentId,
    contestName: record.contestName,
    contestDate: record.contestDate,
    participantCount: record.participantCount,
    rank: record.rank,
    solvedCount: record.solvedCount,
    remark: record.remark ?? ''
  });
  editingNowcoderId.value = record.id;
  nowcoderMessage.value = '';
}

function saveNowcoder() {
  if (nowcoderForm.rank > nowcoderForm.participantCount) {
    nowcoderMessage.value = '排名不能大于参赛人数。';
    return;
  }
  const current = data.nowcoder.find((record) => record.id === editingNowcoderId.value);
  const record: NowcoderContestScore = {
    id: editingNowcoderId.value || `nc-score-${Date.now()}`,
    periodId: period.value.id,
    studentId: nowcoderForm.studentId,
    contestId: current?.contestId || `nc-${nowcoderForm.contestDate}-${nowcoderForm.contestName}`,
    contestName: nowcoderForm.contestName,
    contestDate: nowcoderForm.contestDate,
    participantCount: nowcoderForm.participantCount,
    rank: nowcoderForm.rank,
    solvedCount: nowcoderForm.solvedCount,
    source: 'MANUAL',
    isManualOverride: true,
    remark: nowcoderForm.remark || undefined,
    updatedAt: new Date().toISOString()
  };
  try {
    upsertNowcoderScore(record);
    resetNowcoderForm();
    nowcoderMessage.value = `已保存 ${studentName(record.studentId)} 的 ${record.contestName}，提交更改后同步 GitHub。`;
  } catch (error) {
    nowcoderMessage.value = error instanceof Error ? error.message : '牛客成绩保存失败。';
  }
}

function deleteNowcoder(id: string) {
  if (!window.confirm('确认删除这条牛客成绩吗？')) return;
  removeNowcoderScore(id);
  nowcoderMessage.value = '牛客成绩已删除，提交更改后同步 GitHub。';
}

const syncStudentId = ref(data.students[0]?.id ?? '');
const syncHandle = ref(data.students[0]?.codeforcesHandle ?? '');
const syncing = ref(false);
const syncMessage = ref('');

watch(syncStudentId, (studentId) => {
  syncHandle.value = data.students.find((student) => student.id === studentId)?.codeforcesHandle ?? '';
});

async function syncCodeforces() {
  const student = data.students.find((item) => item.id === syncStudentId.value);
  if (!student || !syncHandle.value) return;
  syncing.value = true;
  syncMessage.value = '';
  try {
    const result = await fetchCodeforcesData(syncHandle.value);
    const normalized = normalizeCodeforcesApi(
      period.value.id,
      student.id,
      result.user,
      result.submissions,
      result.ratingHistory
    );
    upsertCodeforcesRecord({
      ...normalized,
      id: `cf-${student.id}`,
      fetchedAt: new Date().toISOString()
    });
    syncMessage.value = `已同步 ${result.user.handle}：${normalized.totalSolved} 道题，${normalized.contestCount} 场比赛。记得点击上方提交按钮。`;
  } catch (error) {
    syncMessage.value = error instanceof Error ? error.message : '同步失败，请稍后重试。';
  } finally {
    syncing.value = false;
  }
}

const uploadTarget = ref<DataSetKey>('students');
const dataMessage = ref('');

async function importJson(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const value = JSON.parse(await file.text());
    const errors = validateDataSet(uploadTarget.value, value, data);
    if (errors.length) throw new Error(errors[0]);
    replaceDataSet(uploadTarget.value, value);
    dataMessage.value = `已导入 ${file.name}，当前为本地草稿。`;
  } catch (error) {
    dataMessage.value = error instanceof Error ? error.message : 'JSON 导入失败。';
  } finally {
    input.value = '';
  }
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadDataSet(key: DataSetKey) {
  downloadJson(`${key}.json`, getDataSnapshot()[key]);
  dataMessage.value = `已导出 ${key}.json。`;
}

function downloadAllData() {
  downloadJson('acm-grade-data.json', getDataSnapshot());
  dataMessage.value = '已导出完整数据包 acm-grade-data.json。';
}

function resetData() {
  resetMaintenanceData();
  dataMessage.value = '已恢复仓库初始数据。';
  Object.assign(weightForm, rule.value.weights);
}
</script>
