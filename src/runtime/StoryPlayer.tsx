import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Phone } from "../Phone";
import { validateWork, type Work } from "../schema";
import "../styles.css";
import "./player.css";
function StoryPlayer() {
  const [work, setWork] = useState<Work | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    // 清掉旧版本留下的 Service Worker 与缓存，避免打开时显示旧作品内容
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((list) => list.forEach((r) => void r.unregister()))
        .catch(() => {});
    }
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => keys.forEach((k) => void caches.delete(k)))
        .catch(() => {});
    }
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    const { signal } = abort;
    const query = new URLSearchParams(location.search);
    const special =
      query.get("preview") === "test"
        ? "./test-work.json"
        : query.get("template") === "blank"
          ? "./blank-work.json"
          : "";
    // 作品文件过大时会被 build 切成多个分片，这里优先按分片读取
    const load = async () => {
      if (!special) {
        const meta = await fetch("./work.parts.json", {
          signal,
          cache: "no-store",
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        if (meta && Number(meta.parts) > 0) {
          // 分片带内容指纹时允许浏览器缓存，避免每次刷新都重下几 MB 剧情数据
          const ver = meta.v ? `?v=${meta.v}` : "";
          const cacheMode: RequestCache = meta.v ? "default" : "no-store";
          const chunks = await Promise.all(
            Array.from({ length: Number(meta.parts) }, (_, i) =>
              fetch(`./work.part${i}.json${ver}`, {
                signal,
                cache: cacheMode,
              }).then((r) => {
                if (!r.ok) throw Error("缺少作品分片，请重新构建");
                return r.text();
              }),
            ),
          );
          return JSON.parse(chunks.join(""));
        }
      }
      const response = await fetch(special || "./work.json", {
        signal,
        cache: "no-store",
      });
      if (!response.ok) throw Error("缺少作品文件，请运行 npm run story:build");
      return response.json();
    };
    load()
      .then((x) => {
        const w = validateWork(x);
        document.title = w.title;
        setWork(w);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(String(e));
      });
    return () => abort.abort();
  }, []);
  return (
    <main className="story-runtime">
      {work ? (
        <Phone work={work} />
      ) : (
        <p role="status">{error || "正在打开手机…"}</p>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<StoryPlayer />);
