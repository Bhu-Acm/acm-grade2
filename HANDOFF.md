# ACM Grade 2 交接文档

更新时间：2026-09-01

## 当前状态

- 本地目录：`D:\acm lab\acm-grade\acm-grade2`
- 当前分支：`main`
- 远端仓库：`https://github.com/Bhu-Acm/acm-grade2`
- 远端名称：`origin`
- 形态：Vue 静态前端，构建输出 `dist/`
- 规划部署地址：`mms0420.cn:789`
- 数据存储：GitHub 仓库中的 JSON
- 数据库：无

## 已完成

- `/` 公开排行榜。
- `/help` 帮助中心。
- `/admin-access` 和 `/admin` 管理台。
- 底部显示 GitHub 仓库地址。
- 帮助问答数据和资料索引已加入 GitHub 同步链路。

## 帮助内容

帮助问答：

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

帮助内容低频变更，当前不建议增加管理台富文本编辑器。直接改 JSON 更适合 Git 审核、回滚和远端同步。

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

默认仓库地址已存入项目配置，可直接解析为：

```text
https://github.com/Bhu-Acm/acm-grade2
```

同步策略：

- 拉取用 GitHub Contents API。
- 提交用 Git Data API 的 `blob -> tree -> commit -> ref`。
- 管理台导入导出也覆盖帮助 JSON。

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
