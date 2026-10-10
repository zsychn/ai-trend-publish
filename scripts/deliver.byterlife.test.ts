import { assertEquals, assertThrows } from "@std/assert";
import { renderBody } from "./deliver.byterlife.ts";

Deno.test("delivery escapes raw HTML rather than executing article markup", () => {
  const html = renderBody("# 标题\n\n<script>alert(1)</script>", "标题");
  assertEquals(html.includes("<script>"), false);
  assertEquals(html.includes("&lt;script&gt;"), true);
});

Deno.test("delivery rejects a mismatched final title", () => {
  assertThrows(
    () => renderBody("# 旧标题\n\n正文", "新标题"),
    Error,
    "标题与终稿不一致",
  );
});
