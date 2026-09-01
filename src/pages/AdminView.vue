<template>
  <main class="admin-shell">
    <header class="admin-header">
      <div>
        <p class="eyebrow">MAINTENANCE CONSOLE</p>
        <h1>管理台</h1>
        <p class="muted">低频更新场景下，先整理本地草稿，再统一同步到 GitHub。</p>
      </div>
      <div class="admin-header-actions">
        <button class="text-button" @click="lock">锁定管理台</button>
        <RouterLink to="/" class="back-link">&lt; 返回排行榜</RouterLink>
      </div>
    </header>

    <div class="admin-tabs">
      <button :class="{ active: tab === 'students' }" @click="tab = 'students'">学生</button>
      <button :class="{ active: tab === 'weights' }" @click="tab = 'weights'">规则</button>
      <button :class="{ active: tab === 'manual' }" @click="tab = 'manual'">手动录入</button>
      <button :class="{ active: tab === 'auto' }" @click="tab = 'auto'">自动录入</button>
      <button :class="{ active: tab === 'sync' }" @click="tab = 'sync'">GitHub 同步</button>
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
          <label class="full-field">牛客用户 ID<input v-model.trim="studentForm.nowcoderUserId" placeholder="用于牛客脚本与本地一键同步" /></label>
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
            <thead>
              <tr><th>学号</th><th>姓名</th><th>班级</th><th>CF</th><th>牛客 ID</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="student in data.students" :key="student.id">
                <td>{{ student.studentNo }}</td>
                <td class="student-name">{{ student.name }}</td>
                <td>{{ student.className }}</td>
                <td class="student-meta">{{ student.codeforcesHandle || '--' }}</td>
                <td class="student-meta">{{ student.nowcoderUserId || '--' }}</td>
                <td class="row-actions">
                  <button class="text-button" @click="editStudent(student)">编辑</button>
                  <button class="text-button danger" @click="deleteStudent(student)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section v-else-if="tab === 'weights'" class="admin-grid weights-grid">
      <article class="panel admin-panel">
        <p class="eyebrow">RULE VERSION {{ rule.version }}</p>
        <h2>方案 4 权重</h2>
        <p class="muted">当前周期使用推荐方案 4。原始权重合计 110%，计算时统一归一化到 100 分。</p>
        <div class="weight-form">
          <label>考勤<input v-model.number="weightForm.attendance" type="number" min="0" max="1" step="0.05" /></label>
          <label>牛客 Rating<input v-model.number="weightForm.nowcoderRating" type="number" min="0" max="1" step="0.05" /></label>
          <label>牛客表现<input v-model.number="weightForm.nowcoderPerformance" type="number" min="0" max="1" step="0.05" /></label>
          <label>CF Rating<input v-model.number="weightForm.codeforcesRating" type="number" min="0" max="1" step="0.05" /></label>
          <label>CF 过题量<input v-model.number="weightForm.codeforcesSolved" type="number" min="0" max="1" step="0.05" /></label>
          <label>CF 难度<input v-model.number="weightForm.codeforcesDifficulty" type="number" min="0" max="1" step="0.05" /></label>
          <label>CF 参赛表现<input v-model.number="weightForm.codeforcesContestPerformance" type="number" min="0" max="1" step="0.05" /></label>
          <label>参赛次数<input v-model.number="weightForm.participation" type="number" min="0" max="1" step="0.05" /></label>
        </div>
        <div class="weight-total" :class="{ invalid: !weightsValid }">
          <span>当前总和</span><strong>{{ weightTotal }}%</strong>
        </div>
        <button class="primary-button" :disabled="!weightsValid" @click="saveWeights">保存权重</button>
        <p v-if="weightMessage" class="form-message">{{ weightMessage }}</p>
      </article>

      <article class="panel admin-panel rule-preview">
        <p class="eyebrow">PREVIEW</p>
        <h2>评分拆分</h2>
        <div v-for="item in weightItems" :key="item.label" class="preview-row">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}%</strong>
          <i :style="{ width: `${Math.min(item.value, 100)}%` }"></i>
        </div>
        <div class="formula-grid">
          <div v-for="item in ruleFormulaItems" :key="item.label" class="formula-card">
            <p class="eyebrow">{{ item.label }} · {{ item.weight }}</p>
            <strong>{{ item.title }}</strong>
            <code>{{ item.formula }}</code>
            <p class="rule-note">{{ item.note }}</p>
          </div>
        </div>
        <div class="formula-card total-formula-card">
          <p class="eyebrow">TOTAL</p>
          <strong>总分归一化</strong>
          <code>{{ totalFormula }}</code>
          <p class="rule-note">当前权重总和为 {{ weightTotal }}%，总分会除以总权重后归一到 0~100。</p>
        </div>
      </article>
    </section>

    <section v-else-if="tab === 'manual'" class="manual-grid">
      <article class="panel admin-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">MANUAL INPUT</p>
            <h2>考勤录入</h2>
          </div>
          <button v-if="editingAttendanceId" class="text-button" @click="resetAttendanceForm">取消编辑</button>
        </div>
        <form class="admin-form" @submit.prevent="saveAttendance">
          <label>学生
            <select v-model="attendanceForm.studentId" required>
              <option v-for="student in data.students" :key="student.id" :value="student.id">
                {{ student.name }} · {{ student.studentNo }}
              </option>
            </select>
          </label>
          <label>应到次数<input v-model.number="attendanceForm.requiredCount" type="number" min="0" required /></label>
          <label>实到次数<input v-model.number="attendanceForm.presentCount" type="number" min="0" required /></label>
          <label>迟到次数<input v-model.number="attendanceForm.lateCount" type="number" min="0" required /></label>
          <label>请假次数<input v-model.number="attendanceForm.leaveCount" type="number" min="0" required /></label>
          <label>缺席次数<input v-model.number="attendanceForm.absentCount" type="number" min="0" required /></label>
          <label class="full-field">备注<input v-model.trim="attendanceForm.remark" placeholder="可选，例如请假审批已通过" /></label>
          <button class="primary-button" type="submit">{{ editingAttendanceId ? '保存考勤' : '加入考勤数据' }}</button>
        </form>
        <div class="inline-preview">
          <span>当前考勤分</span>
          <strong>{{ attendancePreviewScore }}</strong>
          <small>当前实现直接按考勤率归一化到 0~100。</small>
        </div>
        <p v-if="attendanceMessage" class="form-message">{{ attendanceMessage }}</p>
      </article>

      <article class="panel admin-panel table-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">ATTENDANCE RECORDS {{ periodAttendanceRecords.length }}</p>
            <h2>当前周期考勤</h2>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>学生</th><th>应到</th><th>实到</th><th>迟到</th><th>请假</th><th>缺席</th><th>得分</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="record in periodAttendanceRecords" :key="record.id">
                <td class="student-name">{{ studentName(record.studentId) }}</td>
                <td>{{ record.requiredCount }}</td>
                <td>{{ record.presentCount }}</td>
                <td>{{ record.lateCount }}</td>
                <td>{{ record.leaveCount }}</td>
                <td>{{ record.absentCount }}</td>
                <td class="score">{{ attendanceScore(record) }}</td>
                <td class="row-actions">
                  <button class="text-button" @click="editAttendance(record)">编辑</button>
                  <button class="text-button danger" @click="removeAttendance(record.id)">删除</button>
                </td>
              </tr>
              <tr v-if="!periodAttendanceRecords.length">
                <td colspan="8" class="empty-cell">当前周期还没有考勤记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="panel admin-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">{{ editingNowcoderId ? 'EDIT NOWCODER SCORE' : 'MANUAL NOWCODER ENTRY' }}</p>
            <h2>{{ editingNowcoderId ? '编辑牛客成绩' : '录入牛客成绩' }}</h2>
          </div>
          <button v-if="editingNowcoderId" class="text-button" @click="resetNowcoderForm">取消编辑</button>
        </div>
        <form class="admin-form" @submit.prevent="saveNowcoder">
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
          <label>牛客 Rating<input v-model.number="nowcoderForm.rating" type="number" min="0" /></label>
          <label class="full-field">备注<input v-model.trim="nowcoderForm.remark" placeholder="可选，例如人工核对来源" /></label>
          <div class="inline-preview">
            <span>单场换算分</span>
            <strong>{{ nowcoderPreviewScore }}</strong>
            <small>=(参赛人数 - 排名 + 1) / 参赛人数 × 100</small>
          </div>
          <button class="primary-button" type="submit">{{ editingNowcoderId ? '保存牛客成绩' : '加入牛客数据' }}</button>
        </form>
        <p v-if="nowcoderMessage" class="form-message">{{ nowcoderMessage }}</p>
      </article>

      <article class="panel admin-panel table-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">NOWCODER RECORDS {{ periodNowcoderRecords.length }}</p>
            <h2>当前周期牛客数据</h2>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>日期</th><th>学生</th><th>比赛</th><th>排名</th><th>人数</th><th>Rating</th><th>单场分</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="record in periodNowcoderRecords" :key="record.id">
                <td>{{ record.contestDate }}</td>
                <td class="student-name">{{ studentName(record.studentId) }}</td>
                <td>{{ record.contestName }}</td>
                <td>{{ record.rank }}</td>
                <td>{{ record.participantCount }}</td>
                <td>{{ record.rating ?? '--' }}</td>
                <td class="score">{{ contestScore(record) }}</td>
                <td class="row-actions">
                  <button class="text-button" @click="editNowcoder(record)">编辑</button>
                  <button class="text-button danger" @click="deleteNowcoder(record.id)">删除</button>
                </td>
              </tr>
              <tr v-if="!periodNowcoderRecords.length">
                <td colspan="8" class="empty-cell">当前周期还没有牛客成绩</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section v-else-if="tab === 'auto'" class="manual-grid">
      <article class="panel admin-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">LOCAL ONE-CLICK SYNC</p>
            <h2>批量同步全部学生</h2>
          </div>
        </div>
        <div class="status-grid">
          <div class="status-card"><span>活跃学生</span><strong>{{ activeStudents.length }}</strong></div>
          <div class="status-card"><span>可同步 CF</span><strong>{{ syncableCodeforcesCount }}</strong></div>
          <div class="status-card"><span>可同步牛客</span><strong>{{ syncableNowcoderCount }}</strong></div>
          <div class="status-card"><span>窗口上界</span><strong>{{ autoSyncUpperBound }}</strong></div>
        </div>
        <p class="muted">
          本地开发模式下会直接调用 `vite dev` 中间件，顺序执行 Codeforces 官方 API 和牛客脚本逻辑，并把结果写回当前浏览器草稿。
        </p>
        <button class="primary-button" :disabled="batchSyncing || !isLocalSyncAvailable" @click="syncAllStudents">
          {{ batchSyncing ? '批量同步中（可能几分钟）' : '一键同步全部学生' }}
        </button>
        <p v-if="!isLocalSyncAvailable" class="muted">该功能仅在 `npm run dev` 下可用，生产构建中不会暴露本地同步接口。</p>
        <p v-if="batchSyncMessage" class="form-message">{{ batchSyncMessage }}</p>
        <div v-if="batchSyncWarnings.length" class="status-grid">
          <div class="status-card warning-card" v-for="warning in batchSyncWarnings" :key="warning">
            <span>警告</span>
            <strong>{{ warning }}</strong>
          </div>
        </div>
      </article>

      <article class="panel admin-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">SINGLE CODEFORCES SYNC</p>
            <h2>单人 Codeforces 在线同步</h2>
          </div>
        </div>
        <div class="admin-form">
          <label>学生
            <select v-model="syncStudentId">
              <option v-for="student in data.students" :key="student.id" :value="student.id">
                {{ student.name }} · {{ student.studentNo }}
              </option>
            </select>
          </label>
          <label>Handle<input v-model.trim="syncHandle" placeholder="例如 tourist" /></label>
          <button class="primary-button" :disabled="syncing || !syncHandle" @click="syncCodeforces">
            {{ syncing ? '同步中（可能 30~90 秒）' : '同步 Codeforces' }}
          </button>
        </div>
        <div class="inline-preview">
          <span>同步说明</span>
          <strong>API</strong>
          <small>会同时保存累计结果、解题历史、比赛历史和抓取快照，供首页近 7 天 / 近 30 天与趋势图复用。</small>
        </div>
        <p v-if="syncMessage" class="form-message">{{ syncMessage }}</p>
      </article>

      <article class="panel admin-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">NOWCODER SCRIPT</p>
            <h2>牛客脚本命令生成</h2>
          </div>
        </div>
        <div class="admin-form">
          <label>学生
            <select v-model="nowcoderScriptStudentId">
              <option v-for="student in data.students" :key="student.id" :value="student.id">
                {{ student.name }} · {{ student.studentNo }}
              </option>
            </select>
          </label>
          <label>牛客用户 ID<input v-model.trim="nowcoderScriptUserId" placeholder="例如 347041329" /></label>
          <label>开始日期<input v-model="nowcoderScriptFrom" type="date" /></label>
          <label>结束日期<input v-model="nowcoderScriptTo" type="date" /></label>
          <label class="checkbox-field"><input v-model="nowcoderRatingOnly" type="checkbox" />只抓 Rating 比赛</label>
          <label class="checkbox-field"><input v-model="nowcoderDryRun" type="checkbox" />仅 dry-run 预览</label>
        </div>
        <div class="command-block">
          <code>{{ nowcoderCommand }}</code>
          <button class="secondary-button" @click="copyText(nowcoderCommand, '牛客命令已复制')">复制命令</button>
        </div>
        <p class="muted">
          这条命令默认会从该学生在当前周期最后一场已记录比赛日期开始增量抓取；同日比赛通过 `contestId` 去重合并。
        </p>
      </article>

      <article class="panel admin-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">CODEFORCES SCRIPT</p>
            <h2>Codeforces 命令生成</h2>
          </div>
        </div>
        <div class="command-block">
          <code>{{ codeforcesCommand }}</code>
          <button class="secondary-button" @click="copyText(codeforcesCommand, 'Codeforces 命令已复制')">复制命令</button>
        </div>
        <p class="muted">脚本输出现在也会保留 `contestHistory`、`solvedHistory` 和 `snapshots`，便于后续时间窗口评分。</p>
      </article>
    </section>

    <section v-else class="manual-grid">
      <article class="panel admin-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">GITHUB DATA SYNC</p>
            <h2>拉取与提交</h2>
          </div>
        </div>
        <p class="sync-brief">
          当前实现使用 GitHub Contents API 拉取六个 JSON，并在提交时使用 Git Data API 一次性创建 tree/commit/ref 更新，避免旧实现逐文件提交导致的半成功状态。
        </p>
        <div class="github-actions sync-grid">
          <input v-model.trim="githubToken" type="password" placeholder="GitHub Token（提交必填，拉取可选）" />
          <input v-model.trim="commitMessage" placeholder="提交说明，例如：更新 2026 春训第 12 周数据" />
          <button class="secondary-button" :disabled="githubBusy" @click="pullFromGithub">
            {{ githubBusy && githubAction === 'pull' ? '拉取中...' : '从 GitHub 拉取并校验' }}
          </button>
          <button class="primary-button" :disabled="githubBusy || !githubToken" @click="pushToGithub">
            {{ githubBusy && githubAction === 'push' ? '提交中...' : '提交本地草稿到 GitHub' }}
          </button>
        </div>
        <div class="sync-meta">
          <span>仓库：{{ githubConfig.owner }}/{{ githubConfig.repo }}</span>
          <span>分支：{{ githubConfig.branch }}</span>
          <span>Token：{{ maskedToken || '未填写' }}</span>
        </div>
        <p v-if="githubMessage" class="form-message">{{ githubMessage }}</p>
      </article>

      <article class="panel admin-panel">
        <p class="eyebrow">DRAFT STATUS</p>
        <h2>本地草稿概览</h2>
        <div class="status-grid">
          <div class="status-card"><span>学生</span><strong>{{ data.students.length }}</strong></div>
          <div class="status-card"><span>考勤</span><strong>{{ data.attendance.length }}</strong></div>
          <div class="status-card"><span>牛客</span><strong>{{ data.nowcoder.length }}</strong></div>
          <div class="status-card"><span>CF</span><strong>{{ data.codeforces.length }}</strong></div>
        </div>
        <p class="muted">适合每周更新一次的流程：先拉取远端，完成手动或自动录入，再统一提交。</p>
      </article>

      <article class="panel admin-panel">
        <p class="eyebrow">JSON IMPORT / EXPORT</p>
        <h2>本地文件导入导出</h2>
        <label>数据类型
          <select v-model="uploadTarget">
            <option value="students">students.json</option>
            <option value="attendance">attendance.json</option>
            <option value="nowcoder">nowcoder.json</option>
            <option value="codeforces">codeforces.json</option>
            <option value="rules">rules.json</option>
            <option value="periods">periods.json</option>
            <option value="helpPosts">helpPosts.json</option>
            <option value="helpResources">helpResources.json</option>
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
  removeAttendanceRecord,
  removeNowcoderScore,
  removeStudent,
  replaceAllData,
  replaceDataSet,
  resetMaintenanceData,
  updateRuleWeights,
  upsertAttendanceRecord,
  upsertCodeforcesRecord,
  upsertNowcoderScore,
  upsertStudent,
  useDataStore
} from '../data/store';
import { calculateAttendanceScore, calculateNowcoderContestScore } from '../domain/score';
import { validateDataSet, type DataSetKey } from '../domain/validation';
import {
  commitGithubData,
  fetchGithubData,
  githubConfig,
  maskToken
} from '../services/github';
import {
  canUseCodeforcesIncrementalSync,
  fetchCodeforcesData,
  normalizeCodeforcesApi,
  pickCodeforcesRecord
} from '../services/codeforces';
import { syncAllStudentsLocally } from '../services/localSync';
import type { AttendanceRecord, NowcoderContestScore, Student } from '../types';

