import {
  initializeAppConfig,
  parseConfigArgs,
} from "@src/utils/config/app-config.ts";
import { createLocalArticleRuntimeStores } from "@src/app/weixin-article/local-runtime-stores.ts";
import { seedArticleRuntimeConfig } from "@src/app/weixin-article/runtime/article-runtime-config.service.ts";
import { DEFAULT_ARTICLE_PROFILE_ID } from "@src/app/weixin-article/runtime/article-runtime-config.ts";

const { configPath } = parseConfigArgs(Deno.args);
const config = await initializeAppConfig({ configPath });
const store = createLocalArticleRuntimeStores(config).runtimeConfigStore;
await seedArticleRuntimeConfig(store, config);
if (!await store.getWeixinAccountProfile("byterlife")) {
  await store.saveWeixinAccountProfile({
    id: "byterlife",
    name: "ByterLife",
    enabled: true,
    defaultArticleProfileId: DEFAULT_ARTICLE_PROFILE_ID,
    brand: {
      displayName: "ByterLife",
      positioning: "健康、快乐、思维常青。",
      audience: "关注工作之外的生活、爱好、日常运动与关系的普通成年人",
      tone: "温暖、直接、克制，不虚构经历或研究，不制造焦虑",
      titleStyle: "具体问题或生活场景，标题与正文一致",
      coverStyle: "奶油白、深绿、少量橙色的编辑插画",
      forbiddenTopics: ["无依据的医疗建议", "伪造经历和收益", "搬运爆款"],
    },
    defaults: {
      articleProfileId: DEFAULT_ARTICLE_PROFILE_ID,
      promptProfile: "life",
      template: "minimal",
      count: 1,
    },
    ops: {},
  });
  // Initial setup does not silently enable unattended runs.
  const schedule = await store.getSchedule(DEFAULT_ARTICLE_PROFILE_ID);
  if (schedule) await store.saveSchedule({ ...schedule, enabled: false });
  console.log("ByterLife 运营配置已建立；初始定时任务关闭。");
} else {
  console.log("ByterLife 已存在，保留已有运营配置与定时设置。");
}
