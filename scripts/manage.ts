import {
  initializeAppConfig,
  parseConfigArgs,
} from "@src/utils/config/app-config.ts";
import startServer from "@src/server.ts";

// Management can run before model credentials are configured. This entry point
// intentionally does not start the scheduler or run a generation workflow.
const { configPath } = parseConfigArgs(Deno.args);
const config = await initializeAppConfig({ configPath });
if (!config.server.apiKey) throw new Error("管理 API 需要配置 server.apiKey");
await startServer(config.server.port, "127.0.0.1");