const TODAY = new Date().toISOString().slice(0, 10);

const router = useRouter();
const data = useDataStore();
const tab = ref<'students' | 'weights' | 'manual' | 'auto' | 'sync'>('students');
const period = computed(() => getActivePeriod());
const rule = computed(() => getRule(period.value.ruleVersionId));
const firstStudentId = computed(() => data.students[0]?.id ?? '');

const githubToken = ref('');
const commitMessage = ref('更新 2026 春训周榜数据');
const githubBusy = ref(false);
const githubAction = ref<'pull' | 'push' | ''>('');
const githubMessage = ref('');
const maskedToken = computed(() => maskToken(githubToken.value));

const blankStudent = () => ({
  studentNo: '',
  name: '',
  className: '',
  grade: 2026,
  codeforcesHandle: '',
  nowcoderUserId: ''
});

const studentForm = reactive(blankStudent());
const editingStudentId = ref('');
const studentMessage = ref('');

const weightForm = reactive({ ...rule.value.weights });
const weightTotal = computed(() =>
  Math.round(Object.values(weightForm).reduce((sum, value) => sum + value, 0) * 100)
);
const weightsValid = computed(() => weightTotal.value > 0);
const weightMessage = ref('');
const weightItems = computed(() => [
  { label: '考勤', value: Math.round(weightForm.attendance * 100) },
  { label: '牛客 Rating', value: Math.round(weightForm.nowcoderRating * 100) },
  { label: '牛客表现', value: Math.round(weightForm.nowcoderPerformance * 100) },
  { label: 'CF Rating', value: Math.round(weightForm.codeforcesRating * 100) },
  { label: 'CF 过题量', value: Math.round(weightForm.codeforcesSolved * 100) },
  { label: 'CF 难度', value: Math.round(weightForm.codeforcesDifficulty * 100) },
  { label: 'CF 参赛表现', value: Math.round(weightForm.codeforcesContestPerformance * 100) },
  { label: '参赛次数', value: Math.round(weightForm.participation * 100) }
]);
const difficultyBandText = computed(() =>
  rule.value.codeforces.difficultyBands
    .map((item) =>
      item.max === undefined
        ? `${item.min}+ => ${item.coefficient}`
        : `${item.min}~${item.max} => ${item.coefficient}`
    )
    .join('，')
);
const ruleFormulaItems = computed(() => [
  {
    label: 'A',
    weight: `${Math.round(weightForm.attendance * 100)}%`,
    title: '考勤分',
    formula: 'A = clamp(((实到 + 迟到) / 应到) * 100, 0, 100)',
    note: `当前实现里请假和缺席不额外单独扣分；当应到为 0 时按 ${rule.value.attendance.zeroRequiredScore} 分处理。`
  },
  {
    label: 'NR',
    weight: `${Math.round(weightForm.nowcoderRating * 100)}%`,
    title: '牛客 Rating 分',
    formula: `NR = clamp(50 + (rating - ${rule.value.nowcoder.ratingBaseline}) / ${rule.value.nowcoder.ratingDivisor}, 0, 100)`,
    note: '取当前窗口内最近一场带 rating 的牛客比赛。'
  },
  {
    label: 'NQ',
    weight: `${Math.round(weightForm.nowcoderPerformance * 100)}%`,
    title: '牛客比赛表现分',
    formula:
      rule.value.nowcoder.aggregation === 'RECENT_N'
        ? `NQ = 最近 ${rule.value.nowcoder.recentN} 场 [((参赛人数 - 排名 + 1) / 参赛人数) * 100] 的平均值`
        : rule.value.nowcoder.aggregation === 'BEST'
          ? 'NQ = 牛客单场排名百分位的最高值'
          : 'NQ = 牛客全部比赛排名百分位的平均值',
    note: '单场换算分越接近 100，代表比赛排名越靠前。'
  },
  {
    label: 'CR',
    weight: `${Math.round(weightForm.codeforcesRating * 100)}%`,
    title: 'Codeforces Rating 分',
    formula: `CR = clamp(50 + (rating - ${rule.value.codeforces.ratingBaseline}) / ${rule.value.codeforces.ratingDivisor}, 0, 100)`,
    note: '取当前窗口结束时可用的 Codeforces rating。'
  },
  {
    label: 'CS',
    weight: `${Math.round(weightForm.codeforcesSolved * 100)}%`,
    title: 'Codeforces 过题量分',
    formula: `CS = min(100, 100 * ln(1 + 总过题数) / ln(1 + ${rule.value.codeforces.targetProblems}))`,
    note: `当前 ${rule.value.codeforces.targetProblems} 题达到满量程。`
  },
  {
    label: 'CD',
    weight: `${Math.round(weightForm.codeforcesDifficulty * 100)}%`,
    title: 'Codeforces 难度分',
    formula: `CD = min(100, 100 * 加权难度题量 / ${rule.value.codeforces.targetDifficultyProblems})`,
    note: `难度系数：${difficultyBandText.value}。`
  },
  {
    label: 'CP',
    weight: `${Math.round(weightForm.codeforcesContestPerformance * 100)}%`,
    title: 'Codeforces 比赛表现分',
    formula: 'CP = 当前窗口内 CF 比赛排名百分位的平均值',
    note: '排名百分位使用 standings 计算，100 代表单场最前。'
  },
  {
    label: 'P',
    weight: `${Math.round(weightForm.participation * 100)}%`,
    title: '参赛次数分',
    formula: `P = min(100, 100 * 总比赛场数 / ${rule.value.participation.targetContests})`,
    note: '总比赛场数 = 牛客比赛数 + Codeforces rated 比赛数。'
  }
]);
const totalFormula = computed(
  () =>
    `Total = (` +
    `A*${weightForm.attendance.toFixed(2)} + ` +
    `NR*${weightForm.nowcoderRating.toFixed(2)} + ` +
    `NQ*${weightForm.nowcoderPerformance.toFixed(2)} + ` +
    `CR*${weightForm.codeforcesRating.toFixed(2)} + ` +
    `CS*${weightForm.codeforcesSolved.toFixed(2)} + ` +
    `CD*${weightForm.codeforcesDifficulty.toFixed(2)} + ` +
    `CP*${weightForm.codeforcesContestPerformance.toFixed(2)} + ` +
    `P*${weightForm.participation.toFixed(2)}` +
    `) / ${(Object.values(weightForm).reduce((sum, value) => sum + value, 0)).toFixed(2)}`
);

