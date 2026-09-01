import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'src', 'data');
const files = [
  'students.json',
  'periods.json',
  'rules.json',
  'attendance.json',
  'nowcoder.json',
  'codeforces.json',
  'helpPosts.json',
  'helpResources.json'
];

for (const file of files) {
  const filePath = path.join(dataDir, file);
  const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(value)) throw new Error(`${file} 必须是数组`);
}

const read = (file) => JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
const students = read('students.json');
const periods = read('periods.json');
const rules = read('rules.json');
const attendance = read('attendance.json');
const nowcoder = read('nowcoder.json');
const codeforces = read('codeforces.json');
const helpPosts = read('helpPosts.json');
const helpResources = read('helpResources.json');

const studentIds = new Set(students.map((item) => item.id));
const periodIds = new Set(periods.map((item) => item.id));
const ruleIds = new Set(rules.map((item) => item.id));

if (students.some((item) => !item.id || !item.studentNo || !item.name)) {
  throw new Error('students.json 存在缺少 id、studentNo 或 name 的记录');
}
if (periods.some((item) => !periodIds.has(item.id) || !ruleIds.has(item.ruleVersionId))) {
  throw new Error('periods.json 存在无效 ruleVersionId');
}
if (attendance.some((item) => !studentIds.has(item.studentId) || !periodIds.has(item.periodId))) {
  throw new Error('attendance.json 存在无效 studentId 或 periodId');
}
if (nowcoder.some((item) => !studentIds.has(item.studentId) || !periodIds.has(item.periodId))) {
  throw new Error('nowcoder.json 存在无效 studentId 或 periodId');
}
if (codeforces.some((item) => !studentIds.has(item.studentId) || !periodIds.has(item.periodId))) {
  throw new Error('codeforces.json 存在无效 studentId 或 periodId');
}
if (helpPosts.some((item) => !item.id || !item.round || !item.category || !item.question || !item.answer)) {
  throw new Error('helpPosts.json 存在缺少 id、轮次、分类、问题或答案的记录');
}
if (helpResources.some((item) => !item.id || !item.title || !item.description || !item.path)) {
  throw new Error('helpResources.json 存在缺少 id、标题、说明或路径的记录');
}

for (const rule of rules) {
  const weightSum = Object.values(rule.weights).reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(weightSum) || weightSum <= 0) {
    throw new Error(`${rule.id} 权重总和必须大于 0`);
  }
}

console.log(`data ok: ${students.length} students, ${periods.length} periods, ${rules.length} rules`);
