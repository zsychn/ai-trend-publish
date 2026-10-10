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

初始化会创建 ByterLife 品牌和默认 `life`
风格，首次创建时关闭默认定时任务；重复初始化保留已有账号与定时设置。生活稿从具体场景写起，不强行追逐新闻时效；事实需来源，健康结论需核验，不编造亲历、读者反馈或收益。

管理模式与标准 `deno task dev`/`deno run -A src/index.ts`
不同：标准入口仍要求模型配置并启用调度。本轮没有启用后台发表或修改平台访问权限。

## 验证

```sh
deno task test:byterlife
deno check scripts/manage.ts scripts/setup.byterlife.ts trendpublish.config.byterlife.example.ts
deno task dashboard check
deno task dashboard build
```

当前目标是可运行的管理基础与生活编辑适配，不把草稿 ID
当作已发表链接。内容生产、贴图交付、24h/7d 后台反馈与成本收益归属将继续迭代。
