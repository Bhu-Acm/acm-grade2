# ACM Grade 2

面向 ACM 新生训练的公开排行榜、帮助中心和维护工具。项目是 Vue 3 + Vite 静态前端，业务数据直接存放在仓库 JSON 中，不依赖数据库。

## 仓库与站点

- GitHub 仓库：`https://github.com/Bhu-Acm/acm-grade2`
- GitHub Pages 发布后站点地址：`https://bhu-acm.github.io/acm-grade2/`
- GitHub Pages 路由采用 hash 模式，因此帮助页地址是 `https://bhu-acm.github.io/acm-grade2/#/help`

默认仓库配置保存在：

```text
.env.example
src/services/github.ts
```

对应配置项：

```text
VITE_GITHUB_OWNER=Bhu-Acm
VITE_GITHUB_REPO=acm-grade2
VITE_GITHUB_BRANCH=main
VITE_GITHUB_REPOSITORY=https://github.com/Bhu-Acm/acm-grade2
```

## 功能

- `/` 公开排行榜，支持 `7d / 30d / all`。
- 点击学生可查看总分拆解、原始指标和趋势。
- `#/help` 帮助中心，按轮次展示注册、提问、排错、板子和复盘内容。
- `#/admin-access` 和 `#/admin` 提供学生、规则、考勤、牛客、同步和 JSON 导入导出维护。
- GitHub 同步使用 Contents API 拉取，使用 Git Data API 原子提交全部数据文件。

## 帮助内容维护

帮助帖子直接维护在 GitHub 仓库文件中：

```text
src/data/helpPosts.json
src/data/helpResources.json
```

原始资料文件位于：

```text
help/
public/help/
```

如果只想改帖子文字，直接在 GitHub 网页上编辑 `src/data/helpPosts.json` 即可；如果要改“原始资料”里的跳转入口，编辑 `src/data/helpResources.json`。当前不建议在管理台增加富文本帮助编辑器，因为帮助内容更新频率低，直接维护仓库文件更稳，也更适合 Git 审核和回滚。

## 评分规则

规则在 `src/data/rules.json`，周期在 `src/data/periods.json`。

```text
A  = 考勤
NR = 牛客 Rating
NQ = 牛客比赛表现
CR = Codeforces Rating
CS = Codeforces 过题量
CD = Codeforces 难度
CP = Codeforces 比赛表现
P  = 参赛次数
```

Codeforces 历史记录支持 `solvedHistory`、`contestHistory` 和 `snapshots`，窗口排名会按历史重新切片；没有 rating 的题会进入 `UNRATED`。

## 主要目录

```text
src/data/                  JSON 数据源
src/domain/                评分、排名、窗口、校验
src/pages/HomeView.vue     公开排行榜
src/pages/HelpView.vue     帮助中心
src/pages/AdminView.vue    管理台
src/services/github.ts     GitHub 拉取与原子提交
src/services/localSync.ts  本地开发一键同步
scripts/validate-data.mjs  JSON 校验
tests/score.spec.ts        评分与窗口测试
```

## 本地运行

```bash
npm install
npm run validate:data
npm test
npm run build
npm run dev
```

本地访问：

```text
http://localhost:5173/
http://localhost:5173/#/help
http://localhost:5173/#/admin-access
```

## 同步命令

```bash
npm run sync:codeforces -- --studentId stu-001 --handle tourist --periodId period-2026-spring
npm run sync:nowcoder -- --nowcoderId 347041329 --studentId stu-001 --periodId period-2026-spring
```

常用参数：

```text
--rating-only
--dry-run
--from YYYY-MM-DD
--to YYYY-MM-DD
```

## 部署

- 本地或服务器静态部署：`npm run build`
- Docker 部署：`docker compose up --build -d`
- GitHub Pages：推送到 `main` 后由 `.github/workflows/deploy-pages.yml` 自动构建并发布

Vite 在 GitHub Actions 中会自动使用仓库子路径 `/acm-grade2/` 作为 `base`，其他环境默认使用 `/`。路由使用 hash 模式，因此刷新 `#/help`、`#/admin` 不会触发 GitHub Pages 404。

## Git 工作流

```bash
git fetch origin
git pull --ff-only origin main
npm run validate:data
npm test
npm run build
git add .
git commit -m "描述本次修改"
git push origin main
```

不要提交 `dist/`、Token 或其他敏感配置。`.env.example` 只保存非敏感仓库配置示例。