const attendanceForm = reactive({
  studentId: firstStudentId.value,
  requiredCount: 12,
  presentCount: 12,
  lateCount: 0,
  leaveCount: 0,
  absentCount: 0,
  remark: ''
});
const editingAttendanceId = ref('');
const attendanceMessage = ref('');
const periodAttendanceRecords = computed(() =>
  [...data.attendance]
    .filter((record) => record.periodId === period.value.id)
    .sort((a, b) => a.studentId.localeCompare(b.studentId))
);
const attendancePreviewScore = computed(() => {
  const result = calculateAttendanceScore(
    {
      id: 'preview',
      periodId: period.value.id,
      studentId: attendanceForm.studentId,
      requiredCount: attendanceForm.requiredCount,
      presentCount: attendanceForm.presentCount,
      lateCount: attendanceForm.lateCount,
      leaveCount: attendanceForm.leaveCount,
      absentCount: attendanceForm.absentCount,
      updatedAt: new Date().toISOString()
    },
    rule.value.attendance
  );
  return result ? result.score.toFixed(2) : '--';
});

const nowcoderForm = reactive({
  studentId: firstStudentId.value,
  contestName: '',
  contestDate: TODAY,
  participantCount: 0,
  rank: 0,
  solvedCount: 0,
  rating: 0,
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
    rating: nowcoderForm.rating > 0 ? nowcoderForm.rating : undefined,
    source: 'MANUAL',
    isManualOverride: true,
    updatedAt: new Date().toISOString()
  }).toFixed(2);
});

