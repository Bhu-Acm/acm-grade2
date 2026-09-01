# ACM Grade 2

面向 ACM 新生训练的公开排行榜、帮助中心和维护工具。项目是 Vue 3 + Vite 静态前端，业务数据直接保存在仓库 JSON 中，不依赖数据库。

## 仓库

GitHub: `https://github.com/Bhu-Acm/acm-grade2`

默认仓库配置：

```text
VITE_GITHUB_OWNER=Bhu-Acm
VITE_GITHUB_REPO=acm-grade2
VITE_GITHUB_BRANCH=main
VITE_GITHUB_REPOSITORY=https://github.com/Bhu-Acm/acm-grade2
```

## 功能

- `/` 公开排行榜，支持 `7d / 30d / all`。
- 点击学生可查看总分拆解、原始指标和趋势。
- `/help` 帮助中心，按轮次展示注册、提问、排错和板子使用说明。
- `/admin-access` 和 `/admin` 提供学生、规则、考勤、牛客、同步和 JSON 导入导出维护。
- GitHub 同步使用 Contents API 拉取，使用 Git Data API 一次性提交原子更新。

## 帮助内容

帮助问答和资料索引分别在：

```text
src/data/helpPosts.json
src/data/helpResources.json
```

原始资料归档：

```text
help/
public/help/
```

当前不建议在管理台增加富文本帮助编辑器。帮助内容低频变更，直接维护 JSON 更稳，也更适合 Git 审核和回滚。

## 评分规则

规则在 `src/data/rules.json`，周期在 `src/data/periods.json`。

```text
A  = 考勤
NR = 牛客 Rating
NQ = 牛客比赛表现
CR = CF Rating
CS = CF 过题量
CD = CF 难度
CP = CF 比赛表现
P  = 参赛次数
```

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

访问：

```text
http://localhost:5173/
http://localhost:5173/help
http://localhost:5173/admin-access
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

项目使用 `base: './'`，Nginx 已配置 `try_files` 回退到 `index.html`，所以 history 路由可直接访问 `/help`。

```bash
npm run build
docker compose up --build -d
```

构建产物在 `dist/`，规划部署地址：`mms0420.cn:789`。

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
