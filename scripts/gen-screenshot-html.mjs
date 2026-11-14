import { readFile, writeFile } from "node:fs/promises";

const zuohang = "data:image/jpeg;base64," + (await readFile(process.env.TEMP + "/avatar_zuohang.b64", "utf8")).trim();
const zhu = "data:image/jpeg;base64," + (await readFile(process.env.TEMP + "/avatar_zhuzhixin.b64", "utf8")).trim();

const Z = "朱志鑫";
const L = "左航";

const msgs = [
  ["2026年8月8日 23:45", []],
  [L, "不是说是客人的吗？"],
  [L, "没事，不用跟我解释"],
  [L, "这种事情确实很难开口"],
];

const unsent = "今天他说的那些，你别信。我不是那样的。";

const avatarOf = (name) => (name === Z ? zhu : zuohang);

let body = "";
for (const m of msgs) {
  if (Array.isArray(m[1])) {
    body += `<div class="date">${m[0]}</div>`;
  } else {
    const [name, text] = m;
    const mine = name === Z;
    body += `<div class="row ${mine ? "me" : ""}">
      <img class="av" src="${avatarOf(name)}" />
      <div class="bubble">${text}</div>
    </div>`;
  }
}

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:420px;height:580px;overflow:hidden;background:#ff00ff}
  body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
  .phone{width:420px;height:580px;background:#ededed;display:flex;flex-direction:column}
  .nav{height:64px;background:#ededed;border-bottom:1px solid #d6d6d6;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .nav .title{font-size:17px;font-weight:600;color:#000}
  .nav .back{position:absolute;left:16px;font-size:22px;color:#000}
  .chat{flex:1;padding:16px 12px 0;display:flex;flex-direction:column;gap:14px;overflow:hidden}
  .date{text-align:center;font-size:12px;color:#999;margin:8px 0}
  .row{display:flex;align-items:flex-start;gap:8px}
  .row.me{flex-direction:row-reverse}
  .av{width:40px;height:40px;border-radius:6px;object-fit:cover;background:#ccc}
  .bubble{max-width:260px;padding:10px 12px;border-radius:8px;font-size:15px;line-height:1.4;word-break:break-word;background:#fff;color:#000;position:relative}
  .row.me .bubble{background:#95ec69}
  .composer{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f7f7f7;border-top:1px solid #e0e0e0;flex-shrink:0}
  .input{flex:1;background:#fff;border:1px solid #e0e0e0;border-radius:6px;padding:8px 10px;font-size:15px;color:#000;min-height:36px;display:flex;align-items:center}
  .plus{font-size:24px;color:#666}
</style></head><body>
<div class="phone">
  <div class="nav"><span class="back">‹</span><span class="title">${L}</span></div>
  <div class="chat">${body}</div>
  <div class="composer">
    <div class="input">${unsent}</div>
    <div class="plus">＋</div>
  </div>
</div>
</body></html>`;

await writeFile("scripts/wechat-screenshot.html", html, "utf8");
console.log("html written, bytes:", html.length);
