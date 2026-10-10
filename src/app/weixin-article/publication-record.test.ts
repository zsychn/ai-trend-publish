import { assertEquals, assertThrows } from "@std/assert";
import { parsePublication } from "./publication-record.ts";

const record = {
  url: "https://mp.weixin.qq.com/s/test-fixture",
  publishedAt: "2020-01-01T12:00:00+08:00",
  reads: 0,
};
Deno.test("publication distinguishes unknown metrics from measured zero", () => {
  const parsed = parsePublication(record);
  assertEquals(parsed.reads, 0);
  assertEquals(parsed.shares, null);
  assertEquals(parsed.publishedAt, "2020-01-01T04:00:00.000Z");
});
Deno.test("publication rejects other hosts and future timestamps", () => {
  assertThrows(() =>
    parsePublication({
      ...record,
      url: "https://mp.weixin.qq.com.evil.example/s/a",
    })
  );
  assertThrows(() =>
    parsePublication({ ...record, publishedAt: "2099-01-01T12:00:00+08:00" })
  );
});
Deno.test("publication rejects invalid feedback counts", () => {
  for (const reads of [-1, 1.5, "12"]) {
    assertThrows(() => parsePublication({ ...record, reads }));
  }
});
