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
- 公开奖牌式仪表盘示例
- 数据校验和评分单元测试

暂不在基础版本加入复杂后台。后续需要编辑时，优先增加一个管理员编辑页，提交后生成 JSON 变更；牛客爬虫只负责生成草稿数据，不应静默覆盖人工录入。

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

牛客当前使用管理员手工录入。后续爬虫应输出与 `nowcoder.json` 相同结构的草稿文件，由管理员检查后合并。

## 本地运行

```bash
npm install
npm run validate:data
npm run test
npm run build
npm run dev
```

## GitHub 数据维护约定

1. 先修改 `src/data/*.json`，不要直接修改评分公式。
2. 修改权重时保证总和等于 `1`。
3. 牛客数据重复记录默认拒绝，使用唯一的 `id`。
4. Codeforces 快照保留 `source`、`fetchedAt` 和 `isManualOverride`。
5. 每次数据变更都运行 `npm run validate:data && npm run test && npm run build`。

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
