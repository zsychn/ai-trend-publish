import { useState } from "react";
import { Modal } from "@mantine/core";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { apiArtifact, apiJson } from "../api/client.ts";
import type { ArticleRunRecord, ArtifactRef } from "../api/types.ts";
import { ArtifactPreview } from "./artifacts.tsx";

interface Publication {
  url: string;
  publishedAt: string;
  reads: number | null;
  shares: number | null;
  follows: number | null;
  note: string;
}
interface Content {
  run: ArticleRunRecord;
  title: string;
  digest?: string;
  format?: string;
  publication: Publication | null;
}
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
const localDate = (date?: string) => {
  const x = new Date(date ?? Date.now());
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(x).replace(" ", "T");
};

export function DailyDesk({ apiKey, runs, onAdvanced, onRefresh }: {
  apiKey: string;
  runs: ArticleRunRecord[];
  onAdvanced: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"ready" | "published" | "feedback">("ready");
  const [preview, setPreview] = useState<ArtifactRef | null>(null);
  const [editing, setEditing] = useState<Content | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const cache = useQueryClient();
  const delivered = runs.filter((run) =>
    run.status === "succeeded" &&
    run.artifacts.some((x) => x.key.endsWith("/manifest.json"))
  );
  const queries = useQueries({
    queries: delivered.map((run) => ({
      queryKey: ["daily-content", apiKey, run.runId],
      queryFn: async (): Promise<Content> => {
        const manifest = run.artifacts.find((x) =>
          x.key.endsWith("/manifest.json")
        )!;
        const [meta, record] = await Promise.all([
          apiArtifact(
            `/api/artifacts?key=${encodeURIComponent(manifest.key)}`,
            apiKey,
          ).then((r) => r.json()),
          apiJson<{ publication: Publication | null }>(
            `/api/runs/${encodeURIComponent(run.runId)}/publication`,
            apiKey,
          ),
        ]);
        return {
          run,
          title: meta.title,
          digest: meta.digest,
          format: meta.format,
          publication: record.publication,
        };
      },
    })),
  });
  const contents = queries.flatMap((q) => q.data ? [q.data] : []);
  const ready = contents.filter((x) => !x.publication);
  const published = contents.filter((x) => x.publication);
  const visible = tab === "ready" ? ready : published;
  const failed = queries.some((q) => q.isError);
  const loading = queries.some((q) => q.isPending);
  const open = (content: Content, suffix: string) => {
    const ref = content.run.artifacts.find((x) => x.key.endsWith(suffix));
    if (ref) setPreview(ref);
  };
  return (
    <main className="daily-desk">
      <header className="daily-header">
        <div>
          <span className="daily-brand">BYTERLIFE</span>
          <h1>今天发什么</h1>
          <p>我准备内容，你完成发布。反馈会帮助我们决定下一篇。</p>
        </div>
        <div className="daily-tools">
          <button
            type="button"
            onClick={async () => {
              await Promise.all([
                onRefresh(),
                cache.invalidateQueries({ queryKey: ["daily-content"] }),
              ]);
            }}
          >
            刷新
          </button>
          <button type="button" onClick={onAdvanced}>高级设置</button>
        </div>
      </header>
      <nav className="daily-tabs" aria-label="内容状态">
        <button
          type="button"
          aria-pressed={tab === "ready"}
          onClick={() => setTab("ready")}
        >
          待发布 <span>{ready.length}</span>
        </button>
        <button
          type="button"
          aria-pressed={tab === "published"}
          onClick={() => setTab("published")}
        >
          已发布 <span>{published.length}</span>
        </button>
        <button
          type="button"
          aria-pressed={tab === "feedback"}
          onClick={() => setTab("feedback")}
        >
          反馈
        </button>
      </nav>
      {message && <p role="status" className="daily-message">{message}</p>}
      {failed && <p role="alert">有内容暂时加载失败，请刷新重试。</p>}
      {loading && <p>正在取出内容…</p>}
      {!loading && !failed && !visible.length && (
        <div className="daily-empty">
          {tab === "ready"
            ? "还没有待发布成品，制作完成后会放在这里。"
            : tab === "feedback"
            ? "发布后可以记录阅读、分享和留言；未知数据留空。"
            : "还没有记录实际发布。发完后回到待发布，填写文章链接和时间。"}
        </div>
      )}
      <section
        className="daily-grid"
        aria-label={tab === "ready" ? "待发布内容" : "已发布内容"}
      >
        {visible.map((content) => (
          <article className="daily-card" key={content.run.runId}>
            <small>
              {content.publication
                ? `已发布 · ${dateLabel(content.publication.publishedAt)}`
                : "成品已准备好"}
            </small>
            <h2>{content.title}</h2>
            {content.digest && <p>{content.digest}</p>}
            {tab === "feedback" && content.publication && (
              <>
                <div className="daily-metrics">
                  <span>
                    阅读<strong>{content.publication.reads ?? "待记录"}</strong>
                  </span>
                  <span>
                    分享<strong>
                      {content.publication.shares ?? "待记录"}
                    </strong>
                  </span>
                  <span>
                    新增关注<strong>
                      {content.publication.follows ?? "待记录"}
                    </strong>
                  </span>
                </div>
                <p>
                  {content.publication.note || "还没有留言摘要或调整记录。"}
                </p>
                <p className="daily-subtle">
                  24 小时复盘：{dateLabel(
                    new Date(
                      Date.parse(content.publication.publishedAt) + 86400000,
                    ).toISOString(),
                  )}
                  <br />7 天复盘：{dateLabel(
                    new Date(
                      Date.parse(content.publication.publishedAt) +
                        7 * 86400000,
                    ).toISOString(),
                  )}
                </p>
              </>
            )}
            <div className="daily-actions">
              {tab !== "feedback" && (
                <>
                  <button
                    type="button"
                    className="daily-primary"
                    onClick={() => open(content, "/preview.html")}
                  >
                    看成品
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      open(content, "/body.html")}
                  >
                    {content.format === "cards" ? "复制配文" : "复制正文"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      open(
                        content,
                        content.format === "cards"
                          ? "/delivery.zip"
                          : "/cover.png",
                      )}
                  >
                    {content.format === "cards" ? "六张图片" : "封面图片"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      open(content, "/delivery.zip")}
                  >
                    下载发布包
                  </button>
                </>
              )}
              {content.publication && (
                <a
                  href={content.publication.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  查看已发文章
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setEditing(content);
                }}
              >
                {content.publication
                  ? tab === "feedback" ? "记录反馈" : "修改发布信息"
                  : "我已发布，记录链接"}
              </button>
            </div>
          </article>
        ))}
      </section>
      <footer>发布信息和反馈保存在本机。数据不会自动从微信同步。</footer>
      {editing && (
        <Modal
          opened
          onClose={() => {
            if (!saving) setEditing(null);
          }}
          centered
          size="lg"
          title={editing.publication ? "发布与反馈记录" : "记录实际发布"}
        >
          <section className="daily-form">
            <h2>{editing.publication ? "发布与反馈记录" : "记录实际发布"}</h2>
            <p>{editing.title}</p>
            <form
              key={editing.run.runId}
              onSubmit={async (event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                setSaving(true);
                setMessage("");
                try {
                  const number = (key: string) =>
                    data.get(key) === "" ? null : Number(data.get(key));
                  await apiJson(
                    `/api/runs/${
                      encodeURIComponent(editing.run.runId)
                    }/publication`,
                    apiKey,
                    {
                      method: "PUT",
                      body: JSON.stringify({
                        url: data.get("url"),
                        publishedAt: `${data.get("publishedAt")}:00+08:00`,
                        reads: number("reads"),
                        shares: number("shares"),
                        follows: number("follows"),
                        note: data.get("note"),
                      }),
                    },
                  );
                  await cache.invalidateQueries({
                    queryKey: ["daily-content", apiKey, editing.run.runId],
                  });
                  setEditing(null);
                  setMessage("已保存。这里只记录实际发表，不会替你发送文章。");
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "保存失败");
                } finally {
                  setSaving(false);
                }
              }}
            >
              <label>
                微信文章链接<input
                  name="url"
                  type="url"
                  placeholder="https://mp.weixin.qq.com/s/…"
                  required
                  defaultValue={editing.publication?.url ?? ""}
                />
              </label>
              <label>
                实际发布时间（北京时间）<input
                  name="publishedAt"
                  type="datetime-local"
                  required
                  defaultValue={localDate(editing.publication?.publishedAt)}
                />
              </label>
              <div className="daily-fields">
                {[["reads", "阅读"], ["shares", "分享"], [
                  "follows",
                  "新增关注",
                ]].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      name={key}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="未知留空"
                      defaultValue={editing.publication
                        ?.[key as "reads" | "shares" | "follows"] ?? ""}
                    />
                  </label>
                ))}
              </div>
              <label>
                留言摘要 / 下一篇调整<textarea
                  name="note"
                  rows={3}
                  defaultValue={editing.publication?.note ?? ""}
                />
              </label>
              {message && <p role="alert">{message}</p>}
              <div className="daily-actions">
                <button
                  className="daily-primary"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "保存中…" : "保存记录"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditing(null)}
                >
                  取消
                </button>
              </div>
            </form>
          </section>
        </Modal>
      )}
      <ArtifactPreview
        artifact={preview}
        apiKey={apiKey}
        onClose={() => setPreview(null)}
      />
    </main>
  );
}