const syncStudentId = ref(firstStudentId.value);
const syncHandle = ref(data.students[0]?.codeforcesHandle ?? '');
const syncing = ref(false);
const syncMessage = ref('');
const batchSyncing = ref(false);
const batchSyncMessage = ref('');
const batchSyncWarnings = ref<string[]>([]);
const isLocalSyncAvailable = import.meta.env.DEV;

const activeStudents = computed(() => data.students.filter((student) => student.status === 'ACTIVE'));
const syncableCodeforcesCount = computed(
  () => activeStudents.value.filter((student) => student.codeforcesHandle).length
);
const syncableNowcoderCount = computed(
  () => activeStudents.value.filter((student) => student.nowcoderUserId).length
);
const autoSyncUpperBound = computed(() => (TODAY < period.value.endDate ? TODAY : period.value.endDate));

const nowcoderScriptStudentId = ref(firstStudentId.value);
const nowcoderScriptUserId = ref(data.students[0]?.nowcoderUserId ?? '');
const nowcoderScriptFrom = ref(period.value.startDate);
const nowcoderScriptTo = ref(period.value.endDate);
const nowcoderRatingOnly = ref(false);
const nowcoderDryRun = ref(false);

const uploadTarget = ref<DataSetKey>('students');
const dataMessage = ref('');
const projectPrefix = `npm --prefix "${__PROJECT_ROOT__}"`;

