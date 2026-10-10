export interface PublicationRecord {
  url: string;
  publishedAt: string;
  reads: number | null;
  shares: number | null;
  follows: number | null;
  note: string;
  updatedAt: string;
}

export function parsePublication(value: unknown): PublicationRecord {
  if (!value || typeof value !== "object") throw new Error("发布记录格式无效");
  const input = value as Record<string, unknown>;
  const url = new URL(String(input.url ?? ""));
  if (
    url.protocol !== "https:" || url.hostname !== "mp.weixin.qq.com" ||
    url.username || url.password || !url.pathname.startsWith("/s")
  ) {
    throw new Error("请填写实际的微信文章 HTTPS 链接");
  }
  const date = String(input.publishedAt ?? "");
  if (
    !/(Z|[+-]\d\d:\d\d)$/.test(date) || !Number.isFinite(Date.parse(date)) ||
    Date.parse(date) > Date.now()
  ) {
    throw new Error("请填写已经发生的实际发布时间");
  }
  const metric = (key: string): number | null => {
    const x = input[key];
    if (x === undefined || x === null || x === "") return null;
    if (typeof x !== "number" || !Number.isSafeInteger(x) || x < 0) {
      throw new Error("反馈数据必须是非负整数，未知请留空");
    }
    return x;
  };
  return {
    url: url.href,
    publishedAt: new Date(date).toISOString(),
    reads: metric("reads"),
    shares: metric("shares"),
    follows: metric("follows"),
    note: String(input.note ?? "").slice(0, 4000),
    updatedAt: new Date().toISOString(),
  };
}
