import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("dist-offline");
let html = fs.readFileSync(path.join(dir, "index.html"), "utf8");

html = html.replace(
  /<script([^>]*?)\ssrc="\.\/([^"]+\.js)"([^>]*)><\/script>/g,
  (m, before, file, after) => {
    const js = fs.readFileSync(path.join(dir, file), "utf8");
    const attrs = (before + after).replace("crossorigin", "").trim();
    return `<script ${attrs}>\n${js}\n</script>`;
  },
);

html = html.replace(
  /<link([^>]*?)\shref="\.\/([^"]+\.css)"([^>]*)>/g,
  (m, before, file, after) =>
    `<style>\n${fs.readFileSync(path.join(dir, file), "utf8")}\n</style>`,
);

const workFile = path.join(dir, "work.json");
if (fs.existsSync(workFile)) {
  const workJson = fs.readFileSync(workFile, "utf8").replace(/<\//g, "<\\/");
  const injector = `<script>
window.__WORK_JSON__=${workJson};
(function(){
  var of=window.fetch;
  window.fetch=function(u,o){
    if(/\\/(blank-)?work\\.json(\\?|$)/.test(String(u)))
      return Promise.resolve(new Response(JSON.stringify(window.__WORK_JSON__),{status:200,headers:{"Content-Type":"application/json"}}));
    return of.apply(this,arguments);
  };
})();
</script>`;
  html = html.replace(/(<script[^>]*type="module")/, injector + "\n$1");
}

const iconDir = path.join(dir, "icon-assets");
if (fs.existsSync(iconDir)) {
  const mime = (f) =>
    f.endsWith(".svg")
      ? "image/svg+xml"
      : f.endsWith(".jpg") || f.endsWith(".jpeg")
        ? "image/jpeg"
        : "image/png";
  const icons = {};
  for (const f of fs.readdirSync(iconDir))
    icons[f] =
      `data:${mime(f)};base64,` +
      fs.readFileSync(path.join(iconDir, f)).toString("base64");
  const interceptor = `<script>
window.__ICON_DATA__=${JSON.stringify(icons)};
(function(){
  var d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,"src");
  function fix(v){
    if(typeof v==="string"){var m=v.match(/icon-assets\\/([^?"']+)$/);
      if(m&&window.__ICON_DATA__[m[1]])return window.__ICON_DATA__[m[1]];}
    return v;
  }
  Object.defineProperty(HTMLImageElement.prototype,"src",{
    configurable:true,enumerable:d.enumerable,
    get:d.get,set:function(v){d.set.call(this,fix(v));}
  });
  var sa=HTMLImageElement.prototype.setAttribute;
  HTMLImageElement.prototype.setAttribute=function(k,v){
    if(k==="src")v=fix(v);return sa.call(this,k,v);
  };
})();
</script>`;
  html = html.replace(/(<script[^>]*type="module")/, interceptor + "\n$1");
}

const fav = path.join(dir, "icon.svg");
if (fs.existsSync(fav))
  html = html.replace(
    /href="\.\/icon\.svg"/g,
    `href="data:image/svg+xml;base64,${fs.readFileSync(fav).toString("base64")}"`,
  );

fs.writeFileSync(path.join(dir, "offline.html"), html);
console.log("offline.html", Math.round(html.length / 1024) + "KB");