watch(
  () => rule.value.weights,
  (weights) => Object.assign(weightForm, weights),
  { deep: true }
);

watch(
  () => data.students.map((student) => student.id).join(','),
  () => {
    const nextId = firstStudentId.value;
    if (!data.students.some((student) => student.id === attendanceForm.studentId)) {
      attendanceForm.studentId = nextId;
    }
    if (!data.students.some((student) => student.id === nowcoderForm.studentId)) {
      nowcoderForm.studentId = nextId;
    }
    if (!data.students.some((student) => student.id === syncStudentId.value)) {
      syncStudentId.value = nextId;
    }
    if (!data.students.some((student) => student.id === nowcoderScriptStudentId.value)) {
      nowcoderScriptStudentId.value = nextId;
    }
  }
);

watch(syncStudentId, (studentId) => {
  const student = data.students.find((item) => item.id === studentId);
  syncHandle.value = student?.codeforcesHandle ?? '';
});

watch(nowcoderScriptStudentId, (studentId) => {
  const student = data.students.find((item) => item.id === studentId);
  nowcoderScriptUserId.value = student?.nowcoderUserId ?? '';
});

const nowcoderCommand = computed(() => {
  const studentId = nowcoderScriptStudentId.value || '<studentId>';
  const userId = nowcoderScriptUserId.value || '<nowcoderId>';
  const flags = [
    `${projectPrefix} run sync:nowcoder -- --nowcoderId ${userId}`,
    `--studentId ${studentId}`,
    `--periodId ${period.value.id}`,
    `--from ${nowcoderScriptFrom.value}`,
    `--to ${nowcoderScriptTo.value}`
  ];
  if (nowcoderRatingOnly.value) flags.push('--rating-only');
  if (nowcoderDryRun.value) flags.push('--dry-run');
  return flags.join(' ');
});

