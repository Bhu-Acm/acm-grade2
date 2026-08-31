# ACM Grade 2 交接文档

更新时间：2026-08-31

## 当前状态

- 本地目录：`D:\acm lab\acm-grade\acm-grade2`
- 当前分支：`main`
- 当前站点为纯静态前端，构建产物输出到 `dist/`
- 计划部署地址：`mms0420.cn:789`
- 最近一次本地验证已通过：
  - `npm run validate:data`
  - `npm test`
  - `npm run build`

## 交接重点

- 这是一个前端静态站点，业务数据直接落在仓库 `src/data/*.json`。
- 页面展示、评分计算、数据校验都在前端和本地脚本内完成，没有独立后端服务。
- 管理台里的“本地一键同步”依赖 `vite dev server` 中间件，只适用于开发环境。
- 生产部署只需要新的 `dist/`，计划挂载地址仍是 `mms0420.cn:789`。

## 已完成事项

### 1. 评分与榜单

- 评分规则已统一切到方案 4，并在代码、规则数据、测试中同步。
- 首页已支持：
  - `近 7 天`
  - `近 30 天`
  - `全部`
  - 趋势图
  - 点击学生后查看分数拆解
  - 点击学生后查看牛客 / Codeforces 原始指标
- 首页学生详情已展示：
  - 牛客 Rating
  - 牛客总解题数
  - 牛客比赛数
  - 牛客平均单场分
  - CF Rating
  - CF Max Rating
  - CF 总过题数
  - CF 比赛数
  - CF 各难度过题数

### 2. 管理台

- 学生模块已去掉 `nowcoderHandle`，仅保留：
  - `codeforcesHandle`
  - `nowcoderUserId`
- 规则模块已补充各项评分公式展示，包括：
  - 考勤
  - 牛客 Rating
  - 牛客比赛表现
  - CF Rating
  - CF 过题量
  - CF 难度
  - CF 比赛表现
  - 参赛次数
  - 总分归一化公式
- 自动录入模块已支持：
  - 单人 Codeforces 在线同步
  - 本地一键同步全部学生
  - 牛客命令生成
  - Codeforces 命令生成
- 命令生成已统一改成：

```bash
npm --prefix "D:\acm lab\acm-grade\acm-grade2" run ...
```

### 3. Codeforces 同步

- 已给 `CodeforcesRecord` 增加：
  - `solvedHistory`
  - `contestHistory`
  - `snapshots`
- 首次同步会拉完整历史。
- 后续同步会基于已有记录和 `fetchedAt` 做增量：
  - 提交记录只处理上次同步之后的新提交
  - 比赛百分位只补当前窗口内还没有缓存的比赛
- 如果旧记录缺少 `solvedHistory` 或 `contestHistory`，会自动退回一次全量同步。

### 4. 牛客同步

- 已支持按学生、周期做增量抓取。
- 默认从该学生当前周期最后一场已记录 `contestDate` 开始继续抓取。
- 同日比赛按 `contestId` 去重合并。

### 5. GitHub 数据同步

- 浏览器内数据同步已重写为：
  - 拉取：GitHub `Contents API`
  - 提交：GitHub `Git Data API`
- 6 个 JSON 会作为一次提交原子更新，避免逐文件提交的半成功状态。

当前这 6 个 JSON 为：

- `src/data/students.json`
- `src/data/attendance.json`
- `src/data/nowcoder.json`
- `src/data/codeforces.json`
- `src/data/rules.json`
- `src/data/periods.json`

## 本轮重点修复

### 1. Codeforces 增量同步误判

之前出现过一个实际问题：

- 旧 `codeforces.json` 里只有聚合结果，没有 `solvedHistory` / `contestHistory`
- 但同步逻辑仍把这类记录当成“可增量”
- 结果会导致第二次同步时只看增量区间，累计总题数错误，甚至出现 `0` 题

已修正为：

- 只有当旧记录满足以下条件才允许增量：
  - `handle` 匹配
  - 存在 `solvedHistory`
  - 存在 `contestHistory`
  - 存在有效 `fetchedAt`
- 否则强制退回全量同步一次

### 2. CF 难度题数统计错误

之前的实际 bug：

- `difficultyStats` 只统计了“有 Codeforces rating 的题”
- 对于无 rating 的唯一 AC 题，之前直接被漏掉
- 所以“各难度题数之和”可能小于“CF 总过题数”

已修正为：

- 新同步逻辑会把无 rating 的题归入 `UNRATED`
- 首页详情会展示 `UNRATED`
- 对于旧聚合数据，如果 `totalSolved > sum(difficultyStats)`，会在窗口计算阶段自动补一个 `UNRATED` 差值，保证展示数量与总题数一致

### 3. 同一学生多条 CF 记录取错

