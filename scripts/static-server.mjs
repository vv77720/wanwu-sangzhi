import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" };
const root = process.cwd();
const server = createServer(async (req, res) => {
  let url = req.url.split("?")[0];
  if (url === "/") url = "/wechat-screenshot.html";
  try {
    const data = await readFile(join(root, "scripts", url));
    res.writeHead(200, { "Content-Type": types[extname(url)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});
server.listen(8765, "127.0.0.1", () => console.log("http://127.0.0.1:8765"));