const codeforcesCommand = computed(() => {
  const student = data.students.find((item) => item.id === syncStudentId.value);
  const handle = syncHandle.value || student?.codeforcesHandle || '<handle>';
  const studentId = syncStudentId.value || '<studentId>';
  return `${projectPrefix} run sync:codeforces -- --studentId ${studentId} --handle ${handle} --periodId ${period.value.id}`;
});

function studentName(studentId: string) {
  return data.students.find((student) => student.id === studentId)?.name ?? '未知学生';
}

function attendanceScore(record: AttendanceRecord) {
  return calculateAttendanceScore(record, rule.value.attendance)?.score.toFixed(2) ?? '--';
}

function contestScore(record: NowcoderContestScore) {
  return calculateNowcoderContestScore(record).toFixed(2);
}

function maxDate(left: string, right: string) {
  return left >= right ? left : right;
}

function resetStudentForm() {
  Object.assign(studentForm, blankStudent());
  editingStudentId.value = '';
  studentMessage.value = '';
}

function editStudent(student: Student) {
  Object.assign(studentForm, {
    studentNo: student.studentNo,
    name: student.name,
    className: student.className,
    grade: student.grade,
    codeforcesHandle: student.codeforcesHandle ?? '',
    nowcoderUserId: student.nowcoderUserId ?? ''
  });
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
    nowcoderUserId: studentForm.nowcoderUserId || undefined,
    status: 'ACTIVE'
  };
  if (data.students.some((item) => item.studentNo === student.studentNo && item.id !== student.id)) {
    studentMessage.value = '学号已存在，请检查后再保存。';
    return;
  }
  upsertStudent(student);
  studentMessage.value = `已保存 ${student.name}。`;
  if (!editingStudentId.value) resetStudentForm();
}

