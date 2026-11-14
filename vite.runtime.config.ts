import { localIconPlugin } from "./scripts/local-icon-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { rmSync } from "node:fs";
// 模板演示数据（stories/test-preview）每次构建都会写进 public，成品里不需要，直接丢掉
const dropTemplatePreview = {
  name: "drop-template-preview",
  closeBundle() {
    rmSync("dist/test-work.json", { force: true });
  },
};
export default defineConfig(({ command }) => ({
  base: "./",
  optimizeDeps: { entries: ["index.html"] },
  plugins: [
    localIconPlugin(command),
    react(),
    dropTemplatePreview,
    VitePWA({
      registerType: "autoUpdate",
      // 旧版 Service Worker 会把旧作品缓存住，导致打开时看到旧内容；
      // 这里让新 SW 安装后立即注销自己并清空缓存，之后一律走网络。
      selfDestroying: true,
      manifest: {
        name: "捡手机",
        short_name: "捡手机",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      workbox: {
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,svg,json,txt,png,jpg}"],
        // 作品文件体积过大，且在构建末尾会被切片，不纳入预缓存
        globIgnores: ["**/work.json", "**/work.parts.json", "**/work.part*.json"],
        maximumFileSizeToCacheInBytes: 67108864,
      },
    }),
  ],
}));
