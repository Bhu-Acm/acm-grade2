# ACM Grade 2 交接文档

更新时间：2026-08-30

## 项目基线

- 项目目录：`D:\acm lab\acm-grade\acm-grade2`
- GitHub：`https://github.com/Bhu-Acm/acm-grade2.git`
- 分支：`main`
- Git 身份：`mms <1605585155@qq.com>`
- 交接前基线提交：`8610e0325bb063f715d3da2259bd759370cbb5ed`
- 本地与 `origin/main` 已确认同步，工作区干净。
- 部署域名：`mms0420.cn:789`

## 项目定位

面向 ACM 新生公开展示的综合评分和排行榜系统。数据直接保存在 GitHub 仓库的 `src/data/*.json`，不使用数据库；Vue 前端负责展示和管理台，TypeScript 纯函数负责评分计算。

设计原则：功能简单、方便修 bug、公开展示有竞赛压力，同时给新生明确训练目标。

## 技术栈与命令

- Vue 3、TypeScript、Vite、Vue Router、Vitest
- Node.js 20+

```bash
npm install
npm run dev
npm run validate:data
npm run test
npm run build
npm run preview
```

提交前执行：

```bash
npm run validate:data && npm run test && npm run build
```

`dist/` 被 `.gitignore` 忽略，部署前本地执行 `npm run build` 重新生成。

## 目录结构

```text
src/data/              JSON 数据
src/domain/            评分、排名、榜单、校验
src/data/store.ts       管理台 localStorage 草稿 store
src/services/github.ts  GitHub 数据读写
src/services/codeforces.ts  Codeforces API 转换
src/pages/HomeView.vue  公开展示区
src/pages/AdminAccessView.vue  管理台密码入口
src/pages/AdminView.vue 管理台
scripts/sync-codeforces.mjs  Codeforces 命令行同步
scripts/sync-nowcoder.mjs    牛客用户比赛数据同步
scripts/validate-data.mjs    JSON 校验
tests/score.spec.ts          评分测试
```

## 页面和权限

- `/`：公开排行榜和学生展示。
- `/admin-access`：管理台密码入口。
- `/admin`：管理台，未解锁时跳转到 `/admin-access`。

环境变量见 `.env.example`：

```env
VITE_ADMIN_PASSWORD=acm2026
VITE_GITHUB_OWNER=Bhu-Acm
VITE_GITHUB_REPO=acm-grade2
VITE_GITHUB_BRANCH=main
```

管理台密码状态只保存在当前浏览器的 `sessionStorage`。这是纯静态前端门禁，不是真正的身份认证；不要将高权限 GitHub Token 写入代码或发布包。

## 数据与评分

数据文件：

```text
src/data/students.json
src/data/periods.json
src/data/rules.json
src/data/attendance.json
src/data/nowcoder.json
src/data/codeforces.json
```

当前 `src/data/rules.json` 的实际权重是：

```text
出勤       10%
牛客竞赛   30%
Codeforces 60%
```

牛客聚合方式当前为 `AVERAGE`。权重总和必须等于 `1`，管理台会阻止非法权重保存。

注意：`README.md` 前面的旧说明仍写着 `20% / 40% / 40%`，与 `rules.json` 不一致。后续应以 `rules.json` 为准并修正 README。

评分使用：

```ts
import { loadScoreboard, getStudentScore } from './src/domain/scoreboard';

const rows = loadScoreboard();
const row = getStudentScore('stu-001');
```

## 管理台工作流

管理台修改先写入浏览器 `localStorage`，不会自动写入 GitHub。

支持：

- 学生新增和编辑。
- 保存 Codeforces Handle、牛客 Handle、牛客用户 ID。
- 当前周期牛客成绩手工新增、编辑、删除。
- 评分权重修改。
- JSON 导入和导出。
- Codeforces 前端低频同步到本地草稿。
- 使用 GitHub Token 从仓库获取数据或提交本地草稿。

