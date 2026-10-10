# ByterLife fork

上游：[liyown/ai-trend-publish](https://github.com/liyown/ai-trend-publish)。保持
MIT 许可证及上游署名。

本轮增加生活内容 `life` 风格、ByterLife
初始化和仅管理入口。现有工作流、Dashboard 与 SQLite 配置中心继续使用上游实现。

## 本地启动

建议使用与上游 Docker/CI 一致的 Deno 2.7.14。复制
`trendpublish.config.byterlife.example.ts` 为
`trendpublish.config.ts`，配置本地环境变量 `TRENDPUBLISH_API_KEY`。模型配置通过
`BYTERLIFE_LLM_BASE_URL`、`BYTERLIFE_LLM_API_KEY`、`BYTERLIFE_LLM_MODEL`
读取，不提交密钥。

```sh
deno task byterlife:setup
deno task dashboard build
deno task manage
```

打开 `http://127.0.0.1:8000/dashboard/`。管理接口需要 Bearer
key；管理启动不会打印密钥，不启动调度，也不执行模型或微信调用。未配置模型时可维护账号和制作方案，但真实生成仍不可用。

控制台在当前浏览器的同源 localStorage
中保存管理密钥，刷新或新开标签页无需重复输入；旧标签页的 sessionStorage
登录会自动迁移。退出或密钥失效会清除保存值，并同步其他打开的标签页。仅在可信的个人浏览器使用；API
仍要求 Bearer 验证。

初始化会创建 ByterLife 品牌和默认 `life`
风格，首次创建时关闭默认定时任务；重复初始化保留已有账号与定时设置。生活稿从具体场景写起，不强行追逐新闻时效；事实需来源，健康结论需核验，不编造亲历、读者反馈或收益。

管理模式与标准 `deno task dev`/`deno run -A src/index.ts`
不同：标准入口仍要求模型配置并启用调度。本轮没有启用后台发表或修改平台访问权限。

## 验证

2026-10-10 已实际启动本地管理服务，验证控制台登录、ByterLife
账号显示、编辑保存及刷新后持久化。修复空数据源阻止初始化的问题；未选数据源时可以先维护配置，实际生成仍要求有效来源和模型配置。

本地可双击 `scripts/start-byterlife.command`
重新启动（需先完成上述配置），运行期间保持终端打开。默认地址为
`http://127.0.0.1:8000/dashboard/`。只在本机监听；本轮没有配置开机自动启动。

```sh
deno task test:byterlife
deno check scripts/manage.ts scripts/setup.byterlife.ts trendpublish.config.byterlife.example.ts
deno task dashboard check
deno task dashboard build
```

当前目标是可运行的管理基础与生活编辑适配，不把草稿 ID
当作已发表链接。内容生产、贴图交付、24h/7d 后台反馈与成本收益归属将继续迭代。

## Codex 内容交付流程

日常入口默认是「今天发什么」：待发布、已发布、反馈三个栏目。三份已有成品已迁入原有产物库；模型、来源和账号配置收在高级设置，随时可返回日常工作台。正文支持富文本复制；封面和发布包可下载。发布记录要求实际微信链接和已经发生的发布时间，反馈未知值与真实零值区分保存，24h/7d 时间为复盘参考，不表示自动同步或已设定提醒。

发布记录使用原有鉴权接口 `/api/runs/:runId/publication`，存放于本机产物目录下的 `publications/:runId.json`。可编辑修正；不改变实际微信发表状态。备份时连同 `src/temp` 保留。

未接模型 API 时，Codex 可以完成选题研究、写作、审稿和内置 imagegen
配图，再通过本项目打包和归档。此模式不等同无人值守生成。

1. 保存选题及来源核验记录 `brief.md`，完成 `article.md` 和原创 PNG 封面。
2. 提供 JSON
   清单：`id`、`accountId`、`title`、`digest`、`article`、`brief`、`cover`、`coverPrompt`、`reviewed: true`。文件路径相对清单；ID
   使用小写字母、数字、连字符。
3. 在项目根目录运行
   `deno task byterlife:deliver /绝对路径/input.json /绝对路径/exports`。
4. 脚本检查输入、标题一致性及 PNG，输出 Markdown、正文 HTML、自带封面的预览
   HTML、发布说明、SHA-256 清单和 ZIP；在原有运行记录及产物库归档。重复内容 ID
   的导出目录不会被覆盖。
5. 控制台选择对应运行 → 产物库 → 完整发布包 →
   下载文件。HTML、图片和文本也可分别预览和下载。

运行的成功状态仅代表交付归档成功，记录
`dryRun: true`；不会调用微信、发表文章或启用定时任务。选题和审稿记录为实际 Codex
工作记录，不是程序生成的自动审稿分数。

2026-10-10
已用家庭分工文章完成一轮实际交付。剩余的无人值守模型写作、公众号送稿和反馈同步仍需另行接通。
