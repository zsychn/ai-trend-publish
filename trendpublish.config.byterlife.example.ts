import { defineConfig } from "@src/utils/config/define-config.ts";

export default defineConfig((runtime) => ({
  server: { apiKey: runtime.required("TRENDPUBLISH_API_KEY"), port: 8000 },
  providers: {
    ai: {
      baseUrl: runtime.value("BYTERLIFE_LLM_BASE_URL"),
      apiKey: runtime.secret("BYTERLIFE_LLM_API_KEY"),
      model: runtime.value("BYTERLIFE_LLM_MODEL"),
    },
    publish: { weixin: { author: "ByterLife", accounts: {} } },
  },
  features: {
    article: {
      dryRun: true,
      count: 1,
      renderer: { template: "minimal", promptProfile: "life" },
      sources: [],
      cover: { enabled: false },
      bodyImages: { mode: "off" },
      notifications: { channels: [] },
      qualityGate: { enabled: true, minScore: 80, forcePublish: false },
    },
  },
}));