function deleteStudent(student: Student) {
  if (
    !window.confirm(`确认删除 ${student.name} 吗？这会同时删除该学生的考勤、牛客和 Codeforces 记录。`)
  ) {
    return;
  }
  removeStudent(student.id);
  if (editingStudentId.value === student.id) resetStudentForm();
  studentMessage.value = `已删除 ${student.name}。`;
}

function saveWeights() {
  updateRuleWeights({ ...weightForm });
  weightMessage.value = '权重已保存到本地草稿。';
}

function resetAttendanceForm() {
  Object.assign(attendanceForm, {
    studentId: firstStudentId.value,
    requiredCount: 12,
    presentCount: 12,
    lateCount: 0,
    leaveCount: 0,
    absentCount: 0,
    remark: ''
  });
  editingAttendanceId.value = '';
  attendanceMessage.value = '';
}

function editAttendance(record: AttendanceRecord) {
  Object.assign(attendanceForm, {
    studentId: record.studentId,
    requiredCount: record.requiredCount,
    presentCount: record.presentCount,
    lateCount: record.lateCount,
    leaveCount: record.leaveCount,
    absentCount: record.absentCount,
    remark: record.remark ?? ''
  });
  editingAttendanceId.value = record.id;
  attendanceMessage.value = '';
}

function saveAttendance() {
  if (attendanceForm.presentCount + attendanceForm.lateCount > attendanceForm.requiredCount) {
    attendanceMessage.value = '实到 + 迟到不能大于应到次数。';
    return;
  }
  const record: AttendanceRecord = {
    id: editingAttendanceId.value || `att-${Date.now()}`,
    periodId: period.value.id,
    studentId: attendanceForm.studentId,
    requiredCount: attendanceForm.requiredCount,
    presentCount: attendanceForm.presentCount,
    lateCount: attendanceForm.lateCount,
    leaveCount: attendanceForm.leaveCount,
    absentCount: attendanceForm.absentCount,
    remark: attendanceForm.remark || undefined,
    updatedAt: new Date().toISOString()
  };
  upsertAttendanceRecord(record);
  attendanceMessage.value = `已保存 ${studentName(record.studentId)} 的考勤记录。`;
  resetAttendanceForm();
}

function removeAttendance(id: string) {
  if (!window.confirm('确认删除这条考勤记录吗？')) return;
  removeAttendanceRecord(id);
  attendanceMessage.value = '考勤记录已删除。';
}

