// 把过大的 work.json 切成多个 <20MB 的分片，供静态托管上传。
// 运行时 StoryPlayer 会优先读取 work.parts.json，再拼接所有分片。
import { readFileSync, writeFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const file = join(dist, "work.json");
if (!existsSync(file)) {
  console.log("split-work: 未找到 dist/work.json，跳过");
  process.exit(0);
}

// 清理上一次的分片
for (const name of readdirSync(dist)) {
  if (/^work\.part\d+\.json$/.test(name) || name === "work.parts.json") {
    rmSync(join(dist, name));
  }
}

const text = readFileSync(file, "utf8");
const CHARS = 4_000_000; // 约 12MB（UTF-8 三字节中文）以内
if (text.length <= CHARS) {
  console.log("split-work: work.json 无需分片");
  process.exit(0);
}

const parts = [];
let i = 0;
while (i < text.length) {
  let end = Math.min(text.length, i + CHARS);
  // 不要在代理对中间切开
  const code = text.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1;
  parts.push(text.slice(i, end));
  i = end;
}
parts.forEach((chunk, n) => writeFileSync(join(dist, `work.part${n}.json`), chunk, "utf8"));
// 带上内容指纹：分片可以被浏览器缓存，内容变了 URL 跟着变，不会读到旧剧情
const v = createHash("sha1").update(text).digest("hex").slice(0, 10);
writeFileSync(join(dist, "work.parts.json"), JSON.stringify({ parts: parts.length, v }), "utf8");
rmSync(file);
console.log(`split-work: 已切成 ${parts.length} 个分片并移除 work.json`);
