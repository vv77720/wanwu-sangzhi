import { useEffect, useRef } from "react";
import type { SkinProps } from "./AppSkins";
import { safeMedia, type Item } from "./schema";
import { useSkinState } from "./skinState";

// ---------- 电流声（彩屏阶段） ----------
// 用模块级单例 AudioContext，避免每次 new 出来被 iOS Safari 挂起。
// 第一次需要在"用户手势同步路径"（比如输完密码点进入、点拨号按钮）上调
// primeBuzzContext() 预 resume 一次，后面就算 setTimeout 里再调也不会被挂起。
// 如果 ctx 被 Safari 挂死超过 30s，playStaticBuzz 里发现 state !== 'running'
// 会自动重建一个新的，旧的就让它 close 掉。
let _buzzCtx: AudioContext | undefined;
let _buzzPrimed = false;

function getBuzzCtx(): AudioContext | undefined {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return undefined;
  // 已经有实例但状态已经挂死 → 丢掉重建
  if (_buzzCtx && _buzzCtx.state !== "closed" && _buzzCtx.state !== "suspended") {
    return _buzzCtx;
  }
  if (_buzzCtx) {
    try { void _buzzCtx.close(); } catch { /* ignore */ }
  }
  _buzzCtx = new Ctx();
  return _buzzCtx;
}

export function primeBuzzContext() {
  const ctx = getBuzzCtx();
  if (!ctx || _buzzPrimed) return;
  // 用户手势同步路径：直接 resume
  try {
    const p = ctx.resume();
    void p;
    _buzzPrimed = true;
  } catch {
    // ignore
  }
}

// 闪屏电流声：白噪声 + 带通 + 抖动 + 低频嗡鸣，合成一段短促的「滋滋」声
// 音量比原来大一倍（0.15 / 0.05），确保手机能听到
export function playStaticBuzz(seconds = 5) {
  const ctx = getBuzzCtx();
  if (!ctx) return () => {};
  // 兜底：如果此时 ctx 还是挂起，就尝试 resume（可能不在用户手势栈里，
  // iOS 会拒绝；但如果 primeBuzzContext 已经调过，这里会立即返回）
  if (ctx.state !== "running") {
    void ctx.resume();
  }

  const now = ctx.currentTime;
  const frames = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2200;
  band.Q.value = 0.7;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.15);

  // 音量快速抖动，模拟电流噼啪
  const lfo = ctx.createOscillator();
  lfo.type = "square";
  lfo.frequency.value = 23;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.05;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);

  // 电流底噪
  const hum = ctx.createOscillator();
  hum.type = "sawtooth";
  hum.frequency.value = 50;
  const humGain = ctx.createGain();
  humGain.gain.setValueAtTime(0.05, now);

  noise.connect(band);
  band.connect(gain);
  gain.connect(ctx.destination);
  hum.connect(humGain);
  humGain.connect(ctx.destination);

  noise.start(now);
  hum.start(now);
  lfo.start(now);

  // 收尾淡出
  gain.gain.setValueAtTime(0.15, now + Math.max(0, seconds - 0.6));
  gain.gain.linearRampToValueAtTime(0, now + seconds);
  humGain.gain.setValueAtTime(0.05, now + Math.max(0, seconds - 0.6));
  humGain.gain.linearRampToValueAtTime(0, now + seconds);

  const timer = window.setTimeout(
    () => {
      try {
        noise.stop();
        hum.stop();
        lfo.stop();
      } catch {
        // 已停止
      }
    },
    seconds * 1000 + 100,
  );
  return () => {
    window.clearTimeout(timer);
    try {
      noise.stop();
      hum.stop();
      lfo.stop();
    } catch {
      // 已停止
    }
  };
}

export function useTrack(
  p: SkinProps,
  items: Item[],
): [Item | null, (item: Item | null) => void] {
  const [id, setId] = useSkinState<string>(p, "track", "");
  return [
    items.find((i) => i.id === id) ?? null,
    (item) => {
      setId(item?.id ?? "");
      if (item) p.onRead(item.id);
    },
  ];
}
export function AudioPlayer({ p, item }: { p: SkinProps; item: Item }) {
  const last = useRef(-1);
  const element = useRef<HTMLAudioElement>(null);
  const key = `audio-${item.id}`,
    saved = p.ui?.[key];
  const commit = (time: number, force = false) => {
    if (!p.onUi || !Number.isFinite(time)) return;
    if (force || Math.abs(time - last.current) >= 5) {
      last.current = time;
      p.onUi(key, time);
    }
  };
  useEffect(() => {
    const audio = element.current;
    if (
      !audio ||
      typeof saved !== "number" ||
      !Number.isFinite(saved) ||
      saved <= 0
    )
      return;
    const restore = () => {
      if (audio.readyState < 1) return;
      last.current = saved;
      audio.currentTime = Math.min(
        saved,
        Number.isFinite(audio.duration) ? audio.duration : saved,
      );
    };
    restore();
    audio.addEventListener("loadedmetadata", restore, { once: true });
    return () => audio.removeEventListener("loadedmetadata", restore);
  }, [item.id]);
  return (
    <audio
      ref={element}
      controls
      src={safeMedia(item.media)}
      aria-label={`播放${item.title}`}
      onTimeUpdate={(e) => {
        if (e.currentTarget.isConnected) commit(e.currentTarget.currentTime);
      }}
      onPause={(e) => {
        if (e.currentTarget.isConnected)
          commit(e.currentTarget.currentTime, true);
      }}
      onEnded={(e) => commit(e.currentTarget.currentTime, true)}
    />
  );
}