之前排行榜内部只按 `studentId` 取第一条 CF 记录，存在风险：

- 如果同一学生同一周期残留多条记录
- 或学生换过 handle
- 首页可能直接拿错旧记录

已修正为：

- 优先选 `handle` 匹配且 `fetchedAt` 最新的记录
- 保存 CF 记录时会替换同学生同周期的旧记录，避免重复残留

## 当前关键文件

### 评分与榜单

- [src/domain/score.ts](/D:/acm%20lab/acm-grade/acm-grade2/src/domain/score.ts)
- [src/domain/ranking.ts](/D:/acm%20lab/acm-grade/acm-grade2/src/domain/ranking.ts)
- [src/domain/scoreboard.ts](/D:/acm%20lab/acm-grade/acm-grade2/src/domain/scoreboard.ts)
- [tests/score.spec.ts](/D:/acm%20lab/acm-grade/acm-grade2/tests/score.spec.ts)

### 数据与存储

- [src/data/store.ts](/D:/acm%20lab/acm-grade/acm-grade2/src/data/store.ts)
- [src/data/rules.json](/D:/acm%20lab/acm-grade/acm-grade2/src/data/rules.json)
- [src/data/periods.json](/D:/acm%20lab/acm-grade/acm-grade2/src/data/periods.json)
- [src/data/students.json](/D:/acm%20lab/acm-grade/acm-grade2/src/data/students.json)

### 管理台与首页

- [src/pages/AdminView.vue](/D:/acm%20lab/acm-grade/acm-grade2/src/pages/AdminView.vue)
- [src/pages/HomeView.vue](/D:/acm%20lab/acm-grade/acm-grade2/src/pages/HomeView.vue)
- [src/styles.css](/D:/acm%20lab/acm-grade/acm-grade2/src/styles.css)

### 同步链路

- [src/services/codeforces.ts](/D:/acm%20lab/acm-grade/acm-grade2/src/services/codeforces.ts)
- [src/services/github.ts](/D:/acm%20lab/acm-grade/acm-grade2/src/services/github.ts)
- [src/services/localSync.ts](/D:/acm%20lab/acm-grade/acm-grade2/src/services/localSync.ts)
- [scripts/lib/codeforces-sync.mjs](/D:/acm%20lab/acm-grade/acm-grade2/scripts/lib/codeforces-sync.mjs)
- [scripts/lib/nowcoder-sync.mjs](/D:/acm%20lab/acm-grade/acm-grade2/scripts/lib/nowcoder-sync.mjs)
- [scripts/lib/local-sync.mjs](/D:/acm%20lab/acm-grade/acm-grade2/scripts/lib/local-sync.mjs)
- [scripts/sync-codeforces.mjs](/D:/acm%20lab/acm-grade/acm-grade2/scripts/sync-codeforces.mjs)
- [scripts/sync-nowcoder.mjs](/D:/acm%20lab/acm-grade/acm-grade2/scripts/sync-nowcoder.mjs)
- [vite.config.ts](/D:/acm%20lab/acm-grade/acm-grade2/vite.config.ts)

## 已知限制

- 考勤当前仍是周期聚合记录，不是逐次明细，所以在 `7d / 30d / all` 三个窗口下保持不变。
- Codeforces 首次同步历史很多的账号仍可能比较慢，因为需要补部分 `contest.standings` 百分位。
- 本地一键同步只在 `npm run dev` 的开发环境可用，生产构建不会暴露该接口。
- `dist/` 不在 Git 跟踪内，部署时需要先本地 `npm run build`。

## 常用命令

```bash
npm install
npm run dev
npm run validate:data
npm test
npm run build
npm run sync:codeforces -- --studentId stu-001 --handle tourist --periodId period-2026-spring
npm run sync:nowcoder -- --nowcoderId 347041329 --studentId stu-001 --periodId period-2026-spring
```

## 排障建议

- 如果第二次同步 CF 仍出现异常慢或累计题数异常，先检查旧记录是否带有 `solvedHistory`、`contestHistory`、`fetchedAt`；缺字段会自动回退到一次全量同步。
- 如果排行榜里 CF 各难度过题数看起来偏小，先确认是否有 `UNRATED`；无 rating 的题现在统一放到该桶。
- 如果管理台的一键同步按钮不可用，先确认当前是否通过 `npm run dev` 启动，而不是打开生产构建。

## 推送前建议检查

```bash
npm run validate:data
npm test
npm run build
```

## 后续部署建议

面向 `mms0420.cn:789` 的静态部署建议：

1. 本地执行 `npm run build`
2. 将 `dist/` 挂载到服务器静态目录
3. 确认服务器直接以静态资源方式提供 `index.html` 和 `assets/*`

当前 `vite.config.ts` 使用 `base: './'`，适合目录挂载方式部署。
