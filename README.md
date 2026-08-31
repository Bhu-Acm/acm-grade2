# ACM Grade 2

面向 ACM 新生训练的公开排行榜与维护工具。数据保存在仓库 `src/data/*.json`，前端负责展示和维护，评分由 TypeScript 实时计算。

## 当前功能

- 首页支持 `近 7 天 / 近 30 天 / 全部` 三个榜单窗口。
- 点击学生后可查看总分拆解、趋势图、牛客与 Codeforces 原始指标。
- 管理台支持学生维护、规则维护、考勤/牛客手动录入、Codeforces 在线同步、本地一键同步、GitHub 数据同步、JSON 导入导出。
- Codeforces 记录已支持 `solvedHistory`、`contestHistory`、`snapshots`，可用于窗口评分和趋势展示。

## 评分规则

当前启用规则见 `src/data/rules.json`，当前周期见 `src/data/periods.json`。

```text
A  = 考勤分
NR = 牛客 Rating 分
NQ = 牛客比赛表现分
CR = CF Rating 分
CS = CF 过题量分
CD = CF 难度分
CP = CF 比赛表现分
P  = 参赛次数分
```

当前实现：

```text
A  = clamp(((实到 + 迟到) / 应到) * 100, 0, 100)
NR = clamp(50 + (牛客 rating - 1000) / 20, 0, 100)
NQ = 当前规则聚合范围内的牛客单场排名百分位平均值
CR = clamp(50 + (CF rating - 1000) / 15, 0, 100)
CS = min(100, 100 * ln(1 + 总过题数) / ln(1 + 120))
CD = min(100, 100 * 加权难度题量 / 60)
CP = 当前窗口内 CF 比赛排名百分位平均值
P  = min(100, 100 * 总比赛场数 / 20)
```

总分按权重归一化到 `0~100`：

```text
Total = 0.15A + 0.10NR + 0.10NQ + 0.25CR + 0.15CS + 0.15CD + 0.15CP + 0.05P
```

说明：

- 权重原始总和为 `1.10`，代码中会自动归一化。
- 考勤当前仍是周期聚合记录，不按 7 天 / 30 天切分。
- CF 难度统计会包含 `UNRATED` 桶，保证分桶数量与总过题数一致。

## 项目结构

```text
src/data/                 JSON 数据源
src/domain/               评分、排名、窗口计算、校验
src/pages/HomeView.vue    公开排行榜
src/pages/AdminView.vue   管理台
src/services/codeforces.ts Codeforces 浏览器端同步逻辑
src/services/github.ts    GitHub 拉取与提交
src/services/localSync.ts 本地 dev-only 一键同步接口
scripts/lib/              命令行与 dev middleware 共享同步逻辑
scripts/sync-codeforces.mjs Codeforces 命令行同步
scripts/sync-nowcoder.mjs 牛客命令行同步
scripts/validate-data.mjs JSON 校验
tests/score.spec.ts       评分与窗口逻辑测试
```

## 核心数据文件

GitHub 同步与本地导入导出当前围绕以下 JSON 文件展开：

```text
src/data/students.json
src/data/attendance.json
src/data/nowcoder.json
src/data/codeforces.json
src/data/rules.json
src/data/periods.json
```

其中：

- `students.json` 保存学生基础信息、Codeforces handle、牛客用户 ID。
- `attendance.json` 保存周期聚合后的考勤记录。
- `nowcoder.json` 保存牛客 rating 与比赛数据。
- `codeforces.json` 保存 CF rating、聚合统计，以及窗口计算所需的历史明细。
- `rules.json` 保存评分权重和当前方案。
- `periods.json` 保存启用周期与时间范围。

## 管理台

地址：

```text
/admin-access
/admin
```

当前模块：

- `学生`：新增、编辑、删除学生。字段只保留 `codeforcesHandle` 与 `nowcoderUserId`。
- `规则`：维护权重，并展示每项评分公式与总分归一化公式。
- `手动录入`：维护考勤与牛客比赛记录。
- `自动录入`：单人 Codeforces 在线同步、本地一键同步全部学生、牛客/CF 命令生成。
- `GitHub 同步`：远端拉取校验、本地草稿提交、JSON 导入导出。

说明：

- 本地一键同步仅在 `npm run dev` 下可用，通过 `vite` 开发中间件调用本地 Node 同步逻辑。
- 浏览器端不能直接执行本地 Node 脚本，所以管理台仍保留可复制的命令行命令。
- Codeforces 首次同步历史很多的账号时仍可能较慢；后续同步会基于已有历史和 `fetchedAt` 走增量。

## 自动同步

### Codeforces

- 首次同步：抓取用户信息、提交记录、rating 历史，并按需要补 `contest.standings` 百分位。
- 后续同步：仅处理上次 `fetchedAt` 之后的新提交和新比赛，复用已有历史。
- 如果旧记录没有 `solvedHistory` / `contestHistory`，会自动退回全量同步一次。
- 无 rating 的已过题会归入 `UNRATED`，避免“各难度总和小于总过题数”。

命令：

```bash
npm run sync:codeforces -- --studentId stu-001 --handle tourist --periodId period-2026-spring
```

### 牛客

- 支持按学生和周期做增量抓取。
- 默认从该学生在当前周期最后一场已记录 `contestDate` 开始继续抓取。
- 同日比赛通过 `contestId` 去重合并。

命令：

```bash
npm run sync:nowcoder -- --nowcoderId 347041329 --studentId stu-001 --periodId period-2026-spring
```

常用参数：

```bash
--rating-only
--dry-run
--from 2026-03-01
--to 2026-06-30
```

## GitHub 同步

当前实现：

- 拉取：GitHub `Contents API`
- 校验：本地 `validateAppData`
- 提交：GitHub `Git Data API` 的 `blob -> tree -> commit -> ref`

结果：

- 拉取时会先验证远端数据结构。
- 提交时 6 个 JSON 作为一次提交原子更新，避免旧版逐文件提交的半成功状态。

## 本地运行

```bash
npm install
npm run validate:data
npm test
npm run build
npm run dev
```

## 部署

- 构建产物目录：`dist/`
- 当前构建配置使用 `base: './'`，适合静态目录挂载。
- 计划挂载地址：`mms0420.cn:789`

建议部署流程：

```bash
npm run build
```

然后将 `dist/` 挂载到静态服务目录即可。

面向 `mms0420.cn:789` 的当前约定：

- 仓库内不提交 `dist/`。
- 每次发版前先在本机执行 `npm run build`。
- 将新生成的 `dist/` 挂载或同步到服务器静态目录。
- 当前 `vite.config.ts` 使用 `base: './'`，适合目录挂载而不是反向代理子路径改写。

## 提交前检查

```bash
npm run validate:data
npm test
npm run build
```

## 当前本地验证

截至 `2026-08-31`，本地已通过：

```text
npm run validate:data
npm test
npm run build
```

## 排障提示

- 第二次 CF 同步仍然很慢时，先检查该学生旧记录是否已经带有 `solvedHistory`、`contestHistory`、`fetchedAt`；缺任一字段都会触发一次全量补齐。
- 如果首页 CF 各难度总数与总过题数不一致，先确认是否存在 `UNRATED` 桶；旧聚合数据会在窗口计算阶段自动补齐差值。
- 本地一键同步接口只在开发环境存在；生产环境看不到 `/__local-sync/*` 是预期行为。
