import { dirname, join, resolve } from "node:path";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { initializeAppConfig } from "@src/utils/config/app-config.ts";
import { createLocalArticleRuntimeStores } from "@src/app/weixin-article/local-runtime-stores.ts";

interface DeliveryInput {
  id: string;
  accountId: string;
  title: string;
  digest: string;
  article: string;
  brief: string;
  cover: string;
  coverPrompt: string;
  reviewed: boolean;
}

export function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

// Deliberately limited publication format: H2 and paragraphs. Raw HTML is escaped.
export function renderBody(markdown: string, title: string): string {
  const lines = markdown.trim().split("\n");
  if (lines.shift() !== `# ${title}`) throw new Error("标题与终稿不一致");
  return lines.join("\n").trim().split(/\n\s*\n/).map((part) => {
    const text = escapeHtml(part.trim());
    if (text === "---") return "<hr>";
    if (text.startsWith("## ")) {
      return `<h2 style="font-size:20px;line-height:1.6;color:#285a42;margin:32px 0 18px">${
        text.slice(3)
      }</h2>`;
    }
    return `<p style="font-size:16px;line-height:1.95;color:#303831;margin:0 0 20px">${text}</p>`;
  }).join("\n");
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(
    new Uint8Array(digest),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}

export async function deliver(inputPath: string, exportRoot: string) {
  const input: DeliveryInput = JSON.parse(await Deno.readTextFile(inputPath));
  if (!/^[a-z0-9-]+$/.test(input.id) || !/^[a-z0-9-]+$/.test(input.accountId)) {
    throw new Error("非法内容或账号 ID");
  }
  if (input.reviewed !== true || !input.digest || !input.coverPrompt) {
    throw new Error("交付前必须提供摘要、配图提示词及审稿确认");
  }
  const base = dirname(resolve(inputPath));
  const markdown = await Deno.readTextFile(resolve(base, input.article));
  const brief = await Deno.readTextFile(resolve(base, input.brief));
  const cover = await Deno.readFile(resolve(base, input.cover));
  if (brief.trim().length < 100) throw new Error("缺少选题依据和审稿记录");
  if (
    cover.length < 8 ||
    ![137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => cover[i] === x)
  ) {
    throw new Error("封面必须是有效 PNG");
  }
  const body = renderBody(markdown, input.title);
  const output = resolve(exportRoot, input.id);
  // Never overwrite a previously delivered package. Reruns need a new version ID.
  await Deno.mkdir(resolve(exportRoot), { recursive: true });
  await Deno.mkdir(output);
  const title = escapeHtml(input.title);
  const html =
    `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · ByterLife</title><style>body{font-family:system-ui;background:#f6f4ed;margin:0;color:#244833}main{max-width:740px;margin:32px auto;padding:0 20px}h1{font-size:28px;line-height:1.5}img{width:100%;border-radius:12px}aside{padding:18px;background:#ebece1;line-height:1.8;margin:24px 0}article{padding:28px;background:white;border-radius:12px}button{background:#285a42;color:white;padding:12px;border:0;border-radius:6px}</style><main><small>BYTERLIFE · 待用户发布</small><h1>${title}</h1><img alt="两人共同安排家庭事务的原创插画" src="data:image/png;base64,${
      encodeBase64(cover)
    }"><aside>摘要：${
      escapeHtml(input.digest)
    }<p>封面单独上传，标题和摘要单独填写。点击选中正文后复制，粘贴到公众号编辑器并手机预览。</p><button onclick="const r=document.createRange();r.selectNodeContents(document.getElementById('body'));const s=getSelection();s.removeAllRanges();s.addRange(r)">选中正文</button></aside><article id="body">${body}</article></main></html>`;
  const instructions =
    `# 发布说明\n\n标题：${input.title}\n\n摘要：${input.digest}\n\n作者：ByterLife\n\n状态：待用户发布。\n\n1. 上传 cover.png 作为封面，居中裁切并预览。\n2. 打开 preview.html，点击选中正文并复制到公众号编辑器。\n3. 填入标题、摘要；手机预览确认段落、研究参考及封面显示。\n4. 用户自行发表，实际链接与时间回填后才标记为已发布。\n\n正文源文件 article.md；body.html 仅正文；brief.md 为选题及审稿依据；manifest.json 为文件校验记录。\n\n写作、选题与审稿由 Codex 完成，封面由内置 imagegen 生成；打包不调用模型、微信或自动调度。\n`;
  const files: Record<string, Uint8Array> = {
    "article.md": new TextEncoder().encode(markdown),
    "brief.md": new TextEncoder().encode(brief),
    "cover.png": cover,
    "body.html": new TextEncoder().encode(body),
    "preview.html": new TextEncoder().encode(html),
    "publish.md": new TextEncoder().encode(instructions),
  };
  const checksums: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(files)) {
    await Deno.writeFile(join(output, name), bytes);
    checksums[name] = await sha256(bytes);
  }
  const manifest = {
    id: input.id,
    accountId: input.accountId,
    title: input.title,
    digest: input.digest,
    status: "ready",
    publishedAt: null,
    url: null,
    createdAt: new Date().toISOString(),
    production: {
      writer: "Codex",
      reviewer: "Codex editorial review",
      cover: "built-in imagegen",
      coverPrompt: input.coverPrompt,
    },
    checksums,
  };
  files["manifest.json"] = new TextEncoder().encode(
    JSON.stringify(manifest, null, 2),
  );
  await Deno.writeFile(join(output, "manifest.json"), files["manifest.json"]);
  const zipped = await new Deno.Command("zip", {
    cwd: output,
    args: ["-q", "delivery.zip", ...Object.keys(files)],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!zipped.success) throw new Error("发布包压缩失败：需要系统 zip 命令");
  files["delivery.zip"] = await Deno.readFile(join(output, "delivery.zip"));

  const config = await initializeAppConfig();
  const { artifactStore, runStateStore } = createLocalArticleRuntimeStores(
    config,
  );
  const runId = `delivery-${input.id}`;
  await runStateStore.startRun({
    runId,
    accountId: input.accountId,
    mode: "local",
    dryRun: true,
    trigger: "manual",
  });
  try {
    await runStateStore.startStep(runId, "检查并归档 Codex 成品");
    const refs = [];
    const labels: Record<string, string> = {
      "preview.html": "成稿预览",
      "body.html": "公众号正文",
      "cover.png": "原创封面",
      "delivery.zip": "完整发布包",
      "brief.md": "选题与审稿记录",
    };
    for (const [name, bytes] of Object.entries(files)) {
      const contentType = name.endsWith(".png")
        ? "image/png"
        : name.endsWith(".zip")
        ? "application/zip"
        : name.endsWith(".html")
        ? "text/html; charset=utf-8"
        : name.endsWith(".json")
        ? "application/json"
        : "text/markdown; charset=utf-8";
      refs.push(
        await artifactStore.putBytes(`runs/${runId}/${name}`, bytes, {
          contentType,
          label: labels[name] ?? name,
        }),
      );
    }
    await runStateStore.finishStep(runId, "检查并归档 Codex 成品", {
      outputArtifacts: refs,
    });
    await runStateStore.finishRun(runId, {
      summary:
        `已导出：${input.title}。Codex 选题/写作/审稿 + imagegen 配图；待用户发布，未调用微信。`,
    });
    console.log(
      JSON.stringify({
        runId,
        output,
        files: Object.keys(files),
        status: "ready",
        published: false,
      }),
    );
  } catch (error) {
    await runStateStore.failRun(
      runId,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

if (import.meta.main) {
  const [input, output] = Deno.args;
  if (!input || !output) {
    throw new Error(
      "用法：deno run -A scripts/deliver.byterlife.ts <input.json> <export-root>",
    );
  }
  await deliver(resolve(input), resolve(output));
}