推荐流程：

1. 先点击“从 GitHub 获取数据”，避免覆盖远端最新修改。
2. 在管理台编辑数据。
3. 检查排行榜和导出的 JSON。
4. 填写 GitHub Token 与提交说明。
5. 点击“提交更改到 GitHub”。
6. 重新打开公开区确认结果。

GitHub 同步会更新六个 JSON 文件，每个文件单独调用 Contents API 提交，不是单次原子提交。中途失败时先重新从 GitHub 获取数据，再继续。

## 牛客同步脚本

用户页面格式：

```text
https://ac.nowcoder.com/acm/contest/profile/{id}
```

实际接口：

```text
https://ac.nowcoder.com/acm-heavy/acm/contest/profile/contest-joined-history
```

基本用法：

```bash
npm run sync:nowcoder -- --nowcoderId 347041329 --studentId stu-001 --periodId period-2026-spring
```

只测试接口、不写文件：

```bash
npm run sync:nowcoder -- --nowcoderId 347041329 --studentId stu-001 --max-pages 1 --dry-run
```

常用参数：

```bash
--rating-only                  只抓 Rating 比赛
--from 2026-01-01              起始日期
--to 2026-08-30                 结束日期
--page-size 100                 每页数量
--max-pages 2                   最大页数
--output path/to/file.json      自定义输出文件
```

接口数据映射：`contestId`、`contestName`、`startTime`、`userCount/signUpCnt`、`rank`、`acceptedCount`、`totalScore`、`rating`、`changeValue`。其中 `totalScore` 保存为 `platformScore`，系统按排名换算的百分制分数保存为 `contestScore`。

合并优先级：

```text
MANUAL / isManualOverride > IMPORT > SCRIPT > 其他
```

自动抓取不会覆盖人工校正数据。脚本默认写入 `src/data/nowcoder.json`，正式提交前必须检查 diff 并运行校验、测试、构建。

截至本交接时间，真实接口测试账号 `347041329` 的 dry-run 结果为：抓取 1 页、74 条记录，未修改数据文件。

## Codeforces 同步

```bash
npm run sync:codeforces -- --studentId stu-001 --handle tourist --periodId period-2026-spring
```

脚本调用官方 `user.info`、`user.status`、`user.rating`，生成或替换对应学生和周期的 Codeforces 快照。管理台也有低频同步入口。

## 部署

宝塔部署：

```bash
npm run build
```

将 `dist/` 内全部文件上传到网站根目录。Nginx 需要把未知路径回退到 `index.html`，仓库中的 `nginx.conf` 已包含 `try_files` 配置。

仓库同时提供：

- `Dockerfile`
- `docker-compose.yml`
- `nginx.conf`

Docker 本地启动：

```bash
docker compose up --build
```

默认访问 `http://localhost:8080`。

## 已验证结果

2026-08-30 已通过：

```text
npm run validate:data  -> data ok: 8 students, 1 periods, 1 rules
npm run test           -> 4 tests passed
npm run build          -> Vue production build passed
```

## 已知问题

- README 旧权重说明需要修正为当前 `10% / 30% / 60%`。
- 部分历史文件在错误的 PowerShell 编码设置下会显示乱码；修改中文时确认文件仍是 UTF-8，避免批量重写历史内容。
- 管理台密码不提供真正安全认证。
- GitHub 当前每个数据文件单独提交，后续如需原子更新应改用后端代理或 GitHub Actions。
- 牛客接口是网页内部接口，字段或访问策略可能变化；接口失败时保留手工录入，不要让公开展示依赖实时爬取。
- 牛客脚本是命令行同步工具，不是前端实时爬虫。

## 新对话开场模板

```text
请先读取仓库根目录 HANDOFF.md。当前项目是 acm-grade2。
先检查 git status 和当前分支，再处理以下需求：<具体需求>。
不要覆盖远端已有数据提交，修改后运行 validate:data、test 和 build。
```
