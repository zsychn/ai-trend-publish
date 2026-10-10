import { ok as assert, strictEqual as assertEquals } from "node:assert";
import {
  getChineseNewsroomStyleGuide,
  listPromptProfileNames,
  resolvePromptProfile,
} from "./prompt-profile.ts";

Deno.test("life profile uses everyday editorial standards rather than news urgency", () => {
  assert(listPromptProfileNames().includes("life"));
  assertEquals(resolvePromptProfile("life").label, "生活与思考");
  const guide = getChineseNewsroomStyleGuide("life");
  assert(guide.includes("不虚构第一人称体验"));
  assert(guide.includes("健康结论需核验"));
  assert(!guide.includes("这事为什么现在值得看"));
});

Deno.test("existing technology guidance remains available", () => {
  assertEquals(resolvePromptProfile().id, "technology");
  assert(
    getChineseNewsroomStyleGuide("technology").includes("中文科技媒体写作指南"),
  );
});
