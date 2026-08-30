<template>
  <main class="admin-shell">
    <header class="admin-header">
      <div>
        <p class="eyebrow">MAINTENANCE CONSOLE</p>
        <h1>管理台</h1>
        <p class="muted">修改先保存在当前浏览器；确认无误后导出 JSON，再提交到 GitHub。</p>
      </div>
      <RouterLink to="/" class="back-link">&lt; 返回排行榜</RouterLink>
    </header>

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
        <p class="muted">权重总和必须等于 100%，保存后排行榜即时重算。</p>
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
        <p class="rule-note">分数采用当前仓库数据实时计算，修改权重不会覆盖原始数据。</p>
      </article>
    </section>

    <section v-else class="admin-grid">
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
        <p class="muted">导入单个 `src/data/*.json` 文件，或导出当前浏览器内维护的数据。</p>
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
import { RouterLink } from 'vue-router';
import {
  getActivePeriod,
  getDataSnapshot,
  getRule,
  resetMaintenanceData,
  replaceDataSet,
  upsertCodeforcesRecord,
  upsertStudent,
  updateRuleWeights,
  useDataStore
} from '../data/store';
import { validateDataSet, type DataSetKey } from '../domain/validation';
import { fetchCodeforcesData, normalizeCodeforcesApi } from '../services/codeforces';
import type { Student } from '../types';

const data = useDataStore();
const tab = ref<'students' | 'weights' | 'data'>('students');
const period = computed(() => getActivePeriod());
const rule = computed(() => getRule(period.value.ruleVersionId));

const blankStudent = () => ({
  studentNo: '',
  name: '',
  className: '',
  grade: 2026,
  codeforcesHandle: '',
  nowcoderHandle: ''
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
    status: 'ACTIVE'
  };
  if (data.students.some((item) => item.studentNo === student.studentNo && item.id !== student.id)) {
    studentMessage.value = '学号已存在，请检查后再保存。';
    return;
  }
  upsertStudent(student);
  studentMessage.value = `已保存 ${student.name}，排行榜会自动重算。`;
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
  weightMessage.value = '权重已保存，返回排行榜即可查看新结果。';
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
    syncMessage.value = `已同步 ${result.user.handle}：${normalized.totalSolved} 道题，${normalized.contestCount} 场比赛。请导出 codeforces.json 后提交到 GitHub。`;
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
    dataMessage.value = `已导入 ${file.name}，仅保存在当前浏览器。`;
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
  dataMessage.value = `已导出 ${key}.json，请覆盖仓库中的同名文件后提交。`;
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
