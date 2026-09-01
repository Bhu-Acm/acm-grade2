# ACM Grade 2 交接文档

更新时间：2026-09-01

## 当前状态

- 本地目录：`D:\acm lab\acm-grade\acm-grade2`
- 当前分支：`main`
- 远端仓库：`https://github.com/Bhu-Acm/acm-grade2`
- GitHub Pages 站点：`https://bhu-acm.github.io/acm-grade2/`
- GitHub Pages 帮助页：`https://bhu-acm.github.io/acm-grade2/#/help`
- 形态：Vue 静态前端，构建输出 `dist/`
- 规划部署地址：`mms0420.cn:789`
- 数据存储：GitHub 仓库 JSON
- 数据库：无

## 已完成模块

- `#/` 公开排行榜。
- `#/help` 帮助中心。
- `#/admin-access` 和 `#/admin` 管理台。
- 页脚显示 GitHub 仓库地址。
- 帮助帖子和资料索引已纳入 GitHub 同步链路。

## 帮助内容维护

帮助帖子文件：

```text
src/data/helpPosts.json
```

帮助资料索引：

```text
src/data/helpResources.json
```

原始资料：

```text
help/
public/help/
```

如果要改帖子内容，直接在 GitHub 网页编辑 `src/data/helpPosts.json` 即可。当前不建议给管理台增加富文本帮助编辑器：帮助内容更新频率低，直接维护仓库文件更简单，也更适合 Git 审核、回滚和同步。

## 数据与同步

完整数据集：

```text
students
periods
rules
attendance
nowcoder
codeforces
helpPosts
helpResources
```

GitHub 配置来源：

```text
.env.example
src/services/github.ts
```

同步策略：

- 拉取使用 GitHub Contents API。
- 提交使用 Git Data API 的 `blob -> tree -> commit -> ref`。
- 管理台 JSON 导入导出也覆盖帮助文件。

## 路由与部署注意事项

- GitHub Pages 使用仓库子路径 `/acm-grade2/`。
- 前端路由使用 hash 模式，避免 GitHub Pages 刷新时出现 404。
- 帮助资料链接使用相对 `BASE_URL` 生成，适配本地开发和 GitHub Pages。
- GitHub Actions 构建时，`vite.config.ts` 会根据 `GITHUB_REPOSITORY` 自动推导 `base`。

## 本地同步流程

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

如果本地和远端都有新提交，先合并再推送，不要强推覆盖远端数据。

## 自动同步命令

```bash
npm run sync:codeforces -- --studentId stu-001 --handle tourist --periodId period-2026-spring
npm run sync:nowcoder -- --nowcoderId 347041329 --studentId stu-001 --periodId period-2026-spring
```

## 已知限制

- 考勤仍是周期聚合。
- Codeforces 首次同步可能较慢。
- `/__dev/sync/all` 仅开发环境可用。
- `dist/` 不纳入 Git。
- Token 不要写入仓库。

## 最近验证

- `npm run validate:data`
- `npm test`
- `npm run build`
