# ACM Grade 2

面向新生公开展示的 ACM 综合能力榜。项目刻意保持轻量：数据直接放在 GitHub 仓库，Vue 前端读取静态 JSON，评分由 TypeScript 纯函数实时计算。

## 定位

- 用排行榜和分数差距制造训练目标。
- 同时给出“下一目标”，帮助新生知道应该先补哪一项。
- 不使用数据库和复杂后端，数据变更可以直接通过 Git 提交、审查和回滚。
- 派生分数不写死，修改规则或补数据后自动重新计算。

## 当前范围

- 出勤评分
- 牛客比赛成绩手工录入数据
- Codeforces 官方 API 数据模型和转换器
- 综合评分、等级、竞赛排名
- 公开奖牌式仪表盘和 `/admin` 管理台
- 学生新增/编辑、权重修改、JSON 导入导出
- 数据校验和评分单元测试

暂不在基础版本加入数据库、登录和复杂后台。`/admin` 是本机维护工具：修改会保存到浏览器 `localStorage`，导出的 JSON 经过检查后再提交到 GitHub。它不是公开网站上的安全认证系统，也不能直接写入远端仓库。

## 数据目录

```text
src/
  data/
    students.json       新生基础信息
    periods.json        考核周期
    rules.json          权重和评分规则
    attendance.json     出勤记录
    nowcoder.json       牛客比赛成绩
    codeforces.json     Codeforces 快照
  domain/
    score.ts            三项评分和等级计算
    ranking.ts          排名和并列名次
    scoreboard.ts       组合静态数据生成榜单
  services/
    codeforces.ts       Codeforces API 返回值转换
```

## 评分规则

默认权重：

```text
出勤       20%
牛客竞赛   40%
Codeforces 40%
```

Codeforces 数据由官方 API 获取后转换为仓库内快照。浏览器端直接请求 API 适合开发和低频手动同步；正式部署时建议用 GitHub Actions 定时执行同步脚本，再提交快照，避免公开页面受跨域、限流和 API 波动影响。

管理员也可以在 `/admin` 的“数据维护”页直接同步一个用户。同步结果先进入浏览器本地数据，点击导出 `codeforces.json` 后覆盖仓库文件，再执行 Git 提交。前端不会保存 GitHub Token。

本地直接写入 `src/data/codeforces.json`：

```bash
npm run sync:codeforces -- --studentId stu-001 --handle tourist --periodId period-2026-spring
```

脚本依次调用 `user.info`、`user.status` 和 `user.rating`，每次请求之间等待约 2.1 秒，统计去重后的 Accepted 题目、难度分布、当前 Rating、最高 Rating 和比赛场数。Codeforces API 失败或 Handle 不存在时不会写入文件。

牛客当前使用管理员手工录入。后续爬虫应输出与 `nowcoder.json` 相同结构的草稿文件，由管理员检查后合并。

## 本地运行

```bash
npm install
npm run validate:data
npm run test
npm run build
npm run dev
```

打开管理台：`http://localhost:5173/admin`

管理入口：先访问 `http://localhost:5173/admin-access`，默认密码为 `acm2026`。部署前建议复制 `.env.example` 为 `.env` 并修改 `VITE_ADMIN_PASSWORD`。

注意：纯静态前端无法隐藏管理密码，密码门禁只适合低风险的小范围维护，不等同于真正的身份认证。公开部署时不要把高权限凭据写进前端。

## Docker 部署

```bash
docker compose up --build
```

浏览器访问 `http://localhost:8080/`

## GitHub Pages 部署

仓库已包含 `.github/workflows/deploy-pages.yml`。推送到 `main` 后会自动执行数据校验、测试、构建并部署到 GitHub Pages。

第一次使用时，在 GitHub 仓库进入 `Settings` → `Pages`，将 `Source` 设置为 `GitHub Actions`。部署完成后，页面地址可在 workflow 的 deployment environment 中查看。

## GitHub 数据维护约定

1. 先修改 `src/data/*.json`，不要直接修改评分公式。
2. 修改权重时保证总和等于 `1`。
3. 牛客数据重复记录默认拒绝，使用唯一的 `id`。
4. Codeforces 快照保留 `source`、`fetchedAt` 和 `isManualOverride`。
5. 每次数据变更都运行 `npm run validate:data && npm run test && npm run build`。

## 管理台同步 GitHub

管理台顶部填写 GitHub fine-grained personal access token，至少授予仓库 `Contents: Read and write` 权限。Token 不会写入 `localStorage`、JSON 或 GitHub，只在当前页面内存中使用。

- `从 GitHub 获取数据`：读取 `main` 分支 `src/data/*.json`，覆盖当前浏览器草稿。
- `提交更改到 GitHub`：依次更新六个数据文件，GitHub 会为每个文件生成内容提交。
- 学生、权重、Codeforces 同步和 JSON 导入都只先修改本地草稿，点击提交后才会同步远端。
- 牛客数据可在管理台“数据维护”中直接录入、编辑和删除；单场成绩按排名即时预览换算分。

## 牛客用户页面抓取

牛客用户比赛页的地址格式为 `https://ac.nowcoder.com/acm/contest/profile/{id}`。页面的比赛列表由页面脚本请求接口加载，脚本使用该接口抓取参加过的比赛，并转换为当前项目的 `nowcoder.json` 格式。

```bash
npm run sync:nowcoder -- --nowcoderId 347041329 --studentId stu-001 --periodId period-2026-spring
```

常用选项：

```bash
# 只抓 Rating 比赛
npm run sync:nowcoder -- --nowcoderId 347041329 --studentId stu-001 --rating-only

# 只预览，不写入文件；限制抓取前 1 页，适合测试账号和接口
npm run sync:nowcoder -- --nowcoderId 347041329 --studentId stu-001 --max-pages 1 --dry-run

# 按日期过滤
npm run sync:nowcoder -- --nowcoderId 347041329 --studentId stu-001 --from 2026-01-01 --to 2026-08-30
```

脚本会分页请求并在请求之间等待，默认每页 100 条。已有人工数据不会被覆盖：`MANUAL`/手工覆盖优先于 `IMPORT`，`IMPORT` 优先于脚本抓取。抓取结果的 `source` 为 `SCRIPT`，管理员检查 diff 后再提交 GitHub。

如果提交过程中途网络失败，可能已经有部分文件提交成功；重新从 GitHub 获取数据后再继续操作。

## 管理台工作流

1. 学生录入页新增或编辑基础信息，保存后仅写入当前浏览器。
2. 评分权重页修改三项权重，必须保证总和为 `100%`。
3. 数据维护页同步 Codeforces，或选择 JSON 文件导入牛客/出勤/学生数据。
4. 导出对应 JSON 文件，人工检查 diff 后覆盖 `src/data/` 同名文件。
5. 运行校验、测试和构建，再提交 GitHub。

## 页面接入方式

后续页面不需要重新实现评分逻辑：

```ts
import { loadScoreboard } from './domain/scoreboard';

const rows = loadScoreboard();
```

单个学生详情：

```ts
import { getStudentScore } from './domain/scoreboard';

const row = getStudentScore('stu-001');
```