function resetNowcoderForm() {
  Object.assign(nowcoderForm, {
    studentId: firstStudentId.value,
    contestName: '',
    contestDate: TODAY,
    participantCount: 0,
    rank: 0,
    solvedCount: 0,
    rating: 0,
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
    rating: record.rating ?? 0,
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
    contestId:
      current?.contestId || `nc-${nowcoderForm.contestDate}-${nowcoderForm.contestName}`,
    contestName: nowcoderForm.contestName,
    contestDate: nowcoderForm.contestDate,
    participantCount: nowcoderForm.participantCount,
    rank: nowcoderForm.rank,
    solvedCount: nowcoderForm.solvedCount,
    rating: nowcoderForm.rating > 0 ? nowcoderForm.rating : undefined,
    source: 'MANUAL',
    isManualOverride: true,
    remark: nowcoderForm.remark || undefined,
    updatedAt: new Date().toISOString()
  };

  try {
    upsertNowcoderScore(record);
    nowcoderMessage.value = `已保存 ${studentName(record.studentId)} 的 ${record.contestName}。`;
    resetNowcoderForm();
  } catch (error) {
    nowcoderMessage.value = error instanceof Error ? error.message : '牛客成绩保存失败。';
  }
}

function deleteNowcoder(id: string) {
  if (!window.confirm('确认删除这条牛客成绩吗？')) return;
  removeNowcoderScore(id);
  nowcoderMessage.value = '牛客成绩已删除。';
}

async function syncCodeforces() {
  const student = data.students.find((item) => item.id === syncStudentId.value);
  if (!student || !syncHandle.value) return;

  syncing.value = true;
  syncMessage.value = '';
  try {
    const previousRecord = pickCodeforcesRecord(
      data.codeforces,
      period.value.id,
      student.id,
      syncHandle.value
    );
    const useIncremental = canUseCodeforcesIncrementalSync(previousRecord, syncHandle.value);
    const result = await fetchCodeforcesData(syncHandle.value, {
      submissionSinceTime: useIncremental ? previousRecord?.fetchedAt : undefined,
      percentileFromDate: useIncremental
        ? maxDate(
            previousRecord?.fetchedAt?.slice(0, 10) ?? period.value.startDate,
            period.value.startDate
          )
        : period.value.startDate,
      percentileToDate: autoSyncUpperBound.value,
      cachedContestHistory: useIncremental ? previousRecord?.contestHistory : undefined
    });
    const fetchedAt = new Date().toISOString();
    const normalized = normalizeCodeforcesApi(
      period.value.id,
      student.id,
      result.user,
      result.submissions,
      result.ratingHistory,
      result.contestPercentiles,
      previousRecord,
      fetchedAt
    );
    upsertCodeforcesRecord({
      ...normalized,
      id: previousRecord?.id ?? `cf-${student.id}`
    });
    const incrementalSince = previousRecord?.fetchedAt ?? '';
    syncMessage.value = useIncremental
      ? `已增量同步 ${result.user.handle}：基于 ${incrementalSince} 之后的新数据更新，当前累计 ${normalized.totalSolved} 道题、${normalized.contestCount} 场比赛。`
      : `已首次同步 ${result.user.handle}：累计 ${normalized.totalSolved} 道题、${normalized.contestCount} 场比赛，已保存历史与快照。`;
  } catch (error) {
    syncMessage.value = error instanceof Error ? error.message : 'Codeforces 同步失败。';
  } finally {
    syncing.value = false;
  }
}

async function syncAllStudents() {
  if (!isLocalSyncAvailable) {
    batchSyncMessage.value = '请使用 `npm run dev` 启动本地开发环境后再执行一键同步。';
    return;
  }

  batchSyncing.value = true;
  batchSyncMessage.value = '';
  batchSyncWarnings.value = [];
  try {
    const snapshot = getDataSnapshot();
    const result = await syncAllStudentsLocally({
      period: period.value,
      students: snapshot.students,
      nowcoder: snapshot.nowcoder,
      codeforces: snapshot.codeforces
    });
    replaceAllData({
      ...snapshot,
      nowcoder: result.nowcoder,
      codeforces: result.codeforces
    });
    batchSyncWarnings.value = result.summary.warnings;
    batchSyncMessage.value =
      `已完成批量同步：CF ${result.summary.codeforcesSynced} 人，牛客 ${result.summary.nowcoderSynced} 人，` +
      `新增牛客 ${result.summary.nowcoderAdded} 条，更新 ${result.summary.nowcoderUpdated} 条。`;
  } catch (error) {
    batchSyncMessage.value = error instanceof Error ? error.message : '批量同步失败。';
  } finally {
    batchSyncing.value = false;
  }
}

async function pullFromGithub() {
  githubBusy.value = true;
  githubAction.value = 'pull';
  githubMessage.value = '';
  try {
    const remote = await fetchGithubData(githubToken.value);
    replaceAllData(remote);
    githubMessage.value = `已拉取并校验远端数据：${remote.students.length} 名学生，${remote.nowcoder.length} 条牛客记录，${remote.codeforces.length} 条 CF 记录。`;
  } catch (error) {
    githubMessage.value = error instanceof Error ? error.message : 'GitHub 拉取失败。';
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
    githubMessage.value = `已原子提交 ${results.length} 个数据文件到 GitHub。`;
  } catch (error) {
    githubMessage.value = error instanceof Error ? error.message : 'GitHub 提交失败。';
  } finally {
    githubBusy.value = false;
    githubAction.value = '';
  }
}

async function importJson(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const value = JSON.parse(await file.text());
    const errors = validateDataSet(uploadTarget.value, value, data);
    if (errors.length) throw new Error(errors[0]);
    replaceDataSet(uploadTarget.value, value);
    dataMessage.value = `已导入 ${file.name}。`;
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
  resetAttendanceForm();
  resetNowcoderForm();
  resetStudentForm();
  Object.assign(weightForm, rule.value.weights);
  dataMessage.value = '已恢复仓库初始数据。';
}

async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    dataMessage.value = successMessage;
  } catch {
    dataMessage.value = '复制失败，请手动复制。';
  }
}

async function lock() {
  lockAdmin();
  await router.replace('/admin-access');
}
</script>
