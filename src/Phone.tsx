import { StatusGlyph } from "./ios/StatusGlyph";
import { SocialDetail, socialDetailApps } from "./skins/SocialDetails";
import { NativeCalculator } from "./ios/Calculator";
import { HomeLauncher } from "./launcher/HomeLauncher";
import { useDeviceLayout } from "./launcher/layout";
import "./launcher/launcher.css";
import { NativeDetail, nativeDetailApps } from "./ios/Details";
import "./ios/details.css";
import {
  SystemNotifications,
  notificationContent,
} from "./SystemNotifications";
import {
  readLauncherOrigin,
  AppWindow,
  screenOrigin,
} from "./vendor/ios-web/Launcher";
import {
  DeviceLock,
  ControlCenter,
  DeviceKeyboard,
  KeyboardContext,
  NativeSettings,
} from "./DeviceSystem";
import DustWipe from "./DustWipe";
import { playStaticBuzz, primeBuzzContext } from "./audio";
import ModeFlow from "./ModeFlow";
import { AppArtwork, hasNativeArtwork } from "./AppArtwork";
import { getFields } from "./fields";
import { catalogSkins } from "./skins/catalog";
import "./skins/skins.css";
import "./ios18.css";
import "./device-system.css";
import "./ios/tokens.css";
import "./ios/reference.css";
import "./ios/status-bar.css";
import { WeChatSkin, WhatsAppSkin, type StoryTip } from "./AppSkins";
import { STAGE6_MEME } from "./meme";
import { NUTCRACKER_BGM } from "./bgm";
import { RichText } from "./RichText";
import {
  useEffect,
  useState,
  useRef,
  useCallback,
  Suspense,
  type CSSProperties,
} from "react";
import { AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  Plus,
  Search,
  LockKeyhole,
  Sparkles,
  Heart,
  MessageCircle,
  MoreHorizontal,
  ArrowUp,
  Folder,
  ThumbsUp,
  Phone as PhoneIcon,
} from "lucide-react";
import { getApp, type AppPlugin } from "./registry";
import {
  initialRuntime,
  safeMedia,
  type Work,
  type Item,
  type Runtime,
  type UiValue,
} from "./schema";
import { dispatch, choose, visible, advance } from "./engine";
import { db } from "./persistence";

const HIDDEN_PHOTO_ID = "ph-hidden-cake";
// 开场需要翻看的几个 App：看完后触发左航「真走了？」弹窗
const EARLY_APPS = ["twitter", "weather", "notes", "photos", "camera"];
const BGM_TRACKS = {
  nutcracker: NUTCRACKER_BGM,
  clear: "/audio/qingxingmeng.mp4",
  trauma: "/audio/jingshenchuangshang.mp4",
  felicity: "/audio/felicity.mp4",
};
type BgmTrack = keyof typeof BGM_TRACKS;

type ForumFloor = {
  n: number;
  op?: boolean;
  user?: string;
  avatar?: string;
  quote?: { n: number; text: string };
  text: string;
  likes?: number;
};

function parseFloors(comments: string[]): ForumFloor[] | null {
  if (!comments.length || !comments[0].startsWith("{")) return null;
  try {
    return comments.map((c) => JSON.parse(c) as ForumFloor);
  } catch {
    return null;
  }
}

export function AppIcon({
  id,
  name,
  small = false,
  custom = "",
  date,
  time,
  locked = false,
}: {
  id: string;
  name?: string;
  small?: boolean;
  custom?: string;
  date?: string;
  time?: string;
  locked?: boolean;
}) {
  const a = getApp(id);
  const Icon = a.icon;
  return (
    <span
      className={`app-icon-wrap ${small ? "small" : ""}${locked ? " locked" : ""}`}
    >
      <span className="app-icon" style={{ background: a.color }}>
        {custom ? (
          safeMedia(custom) ? (
            <img src={safeMedia(custom)} alt="自定义图标" />
          ) : (
            <span>{custom.slice(0, 2)}</span>
          )
        ) : hasNativeArtwork(id) ? (
          <AppArtwork id={id} date={date} time={time} />
        ) : (
          <Icon size={small ? 21 : 28} strokeWidth={1.65} />
        )}
      </span>
      {name && <span className="app-name">{name}</span>}
    </span>
  );
}
type PhoneProps = Omit<Parameters<typeof PhoneRuntime>[0], "deviceLayout">;
export function Phone(props: PhoneProps) {
  const deviceLayout = useDeviceLayout(props.work, props.creator);
  return (
    <PhoneRuntime
      {...props}
      work={deviceLayout.work}
      deviceLayout={deviceLayout}
    />
  );
}
function PhoneRuntime({
  deviceLayout,
  work,
  creator = false,
  onEdit,
  onAdd,
  onSettings,
  onOpen,
  runtime: external,
  onRuntime,
}: {
  deviceLayout: ReturnType<typeof useDeviceLayout>;
  work: Work;
  creator?: boolean;
  onEdit?: (app: string, item: Item) => void;
  onAdd?: (app: string) => void;
  onSettings?: () => void;
  onOpen?: (app: string) => void;
  runtime?: Runtime;
  onRuntime?: (s: Runtime) => void;
}) {
  const [app, setApp] = useState("");
  const [homeRequest, setHomeRequest] = useState(0);
  const [locked, setLocked] = useState(!creator);
  const [dustWiped, setDustWiped] = useState(false);
  const [battery, setBattery] = useState(work.phone.battery);
  const [charging, setCharging] = useState(false);
  const batteryExact = useRef(work.phone.battery);
  const [modeFlowDone, setModeFlowDone] = useState(() => {
    try {
      return localStorage.getItem(`fp-mode-done:${work.id}`) === "1";
    } catch {
      return false;
    }
  });
  const markModeFlowDone = useCallback(
    (v: boolean) => {
      setModeFlowDone(v);
      try {
        if (v) localStorage.setItem(`fp-mode-done:${work.id}`, "1");
        else localStorage.removeItem(`fp-mode-done:${work.id}`);
      } catch {}
    },
    [work.id],
  );

  // BGM 开关（localStorage 持久化）
  const [bgmOn, setBgmOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem("fp-bgm") !== "off";
    } catch {
      return true;
    }
  });
  const [bgmReady, setBgmReady] = useState(false);
  // 每个 BGM track 一个独立的 Audio 元素，全部预加载好，切换时直接 pause/play，零延迟
  const bgmAudiosRef = useRef<Partial<Record<BgmTrack, HTMLAudioElement>>>({});
  // 首次用户交互激活播放（绕过浏览器自动播放策略）
  const bgmBootedRef = useRef(false);
  useEffect(() => {
    // 为每首曲目创建独立 Audio 并预加载
    (Object.keys(BGM_TRACKS) as BgmTrack[]).forEach((key) => {
      const a = new Audio();
      a.src = BGM_TRACKS[key];
      // 不预下载整首：4 首全预载会白白吃掉十几 MB 流量，
      // 只有真正被播放的曲目才继续加载（站点的每日流量配额很小）。
      a.preload = "none";
      a.loop = true;
      a.volume = 0.35;
      bgmAudiosRef.current[key] = a;
    });
    const boot = () => {
      if (bgmBootedRef.current) return;
      bgmBootedRef.current = true;
      document.removeEventListener("pointerdown", boot);
      setBgmReady(true);
      // iOS Safari 限制：每个 <audio> 必须在用户手势里 play 过一次，
      // 之后才能在 setTimeout/回调里自动 play。
      // 这里把所有曲目都激活一遍（play 后立即 pause），保证后续 switchBgm 能无缝切。
      const audios = bgmAudiosRef.current;
      for (const a of Object.values(audios)) {
        if (!a) continue;
        a.volume = 0;
        void a
          .play()
          .then(() => {
            a.pause();
            a.currentTime = 0;
            a.volume = 0.35;
          })
          .catch(() => {
            a.volume = 0.35;
          });
      }
      // 首次交互后立即播放当前 BGM（默认 nutcracker），擦屏幕阶段就能听到
      if (bgmOn) {
        const target = audios[bgmTrack.current];
        if (target) {
          target.volume = 0.35;
          void target.play().catch(() => {});
        }
      }
    };
    document.addEventListener("pointerdown", boot);
    return () => {
      document.removeEventListener("pointerdown", boot);
      for (const a of Object.values(bgmAudiosRef.current)) {
        a?.pause();
        a.src = "";
      }
      bgmAudiosRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("fp-bgm", bgmOn ? "on" : "off");
    } catch {}
    if (!bgmReady) return;
    const audios = bgmAudiosRef.current;
    if (bgmOn) {
      // 打开 BGM：播放当前记录的 track
      const target = audios[bgmTrack.current];
      if (target) void target.play().catch(() => {});
    } else {
      // 关闭 BGM：暂停所有
      for (const a of Object.values(audios)) a?.pause();
    }
  }, [bgmOn, bgmReady]);
  const toggleBgm = () => {
    primeBuzzContext(); // 用户手势路径，顺便把电流声 ctx 预 resume 好
    setBgmOn((v) => !v);
  };
  // 页面首次任何用户交互都把电流声 ctx resume 一下 —— 兜底，
  // 避免彩屏那段 setTimeout 触发 playStaticBuzz 时 iOS Safari 把 ctx 挂着
  useEffect(() => {
    const prime = () => primeBuzzContext();
    window.addEventListener("pointerdown", prime, { once: true, passive: true });
    window.addEventListener("touchstart", prime, { once: true, passive: true });
    window.addEventListener("click", prime, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("touchstart", prime);
      window.removeEventListener("click", prime);
    };
  }, []);
  // 剧情 BGM 切换：胡桃夹子 → 清醒梦 → 精神创伤 → felicity
  const bgmOnRef = useRef(bgmOn);
  bgmOnRef.current = bgmOn;
  const bgmTrack = useRef<BgmTrack>("nutcracker");
  const switchBgm = useCallback((track: BgmTrack) => {
    const audios = bgmAudiosRef.current;
    if (!bgmOnRef.current) {
      // BGM 关着，只记录目标 track，等用户打开时直接播这首
      bgmTrack.current = track;
      return;
    }
    const target = audios[track];
    if (!target) return;
    // 同一首：确保在播放就行
    if (bgmTrack.current === track) {
      if (target.paused) void target.play().catch(() => {});
      return;
    }
    // 不同曲目：暂停当前，播放目标
    const prev = audios[bgmTrack.current];
    if (prev) {
      prev.pause();
      prev.currentTime = 0;
    }
    bgmTrack.current = track;
    target.currentTime = 0;
    // 没缓冲过的曲目先触发加载，再播放
    if (target.readyState === 0) target.load();
    void target.play().catch(() => {});
  }, []);

  const handleBattery = useCallback((v: number) => {
    batteryExact.current = v;
    setBattery(Math.ceil(v));
  }, []);

  useEffect(() => {
    if (!charging) return;
    const id = setInterval(() => {
      const next = Math.min(100, batteryExact.current + 86 / (90 * 60));
      batteryExact.current = next;
      setBattery(Math.floor(next));
    }, 1000);
    return () => clearInterval(id);
  }, [charging]);
  const [pinOpen, setPinOpen] = useState(false);
  const [quickCamera, setQuickCamera] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [kbdDraft, setKbdDraft] = useState<{
    text: string;
    speed?: number;
    letters?: string[];
    id: number;
  } | null>(null);
  const openKeyboard = useCallback(
    (
      open: boolean,
      draft?: { text: string; speed?: number; letters?: string[] },
    ) => {
      setKeyboard(open);
      setKbdDraft(open && draft ? { ...draft, id: Date.now() } : null);
    },
    [],
  );
  const [recent, setRecent] = useState<string[]>([]);
  const appSnapshots = useRef(new Map<string, HTMLElement>());
  const [banner, setBanner] = useState("");
  const [bannerQueue, setBannerQueue] = useState<string[]>([]);
  // Stage5 的 5 条微信通知弹完后，屏幕中央提示玩家往上翻聊天记录
  const pendingUpTip = useRef(false);
  const [storyTip, setStoryTip] = useState<StoryTip | "">("");
  // 剧情弹窗队列：hold 自动消失；choices 等玩家点选；onDone 在队列播完后执行
  const tipQueue = useRef<StoryTip[]>([]);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tipDone = useRef<(() => void) | undefined>(undefined);
  const advanceTip = useCallback(() => {
    const next = tipQueue.current.shift();
    if (next) {
      setStoryTip(next);
      const hold = next.hold ?? (next.choices?.length ? 0 : 4000);
      if (hold) tipTimer.current = setTimeout(advanceTipRef.current, hold);
      return;
    }
    setStoryTip("");
    const done = tipDone.current;
    tipDone.current = undefined;
    done?.();
  }, []);
  const advanceTipRef = useRef(advanceTip);
  advanceTipRef.current = advanceTip;
  const displayTip = useCallback((tip: StoryTip) => {
    clearTimeout(tipTimer.current);
    setStoryTip(tip);
    // 没有选项的提示自动消失，不再需要点「知道了」
    const hold = tip.hold ?? (tip.choices?.length ? 0 : 4000);
    if (hold) tipTimer.current = setTimeout(advanceTipRef.current, hold);
  }, []);
  const dismissTip = useCallback(() => {
    clearTimeout(tipTimer.current);
    tipQueue.current = [];
    tipDone.current = undefined;
    setStoryTip("");
  }, []);
  const setTip = useCallback(
    (v: string | StoryTip) => {
      tipQueue.current = [];
      tipDone.current = undefined;
      displayTip(typeof v === "string" ? { text: v } : v);
    },
    [displayTip],
  );
  const runTips = useCallback(
    (tips: StoryTip[], onDone?: () => void) => {
      tipDone.current = onDone;
      const [first, ...rest] = tips;
      tipQueue.current = rest;
      if (first) displayTip(first);
      else advanceTipRef.current();
    },
    [displayTip],
  );
  const pickTip = useCallback((c: { label: string; onPick: () => void }) => {
    clearTimeout(tipTimer.current);
    tipQueue.current = [];
    tipDone.current = undefined;
    setStoryTip("");
    c.onPick();
  }, []);
  const notify = useCallback(
    (texts: string[]) => setBannerQueue((q) => [...q, ...texts]),
    [],
  );
  const pendingThread = useRef("");
  const noticesSeen = useRef(0);
  const appRef = useRef(app);
  appRef.current = app;
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [contextApp, setContextApp] = useState("");
  const [lockedHint, setLockedHint] = useState("");
  const [unlockNotice, setUnlockNotice] = useState("");
  const noticeFromApp = useRef(false);
  const [deviceScale, setDeviceScale] = useState(0.84);
  const shell = useRef<HTMLDivElement>(null);
  const gesture = useRef({ x: 0, y: 0, time: 0, zone: "" });
  const [launchOrigin, setLaunchOrigin] = useState(screenOrigin);

  const beginUnlock = () => {
    setPinError("");
    setQuickCamera(false);
    if (work.phone.passcode) setPinOpen(true);
    else unlock();
  };
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const gestureConsumed = useRef(false);
  const [pinError, setPinError] = useState("");
  const [folder, setFolder] = useState("");
  const [panel, setPanel] = useState("");
  const freshRuntime = () => initialRuntime(work);
  const [own, setOwn] = useState(() => freshRuntime());
  const [ready, setReady] = useState(creator || !!external);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    const el = shell.current;
    if (!el) return;
    const fit = () => {
      setDeviceScale(
        Math.max(
          0.4,
          Math.min(
            1,
            (el.parentElement!.clientWidth - 24) / 407,
            (window.innerHeight - (creator ? 170 : external ? 150 : 40)) / 866,
          ),
        ),
      );
    };
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement!);
    window.addEventListener("resize", fit);
    fit();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [creator, ready]);
  const s = external ?? own;
  const runtimeRef = useRef(s);
  runtimeRef.current = s;
  const update = (next: Runtime) => {
    runtimeRef.current = next;
    setOwn(next);
    onRuntime?.(next);
  };
  const updateRef = useRef(update);
  updateRef.current = update;
  // 左航那段互动对话结束后：
  // 1) 主屏幕壁纸换成新的
  // 2) 解锁所有"结局揭示"的聊天记录（5 个新会话 + 群聊）
  // 3) 左航的微信备注改成「小航」
  const finishStage5 = useCallback(() => {
    const cur = runtimeRef.current;
    if (cur.variables["homeWallpaperNew"] === true) return;
    // 5 条微信通知播完后，顶部通知结束再接一条居中提示
    pendingUpTip.current = true;
    updateRef.current({
      ...cur,
      variables: {
        ...cur.variables,
        homeWallpaperNew: true,
        wxRevealEnding: true,
        wxLeftangNew: true,
        wechatTruthUnlocked: true,
        wxLeftangRemark: true,
      },
    });
  }, []);

  // ---- Stage 6：第二段弹窗【左航：想起来没？】→ 对话 → 弹窗 → 拨号 → 短信 → 结局 ----
  // 看完隐藏相簿与隐藏备忘录后触发，并开始播放 felicity
  useEffect(() => {
    if (creator || external || !ready) return;
    const cur = runtimeRef.current;
    if (cur.variables["wxStage6"] === true) return;
    if (cur.variables.memoRevealed !== true) return;
    if (cur.ui?.photos?.revealSeen !== true) return;
    if (!s.read.includes("note-6")) return;
    updateRef.current({
      ...cur,
      variables: { ...cur.variables, wxStage6: true },
    });
    notify(["微信：左航：想起来没？"]);
    switchBgm("felicity");
  }, [
    app,
    s.read,
    s.variables,
    s.ui,
    ready,
    creator,
    external,
    notify,
    switchBgm,
  ]);

  // Stage6 对话放完：等 2 秒 → 三个弹窗（间隔 1.5s）→【还吧】→ 再三弹 → 自动拨 11
  const startStage6Dial = useCallback(() => {
    const cur = runtimeRef.current;
    updateRef.current({
      ...cur,
      ui: { ...cur.ui, phone: { ...cur.ui?.phone, stage6Dial: true } },
    });
    setApp("phone");
  }, []);
  // Stage6 对话放完后的弹窗序列：【我居然感到一丝甜蜜】→【还吧】→…→自动拨 11
  const showStage6Tips = useCallback(() => {
    switchBgm("nutcracker");
    runTips(
      [
        { text: "你：我居然感到一丝甜蜜", hold: 1500, inline: true },
        {
          text: "你：但是不管怎么样囚禁人是不对的吧？！",
          hold: 1500,
          inline: true,
        },
        {
          text: "你：要不要把手机还给他们啊？",
          inline: true,
          choices: [
            {
              label: "还吧",
              onPick: () =>
                runTips(
                  [
                    {
                      text: "你：但是莫名不太想直接和这两个人联系呢……",
                      hold: 1500,
                      inline: true,
                    },
                    {
                      text: "你：要不还是找警察吧 ",
                      hold: 1500,
                      inline: true,
                    },
                    {
                      text: "你：我是被这几个人传染了吗遇事不决就报警",
                      hold: 1500,
                      inline: true,
                    },
                  ],
                  startStage6Dial,
                ),
            },
          ],
        },
      ],
    );
  }, [runTips, startStage6Dial]);
  const finishStage6Dialogue = useCallback(() => {
    const cur = runtimeRef.current;
    if (cur.ui?.wechat?.stage6Done === true) return;
    updateRef.current({
      ...cur,
      ui: { ...cur.ui, wechat: { ...cur.ui?.wechat, stage6Done: true } },
    });
    window.setTimeout(showStage6Tips, 2000);
  }, [showStage6Tips]);

  // 拨完 11：卡顿一下 → 柔和彩屏 5 秒（缓慢渐变，无频闪）→ 弹到短信 ？？？
  const [stage6Color, setStage6Color] = useState(false);
  const stage6ColorFired = useRef(false);
  const stage6ColorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const stopBuzz = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (
      creator ||
      s.ui?.phone?.stage6Dial !== "done" ||
      stage6ColorFired.current
    )
      return;
    stage6ColorFired.current = true;
    const t1 = window.setTimeout(() => {
      setStage6Color(true);
      stopBuzz.current = playStaticBuzz(5);
      stage6ColorTimer.current = window.setTimeout(() => {
        stopBuzz.current?.();
        setStage6Color(false);
        // 短信"你好"弹出的那一刻，强制让胡桃夹子 BGM 跟上
        // （彩屏 5s 期间 audio 可能悄悄被 paused，switchBgm 现在会检测到并补 play）
        switchBgm("nutcracker");
        const cur = runtimeRef.current;
        updateRef.current({
          ...cur,
          variables: { ...cur.variables, wxStage6Sms: true },
          ui: {
            ...cur.ui,
            phone: { ...cur.ui?.phone, stage6Dial: "closed" },
            messages: { ...cur.ui?.messages, stage6Sms: "run" },
          },
        });
        pendingThread.current = "？？？";
        setApp("messages");
      }, 5000);
    }, 900);
    return () => window.clearTimeout(t1);
  }, [creator, s.ui?.phone?.stage6Dial]);

  // 短信放完：三连弹窗（间隔 3s，含表情包）→ 三个结局选项
  const [stageEnd, setStageEnd] = useState("");
  const stage6Ending = useCallback(
    (kind: "sale" | "bury" | "spread") => {
      const cfg = {
        sale: {
          text: "卖了二手之后你可以小赚一笔，倒是能美美吃一顿了。",
          hold: 4000,
          end: "故事已结束，现在你可以自由查看手机的其他内容",
        },
        bury: {
          text: "从哪来的回哪去吧，不知道下一个看见这个手机的倒霉蛋是谁。",
          hold: 5000,
          end: "故事已结束，现在你可以自由查看手机的其他内容",
        },
        spread: {
          text: "你决定无视这对坏心情侣的威胁，狠狠截图一番，势必让他们的聊天记录传遍大江南北。",
          hold: 7000,
          end: "故事已结束，你现在可以肆意观看这部手机的所有内容，反正你也不打算理会他们说的。",
        },
      }[kind];
      runTips([{ text: cfg.text, hold: cfg.hold }], () => {
        setStageEnd(cfg.end);
        switchBgm("felicity");
      });
    },
    [runTips, switchBgm],
  );
  const finishStage6Sms = useCallback(() => {
    runTips(
      [
        { text: "你：……", hold: 3000, inline: true },
        { image: STAGE6_MEME, hold: 3000, inline: true },
        { text: "你：我貌似被这两个人当套使了。", hold: 3000, inline: true },
      ],
      () =>
        runTips([
          {
            text: "你对这对情侣感到很闹麻，于是你决定：",
            inline: true,
            choices: [
              {
                label: "把手机出二手小赚一笔",
                onPick: () => stage6Ending("sale"),
              },
              {
                label: "丢回地里，等下一个被迫害的人",
                onPick: () => stage6Ending("bury"),
              },
              {
                label: "这么肥美的聊天记录，当然是传播出去",
                onPick: () => stage6Ending("spread"),
              },
            ],
          },
        ]),
    );
  }, [runTips, stage6Ending]);
  // 结局黑幕：玩家触屏后弹回主屏幕，自由操控
  const closeStageEnd = useCallback(() => {
    setStageEnd("");
    const cur = runtimeRef.current;
    updateRef.current({
      ...cur,
      ui: { ...cur.ui, messages: { ...cur.ui?.messages, stage6Sms: "end" } },
      variables: {
        ...cur.variables,
        ...fullUnlocks(),
        stage6Done: true,
      },
    });
    switchBgm("felicity");
    setApp("");
    setKeyboard(false);
    setPanel("");
  }, [fullUnlocks, switchBgm]);
  useEffect(() => {
    let active = true;
    if (creator || external) return;
    void db.saves
      .get(work.id)
      .then((saved) => {
        if (!active) return;
        if (saved && saved.state.revision === work.updatedAt) {
          setOwn({
            ...saved.state,
            variables: { ...work.variables, ...saved.state.variables },
          });
          // 有存档：跳过擦屏幕，直接到密码界面
          setDustWiped(true);
          setLocked(true);
        } else {
          setOwn(dispatch(work, freshRuntime(), "start"));
          if (saved) setLoadError("作品已更新，已开始新的进度。");
        }
        setReady(true);
      })
      .catch(() => {
        setOwn(dispatch(work, freshRuntime(), "start"));
        setLoadError("无法读取本地存档。本次仍可游玩。");
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [work.id, work.updatedAt, creator, external]);
  const showNotice = (text: string) => {
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => {
      noticeFromApp.current = !!appRef.current;
      setUnlockNotice(text);
    }, 3000);
  };
  // 开场：翻完 X、天气、备忘录、相册、相机，并手动打开左航的旧聊天后，弹出左航消息
  useEffect(() => {
    if (creator || external || !ready) return;
    const current = runtimeRef.current;
    if (current.variables["stage4Ready"] === true) return;
    if (!EARLY_APPS.every((id) => current.visited.includes(id))) return;
    // 左航旧聊天必须由玩家手动点开查看（read 里有 "左航"）
    if (!current.read.includes("左航")) return;
    update({
      ...current,
      variables: { ...current.variables, stage4Ready: true },
    });
  }, [s.read, s.visited, s.variables, ready, creator, external, work]);
  // 切到微信后直接进入左航的新消息，并播放精神创伤
  useEffect(() => {
    if (creator || external || !ready) return;
    const current = runtimeRef.current;
    if (current.variables["stage4Ready"] !== true) return;
    if (current.variables["stage4Started"] === true) return;
    if (app !== "wechat") return;
    update({
      ...current,
      variables: {
        ...current.variables,
        stage4Started: true,
        wxLeftangNew: true,
      },
    });
    switchBgm("trauma");
  }, [app, s.variables, ready, creator, external, switchBgm]);
  // 旧存档兜底：直接补上左航的新对话
  useEffect(() => {
    if (creator || external || !ready) return;
    const current = runtimeRef.current;
    if (current.variables["stage4Started"] !== true) return;
    if (current.variables["wxLeftangNew"] === true) return;
    update({
      ...current,
      variables: { ...current.variables, wxLeftangNew: true },
    });
  }, [s.variables.stage4Started, s.variables.wxLeftangNew, ready, creator, external]);
  // 玩家打开相册查看隐藏相簿后，标记一下，用于触发第二段弹窗
  useEffect(() => {
    if (creator || external || !ready) return;
    const current = runtimeRef.current;
    if (current.variables.hiddenAlbum !== true || app !== "photos") return;
    if (current.ui?.photos?.revealSeen === true) return;
    update({
      ...current,
      ui: {
        ...current.ui,
        photos: { ...current.ui?.photos, revealSeen: true },
      },
    });
  }, [app, s.variables, ready, creator, external]);
  // 「还有东西被遗漏」提示出现后：解锁隐藏相簿、隐藏备忘录与红点，并解锁电话/短信
  useEffect(() => {
    if (creator || external || !ready) return;
    const current = runtimeRef.current;
    if (current.ui?.wechat?.revealTip !== true) return;
    if (current.variables.hiddenAlbum === true) return;
    update({
      ...current,
      variables: {
        ...current.variables,
        hiddenAlbum: true,
        memoRevealed: true,
        memoRedDot: true,
        // 六则备忘录的隐藏内容在同一时刻解锁
        memo1Hidden: true,
        memo2Hidden: true,
        memo3Hidden: true,
        memo4Hidden: true,
        memo5Hidden: true,
        memo6HiddenText: true,
        "appUnlock:phone": true,
        "appUnlock:messages": true,
      },
      ui: {
        ...current.ui,
        notes: { ...current.ui?.notes, revealHidden: true },
      },
    });
  }, [s.ui?.wechat?.revealTip, ready, creator, external]);
  // 「左航：真走了？」只提醒一次，点过就不再弹
  useEffect(() => {
    if (creator || external || !ready) return;
    const current = runtimeRef.current;
    if (current.variables.stage4Ready !== true) return;
    if (current.variables.stage4Started === true) return;
    if (current.variables.stage4Notified === true) return;
    setBanner("微信：左航：真走了？");
    update({
      ...current,
      variables: { ...current.variables, stage4Notified: true },
    });
  }, [
    ready,
    banner,
    s.variables.stage4Ready,
    s.variables.stage4Started,
    s.variables.stage4Notified,
    creator,
    external,
  ]);
  useEffect(() => {
    if (!app && unlockNotice && noticeFromApp.current) {
      noticeFromApp.current = false;
      setUnlockNotice("");
    }
  }, [app, unlockNotice]);
  useEffect(() => {
    if (!unlockNotice) return;
    const timer = setTimeout(() => setUnlockNotice(""), 7000);
    return () => clearTimeout(timer);
  }, [unlockNotice]);
  useEffect(() => {
    if (!creator && !external && ready)
      void db.saves
        .put({ id: work.id, state: own })
        .catch(() => setLoadError("存档失败，请检查浏览器存储权限。"));
  }, [own, creator, work.id, external, ready]);
  useEffect(() => {
    if (creator || !ready) return;
    const interval = setInterval(() => {
      const previous = runtimeRef.current;
      const next = advance(work, previous, 1000);
      runtimeRef.current = next;
      const changed =
        next.time !== previous.time ||
        next.trace.join() !== previous.trace.join() ||
        (next.scheduled?.length ?? 0) !== (previous.scheduled?.length ?? 0) ||
        (next.scheduled?.length ?? 0) > 0 ||
        Math.floor((next.elapsedMs ?? 0) / 5000) !==
          Math.floor((previous.elapsedMs ?? 0) / 5000);
      if (changed) update(next);
    }, 1000);
    return () => clearInterval(interval);
  }, [creator, ready, work.id, work.updatedAt]);
  const event = (event: string, target: string) => {
    if (!creator) update(dispatch(work, runtimeRef.current, event, target));
  };
  const captureApp = () => {
    if (!app) return;
    const current = shell.current?.querySelector<HTMLElement>(".app-screen");
    if (!current) return;
    const snapshot = current.cloneNode(true) as HTMLElement;
    snapshot.style.transform = "none";
    snapshot.style.opacity = "1";
    snapshot.style.filter = "none";
    snapshot.style.borderRadius = "0";
    snapshot.querySelectorAll("audio").forEach((el) => el.remove());
    snapshot.querySelectorAll("video").forEach((el) => {
      el.removeAttribute("autoplay");
      el.removeAttribute("src");
    });
    snapshot.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    appSnapshots.current.set(app, snapshot);
    for (const id of appSnapshots.current.keys())
      if (!recent.includes(id) && id !== app) appSnapshots.current.delete(id);
  };
  const appLocked = (id: string) =>
    !creator && s.variables[`appUnlock:${id}`] !== true;
  const open = (id: string) => {
    if (!work.apps.some((a) => a.id === id && a.installed)) return;
    if (appLocked(id)) {
      setLockedHint("这个 App 暂时还不能使用");
      setTimeout(() => setLockedHint(""), 1600);
      return;
    }
    if ((id === "notes" || id === "photos") && runtimeRef.current.variables["memoRedDot"] === true)
      update({
        ...runtimeRef.current,
        variables: { ...runtimeRef.current.variables, memoRedDot: false },
      });
    setApp(id);
    setKeyboard(false);
    setRecent((v) => [id, ...v.filter((a) => a !== id)].slice(0, 8));
    setFolder("");
    setPanel("");
    if (id !== "wechat" && id !== "messages") pendingThread.current = "";
    onOpen?.(id);
    event("openApp", id);
  };
  const installedApps = work.apps.filter((a) => a.installed);
  const apps = installedApps.filter((a) => a.visible);
  function fullUnlocks() {
    return {
      ...Object.fromEntries(
        work.apps
          .filter((a) => a.installed)
          .map((a) => [`appUnlock:${a.id}`, true]),
      ),
      ...Object.fromEntries(
        Object.values(work.data)
          .flat()
          .filter((i) => i.unlock)
          .map((i) => [i.unlock as string, true]),
      ),
      "wxUnlock:moments": true,
    };
  }
  const hiddenPhotoMedia =
    (work.data.photos ?? []).find((i) => i.id === HIDDEN_PHOTO_ID)?.media ?? "";
  // 设置页的剧情跳转：清档并重置所有本地界面状态，再从指定节点开始
  const resetStoryUi = (opts: {
    dust: boolean;
    locked: boolean;
    modeDone: boolean;
  }) => {
    stage6ColorFired.current = false;
    clearTimeout(stage6ColorTimer.current);
    stopBuzz.current?.();
    stopBuzz.current = null;
    setStage6Color(false);
    setStageEnd("");
    setBanner("");
    setBannerQueue([]);
    setStoryTip("");
    tipQueue.current = [];
    tipDone.current = undefined;
    clearTimeout(tipTimer.current);
    noticesSeen.current = 0;
    appSnapshots.current.clear();
    pendingThread.current = "";
    setRecent([]);
    setApp("");
    setFolder("");
    setPanel("");
    setKeyboard(false);
    setCharging(false);
    batteryExact.current = work.phone.battery;
    setBattery(work.phone.battery);
    setPinOpen(false);
    setQuickCamera(false);
    setDustWiped(!opts.dust);
    markModeFlowDone(opts.modeDone);
    setLocked(opts.locked);
  };
  const restartStory = () => {
    void db.saves.delete(work.id).catch(() => {});
    update(dispatch(work, freshRuntime(), "start"));
    resetStoryUi({ dust: true, locked: true, modeDone: false });
    switchBgm("nutcracker");
  };
  const restartFromMode = () => {
    void db.saves.delete(work.id).catch(() => {});
    update(dispatch(work, freshRuntime(), "start"));
    resetStoryUi({ dust: false, locked: false, modeDone: false });
    switchBgm("nutcracker");
  };
  // 跳回左航第一个弹窗【真走了？】：开场内容视为已完成，只差查看微信
  const jumpToFirstPopup = () => {
    const fresh = dispatch(work, freshRuntime(), "start");
    update({
      ...fresh,
      variables: { ...fresh.variables, stage4Ready: true },
    });
    resetStoryUi({ dust: false, locked: false, modeDone: true });
    switchBgm("trauma");
  };
  // 跳回左航第二个弹窗【想起来没？】：第一阶段和隐藏内容都已完成
  const jumpToSecondPopup = () => {
    const fresh = dispatch(work, freshRuntime(), "start");
    update({
      ...fresh,
      read: [...new Set([...fresh.read, "note-6"])],
      variables: {
        ...fresh.variables,
        ...fullUnlocks(),
        stage4Ready: true,
        stage4Started: true,
        stage4Notified: true,
        wxLeftangNew: true,
        wxRevealEnding: true,
        wechatTruthUnlocked: true,
        homeWallpaperNew: true,
        wxLeftangRemark: true,
        hiddenAlbum: true,
        memoRevealed: true,
        memoRedDot: true,
        memo1Hidden: true,
        memo2Hidden: true,
        memo3Hidden: true,
        memo4Hidden: true,
        memo5Hidden: true,
        memo6HiddenText: true,
      },
      unlocked: [...new Set([...fresh.unlocked, HIDDEN_PHOTO_ID])],
      ui: {
        ...fresh.ui,
        photos: { ...fresh.ui?.photos, revealSeen: true },
        notes: { ...fresh.ui?.notes, revealHidden: true },
      },
    });
    resetStoryUi({ dust: false, locked: false, modeDone: true });
    switchBgm("felicity");
  };
  // 跳回拨号输入 11 的时候：电话自动按下 1、1，随后进入彩屏与短信
  const jumpToSmsDial = () => {
    const fresh = dispatch(work, freshRuntime(), "start");
    update({
      ...fresh,
      read: [...new Set([...fresh.read, "note-6"])],
      variables: {
        ...fresh.variables,
        ...fullUnlocks(),
        stage4Ready: true,
        stage4Started: true,
        stage4Notified: true,
        wxLeftangNew: true,
        wxRevealEnding: true,
        wechatTruthUnlocked: true,
        homeWallpaperNew: true,
        wxLeftangRemark: true,
        hiddenAlbum: true,
        memoRevealed: true,
        memo1Hidden: true,
        memo2Hidden: true,
        memo3Hidden: true,
        memo4Hidden: true,
        memo5Hidden: true,
        memo6HiddenText: true,
        wxStage6: true,
        wxStage6Sms: false,
        stage6Done: false,
      },
      unlocked: [...new Set([...fresh.unlocked, HIDDEN_PHOTO_ID])],
      ui: {
        ...fresh.ui,
        phone: { ...fresh.ui?.phone, stage6Dial: true },
        wechat: { ...fresh.ui?.wechat, stage6Done: true },
      },
    });
    resetStoryUi({ dust: false, locked: false, modeDone: true });
    setApp("phone");
    switchBgm("nutcracker");
  };
  // 跳到剧情结束后的【自由观看手机阶段】：所有剧情推进变量都已完成，
  // 不会再触发弹窗 / 动画 / 拨号 / 短信。玩家可以随意翻看手机全部内容。
  const jumpToEnding = () => {
    const fresh = dispatch(work, freshRuntime(), "start");
    update({
      ...fresh,
      read: [
        ...new Set([
          ...fresh.read,
          "note-6",
        ]),
      ],
      variables: {
        ...fresh.variables,
        ...fullUnlocks(),
        stage4Ready: true,
        stage4Started: true,
        stage4Notified: true,
        wxLeftangNew: true,
        wxRevealEnding: true,
        wechatTruthUnlocked: true,
        homeWallpaperNew: true,
        wxLeftangRemark: true,
        hiddenAlbum: true,
        memoRevealed: true,
        memoRedDot: false, // 两个红点在自由阶段都该消掉
        memo1Hidden: true,
        memo2Hidden: true,
        memo3Hidden: true,
        memo4Hidden: true,
        memo5Hidden: true,
        memo6HiddenText: true,
        wxStage6: true,
        wxStage6Sms: true,
        stage6Done: true, // Stage6 对话已完成，不会重播
      },
      unlocked: [...new Set([...fresh.unlocked, HIDDEN_PHOTO_ID])],
      ui: {
        ...fresh.ui,
        phone: {
          ...fresh.ui?.phone,
          stage6Dial: "closed", // 拨号已结束
        },
        wechat: {
          ...fresh.ui?.wechat,
          stage6Done: true, // Stage6 动画进度 done
          stage5Active: 999,
          stage5Shown: 999,
          stage5Done: true,
          stage6Active: 999,
          stage6Shown: 999,
        },
        messages: {
          ...fresh.ui?.messages,
          stage6Sms: "end", // 短信全部播完
        },
        photos: { ...fresh.ui?.photos, revealSeen: true },
        notes: { ...fresh.ui?.notes, revealHidden: true },
      },
    });
    resetStoryUi({ dust: false, locked: false, modeDone: true });
    // 结局是 felicity，延续 closeStageEnd 的设定
    switchBgm("felicity");
    setApp("");
  };
  const unlock = (pin = "") => {
    if (!work.phone.passcode || pin === work.phone.passcode) {
      setLocked(false);
      setPinOpen(false);
      event("password", pin);
    } else {
      setPinError("密码不正确");
      setPinOpen(true);
    }
  };
  useEffect(() => {
    if (app && !work.apps.some((a) => a.id === app && a.installed)) setApp("");
  }, [app, work.apps]);
  const displayTime = creator ? work.phone.time : s.time || work.phone.time;
  // 左航备注改成「小航」后，微信通知里只替换会话名（不改消息正文）
  const bannerDisplay = (() => {
    if (s.variables["wxLeftangRemark"] !== true) return banner;
    const matched = banner.match(/^微信：([^：]+)：(.*)$/);
    if (!matched) return banner;
    const who = matched[1] === "左航" ? "小航" : matched[1];
    return `微信：${who}：${matched[2]}`;
  })();
  const plugin = getApp(app);
  useEffect(() => {
    const count = s.notifications.length;
    if (!locked && work.phone.notifications && count > noticesSeen.current) {
      setBanner(s.notifications.at(-1) || "");
      const timer = setTimeout(() => setBanner(""), 4500);
      noticesSeen.current = count;
      return () => clearTimeout(timer);
    }
    noticesSeen.current = count;
  }, [s.notifications.length, locked, work.phone.notifications]);
  // 剧情里连续弹出的微信通知（每条停留 2.2 秒，够玩家看清）
  useEffect(() => {
    if (!bannerQueue.length) {
      // 5 条通知全部弹完后，屏幕正中央提示 2 秒：往上翻聊天记录
      if (pendingUpTip.current) {
        pendingUpTip.current = false;
        setTip({ text: "往上翻一下这段聊天记录", hold: 2000 });
      }
      return;
    }
    setBanner(bannerQueue[0]);
    const timer = setTimeout(() => {
      setBannerQueue((q) => q.slice(1));
      if (bannerQueue.length === 1) setBanner("");
    }, 2200);
    return () => clearTimeout(timer);
  }, [bannerQueue, setTip]);
  const dismissNotice = (index: number) =>
    update({
      ...runtimeRef.current,
      notifications: runtimeRef.current.notifications.filter(
        (_, i) => i !== index,
      ),
    });
  if (!ready) return <div className="phone-loading">正在恢复进度…</div>;
  const homeWallpaper =
    s.variables["homeWallpaperNew"] === true && work.phone.wallpaperAfter
      ? work.phone.wallpaperAfter
      : work.phone.wallpaper;
  const activeWallpaper =
    locked && work.phone.lockWallpaper
      ? work.phone.lockWallpaper
      : homeWallpaper;
  const wallpaperIsImage = /^data:image\//.test(activeWallpaper);
  return (
    <div
      ref={shell}
      style={{ "--phone-scale": deviceScale } as CSSProperties}
      className={`phone-shell ios18 ${work.phone.theme === "dark" ? "dark-phone" : ""}`}
    >
      {/* 手机外部右上角 BGM 碟片开关 */}
      <button
        className={`bgm-disc ${bgmOn ? "on" : ""}`}
        aria-label={bgmOn ? "关闭背景音乐" : "打开背景音乐"}
        title={bgmOn ? "关闭背景音乐" : "打开背景音乐"}
        onClick={toggleBgm}
      >
        <span className="bgm-disc-ring" />
        <span className="bgm-disc-hole" />
      </button>
      <KeyboardContext.Provider value={openKeyboard}>
        <div
          className={`phone-screen ${wallpaperIsImage ? "" : `wallpaper-${activeWallpaper}`} ${locked ? "is-locked" : ""} ${app ? "in-app" : ""} ${keyboard ? "keyboard-open" : ""}`}
          style={
            wallpaperIsImage
              ? {
                  backgroundImage: `url("${activeWallpaper}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
          data-app={app}
          onDragStart={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            if (!creator && work.phone.dustIntro && !dustWiped) return;
            gestureConsumed.current = false;
            const button = (e.target as HTMLElement).closest<HTMLElement>(
              "[data-app-id]",
            );
            if (button) {
              pressTimer.current = setTimeout(() => {
                gestureConsumed.current = true;
                setContextApp(button.dataset.appId || "");
              }, 550);
            }
            const box = e.currentTarget.getBoundingClientRect(),
              x = (e.clientX - box.left) / deviceScale,
              y = (e.clientY - box.top) / deviceScale;
            gesture.current = {
              x,
              y,
              time: Date.now(),
              zone: y < 58 ? "top" : y > 818 ? "bottom" : locked ? "lock" : "",
            };
          }}
          onPointerMove={(e) => {
            if (Math.abs(e.movementX) > 5 || Math.abs(e.movementY) > 5)
              clearTimeout(pressTimer.current);
          }}
          onPointerCancel={() => clearTimeout(pressTimer.current)}
          onPointerUp={(e) => {
            if (!creator && work.phone.dustIntro && !dustWiped) return;
            clearTimeout(pressTimer.current);
            const box = e.currentTarget.getBoundingClientRect(),
              y = (e.clientY - box.top) / deviceScale,
              g = gesture.current;
            const dy = y - g.y;
            if (g.zone === "top" && dy > 65)
              setPanel(g.x > 230 ? "control" : "notification");
            else if ((g.zone === "bottom" || g.zone === "lock") && dy < -55) {
              gestureConsumed.current = true;
              if (!locked) captureApp();
              setKeyboard(false);
              if (panel) {
                setPanel("");
              } else if (locked) {
                beginUnlock();
              } else if (g.zone === "bottom" && Date.now() - g.time > 450) {
                captureApp();
                setPanel("switcher");
              } else {
                setApp("");
                setPanel("");
                setFolder("");
              }
            }
          }}
          onClickCapture={(e) => {
            const target = (e.target as HTMLElement).closest(
              ".home-app-grid button,.dock button",
            );
            if (target) {
              setLaunchOrigin(
                readLauncherOrigin(target as HTMLElement, e.currentTarget),
              );
            }
          }}
        >
          <div className="wallpaper-orb orb-one" />
          <div className="wallpaper-orb orb-two" />
          <div className="status-bar">
            <button
              onClick={() =>
                setPanel(panel === "notification" ? "" : "notification")
              }
              className="status-time"
              aria-label="通知中心"
            >
              {displayTime}
              <StatusGlyph kind="silent" />
            </button>
            <div className="dynamic-island" />
            <button
              className="signals"
              onClick={() => setPanel(panel === "control" ? "" : "control")}
              aria-label="控制中心"
            >
              <StatusGlyph kind="cellular" />
              <span className="status-network">{work.phone.network}</span>
              {charging && <span className="status-charging" />}
              <span
                className={`ios-battery${battery <= 20 ? " low-battery" : ""}${
                  charging ? " charging" : ""
                }`}
              >
                <span style={{ width: `${battery}%` }} />
                <b>{battery}</b>
              </span>
            </button>
          </div>
          {!creator && work.phone.dustIntro && !dustWiped && (
            <DustWipe onDone={() => setDustWiped(true)} />
          )}
          {!creator && work.phone.modeFlow && !locked && !modeFlowDone && (
            <ModeFlow
              initial={work.phone.battery}
              onBattery={handleBattery}
              onCharging={(on) => {
                setCharging(on);
              }}
              onFinish={() => {
                markModeFlowDone(true);
                // 耳机提示 3 秒保持安静，提示消失后再切清醒梦
                runTips(
                  [
                    {
                      text: "🎧佩戴耳机以获得更加沉浸式的体验",
                      hold: 3000,
                      inline: true,
                    },
                  ],
                  () => switchBgm("clear"),
                );
              }}
              stage6={
                s.variables["wxStage6"] === true &&
                s.variables["stage6Done"] !== true
              }
              onStage6PowerOff={() => {
                // 黑屏后弹窗 3 秒，然后弹到设置由玩家自由选择游戏进程
                setPanel("");
                setKeyboard(false);
                runTips(
                  [
                    {
                      text: "你：没电了？幸好我已经看完了。",
                      hold: 3000,
                      inline: true,
                    },
                  ],
                  () => setApp("settings"),
                );
              }}
              onReboot={() => {
                batteryExact.current = work.phone.battery;
                setBattery(work.phone.battery);
                setCharging(false);
                setModeFlowDone(false);
                setApp("");
                setPanel("");
                setFolder("");
                setDustWiped(false);
                setLocked(true);
              }}
            />
          )}
          <AnimatePresence mode="wait">
            {locked && !(quickCamera && app === "camera") ? (
              <DeviceLock
                work={
                  s.date
                    ? { ...work, phone: { ...work.phone, date: s.date } }
                    : work
                }
                time={displayTime}
                notices={s.notifications}
                onDismiss={dismissNotice}
                pinOpen={pinOpen}
                setPinOpen={setPinOpen}
                error={pinError}
                onUnlock={unlock}
                onLight={() => setPanel("light")}
                onCamera={() => {
                  setQuickCamera(true);
                  open("camera");
                }}
              />
            ) : app && app !== "appstore" ? (
              <AppWindow
                key={app}
                className={`app-screen engine-${plugin.engine} skin-${app}`}
                creator={creator}
                origin={launchOrigin}
              >
                <AppContent
                  app={plugin}
                  name={
                    work.apps.find((a) => a.id === app)?.name ?? plugin.name
                  }
                  items={[
                    ...(work.data[app] ?? []),
                    ...(s.messages[app] ?? []),
                  ]}
                  creator={creator}
                  state={s}
                  onRead={(id) => event("read", id)}
                  onEdit={(item) => onEdit?.(app, item)}
                  onAdd={() => onAdd?.(app)}
                  onBack={() => setApp("")}
                  onSettings={onSettings}
                  onRestart={restartStory}
                  onJumpMode={restartFromMode}
                  onJumpFirst={jumpToFirstPopup}
                  onJumpSecond={jumpToSecondPopup}
                  onJumpSms={jumpToSmsDial}
                  onJumpEnd={jumpToEnding}
                  initialThread={
                    app === "wechat" || app === "messages"
                      ? pendingThread.current
                      : ""
                  }
                  hiddenPhoto={hiddenPhotoMedia}
                  onNotify={notify}
                  onStoryTip={setTip}
                  onStage5End={finishStage5}
                  onStage6End={finishStage6Dialogue}
                  onStage6SmsEnd={finishStage6Sms}
                  onUi={(key, value) => {
                    // 用 ref 避免每次 render 都新引用，让 Stage5/6 的动画 useEffect 不被打断
                    const current = runtimeRef.current;
                    updateRef.current(
                      dispatch(
                        work,
                        {
                          ...current,
                          ui: {
                            ...current.ui,
                            [app]: { ...current.ui?.[app], [key]: value },
                          },
                        },
                        "variable",
                        `ui:${app}:${key}`,
                      ),
                    );
                  }}
                  work={work}
                />
              </AppWindow>
            ) : (
              <HomeLauncher
                key={
                  "home-" + homeRequest + (app === "appstore" ? "store" : "")
                }
                storeOpen={app === "appstore"}
                closeStore={() => setApp("")}
                work={work}
                layout={deviceLayout.layout}
                change={deviceLayout.change}
                importLayout={deviceLayout.importLayout}
                error={deviceLayout.error}
                open={open}
                onFolder={setFolder}
                search={() => setPanel("search")}
                time={displayTime}
                battery={battery}
                icon={(a, small) => (
                  <AppIcon
                    key={a.id}
                    id={a.id}
                    name={small ? undefined : a.name}
                    small={small}
                    custom={a.icon}
                    date={s.date || work.phone.date}
                    time={s.time}
                    locked={appLocked(a.id)}
                  />
                )}
                clearApp={(id) =>
                  update({
                    ...runtimeRef.current,
                    messages: Object.fromEntries(
                      Object.entries(runtimeRef.current.messages).filter(
                        ([app]) => app !== id,
                      ),
                    ),
                  })
                }
                dot={(id) =>
                  (id === "notes" || id === "photos") && s.variables["memoRedDot"] === true
                }
              />
            )}
          </AnimatePresence>
          {lockedHint && <div className="app-lock-toast">{lockedHint}</div>}
          {unlockNotice && !locked && (
            <div className="unlock-banner">
              <Sparkles size={15} />
              <span>{unlockNotice}</span>
            </div>
          )}
          {folder && (
            <div className="folder-overlay" onClick={() => setFolder("")}>
              <h2>{folder}</h2>
              <div className="folder-apps" onClick={(e) => e.stopPropagation()}>
                {apps
                  .filter((a) => a.folder === folder)
                  .map((a) => (
                    <button key={a.id} onClick={() => open(a.id)}>
                      <AppIcon
                        id={a.id}
                        name={a.name}
                        custom={a.icon}
                        locked={appLocked(a.id)}
                      />
                    </button>
                  ))}
              </div>
              <button className="glass-btn" onClick={() => setFolder("")}>
                关闭文件夹
              </button>
            </div>
          )}
          {panel === "control" && (
            <ControlCenter
              battery={work.phone.battery}
              network={work.phone.network}
              close={() => setPanel("")}
            />
          )}
          {panel && panel !== "control" && panel !== "switcher" && (
            <div
              className={`system-panel ${panel === "light" ? "flash-on" : ""}`}
            >
              <button className="panel-close" onClick={() => setPanel("")}>
                关闭 <ChevronLeft size={14} />
              </button>
              {panel === "notification" ? (
                <>
                  <h2>通知中心</h2>
                  {work.phone.notifications && s.notifications.length ? (
                    <SystemNotifications
                      notices={s.notifications}
                      apps={work.apps}
                      onOpen={() => {
                        setPanel("");
                        if (locked) beginUnlock();
                        else if (installedApps.some((a) => a.id === "messages"))
                          open("messages");
                      }}
                      onDismiss={dismissNotice}
                    />
                  ) : (
                    <p>没有新通知</p>
                  )}
                </>
              ) : panel === "search" ? (
                <>
                  <h2>搜索 App</h2>
                  <AppSearch apps={installedApps} open={open} />
                </>
              ) : (
                <h2>手电筒已打开</h2>
              )}
            </div>
          )}
          {!creator && s.choices.length > 0 && !locked && (
            <div className="story-overlay">
              <span className="eyebrow">故事来到一个岔路口</span>
              <h3>你会如何选择？</h3>
              {s.choices.map((c) => (
                <button
                  key={c.target}
                  onClick={() => update(choose(work, s, c.target))}
                >
                  {c.label}
                  <ArrowUp size={15} />
                </button>
              ))}
            </div>
          )}
          {!creator && s.endings.length > 0 && !locked && (
            <div className="story-overlay ending">
              <span className="eyebrow">ENDING · {s.endings.length}</span>
              <h2>故事在这里停泊。</h2>
              <p>{s.endings[s.endings.length - 1]}</p>
              <button
                onClick={() => {
                  update(dispatch(work, freshRuntime(), "start"));
                  setApp("");
                  setLocked(true);
                }}
              >
                重新开始
              </button>
            </div>
          )}
          {!creator && s.incomingCall && (
            <div className="incoming-call-screen">
              <small>
                {s.incomingCall.status === "ringing" ? "来电" : "通话中"} ·
                作品内模拟
              </small>
              <div className="incoming-avatar">
                {s.incomingCall.caller.slice(0, 1)}
              </div>
              <h2>{s.incomingCall.caller}</h2>
              {s.incomingCall.status === "answered" &&
                (() => {
                  const record = work.data.phone?.find(
                    (i) => i.id === s.incomingCall?.target,
                  );
                  return record?.kind === "audio" && safeMedia(record.media) ? (
                    <audio controls src={safeMedia(record.media)} />
                  ) : (
                    <p>这是一通虚构来电。</p>
                  );
                })()}
              <div className="incoming-actions">
                <button
                  className="decline-call"
                  onClick={() => {
                    const call = runtimeRef.current.incomingCall;
                    if (call)
                      update(
                        dispatch(
                          work,
                          { ...runtimeRef.current, incomingCall: null },
                          call.status === "ringing"
                            ? "callDeclined"
                            : "callEnded",
                          call.target || call.caller,
                        ),
                      );
                  }}
                >
                  <PhoneIcon size={25} />
                  <span>
                    {s.incomingCall.status === "ringing" ? "拒接" : "挂断"}
                  </span>
                </button>
                {s.incomingCall.status === "ringing" && (
                  <button
                    className="accept-call"
                    onClick={() => {
                      const call = runtimeRef.current.incomingCall;
                      if (call)
                        update(
                          dispatch(
                            work,
                            {
                              ...runtimeRef.current,
                              incomingCall: { ...call, status: "answered" },
                            },
                            "callAnswered",
                            call.target || call.caller,
                          ),
                        );
                    }}
                  >
                    <PhoneIcon size={25} />
                    <span>接听</span>
                  </button>
                )}
              </div>
            </div>
          )}
          {banner && !locked && (
            <button
              className="device-banner"
              onClick={() => {
                const fromWechat = banner.includes("你在哪") || banner.includes("真走了");
                const stage6Banner = banner.startsWith("微信：左航：想起来没");
                const queueWechat = banner.startsWith("微信");
                setBanner("");
                setBannerQueue([]);
                if (fromWechat || stage6Banner) {
                  pendingThread.current = "左航";
                  open("wechat");
                } else if (queueWechat) open("wechat");
                else setPanel("notification");
              }}
            >
              <AppIcon
                id={notificationContent(bannerDisplay, work.apps).appId}
                small
              />
              <span>
                <strong>
                  {notificationContent(bannerDisplay, work.apps).title}
                </strong>
                <span>{notificationContent(bannerDisplay, work.apps).body}</span>
              </span>
              <time className="device-banner-time">{displayTime}</time>
            </button>
          )}
          {stage6Color && <div className="stage6-color-screen" />}
          {storyTip && storyTip.inline && (
            <div
              className={`story-tip-inline${storyTip.choices?.length ? " has-choices" : ""}`}
            >
              {storyTip.image ? (
                <img
                  className="story-tip-inline-img"
                  src={storyTip.image}
                  alt="表情包"
                />
              ) : null}
              {storyTip.text ? <p>{storyTip.text}</p> : null}
              {storyTip.choices?.length ? (
                <div className="story-tip-choices">
                  {storyTip.choices.map((c) => (
                    <button key={c.label} onClick={() => pickTip(c)}>
                      {c.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
          {storyTip && !storyTip.inline && (
            <div
              className="story-tip-shade"
              onClick={() => {
                if (!storyTip.choices?.length) dismissTip();
              }}
            >
              <div className="story-tip" onClick={(e) => e.stopPropagation()}>
                {storyTip.image ? (
                  <img
                    className="story-tip-img"
                    src={storyTip.image}
                    alt="表情包"
                  />
                ) : null}
                {storyTip.text ? <p>{storyTip.text}</p> : null}
                {storyTip.choices?.length ? (
                  <div className="story-tip-choices">
                    {storyTip.choices.map((c) => (
                      <button key={c.label} onClick={() => pickTip(c)}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}
          {stageEnd && (
            <div className="stage-end-shade" onClick={closeStageEnd}>
              <div className="stage-end-card">
                <p>{stageEnd}</p>
                <span>轻点屏幕继续</span>
              </div>
            </div>
          )}
          {panel === "switcher" && (
            <div className="device-switcher">
              <div className="switcher-cards">
                {recent
                  .filter(
                    (id) =>
                      installedApps.some((a) => a.id === id) &&
                      appSnapshots.current.has(id),
                  )
                  .map((id) => (
                    <button
                      className="recent-app-card"
                      key={id}
                      onClick={() => open(id)}
                    >
                      <span className="recent-app-label">
                        <AppIcon id={id} small />
                        <strong>
                          {work.apps.find((a) => a.id === id)?.name}
                        </strong>
                      </span>
                      <span className="recent-app-window">
                        <span
                          className="recent-app-snapshot"
                          aria-hidden="true"
                          inert
                          ref={(el) => {
                            const snapshot = appSnapshots.current.get(id);
                            if (el && snapshot)
                              el.replaceChildren(snapshot.cloneNode(true));
                          }}
                        />
                      </span>
                    </button>
                  ))}
              </div>
              <button className="switcher-done" onClick={() => setPanel("")}>
                完成
              </button>
            </div>
          )}
          {contextApp && (
            <div
              className="home-context-shade"
              onClick={() => setContextApp("")}
            >
              <div className="home-context-menu">
                <AppIcon id={contextApp} />
                <strong>
                  {work.apps.find((a) => a.id === contextApp)?.name}
                </strong>
                <button
                  onClick={() => {
                    open(contextApp);
                    setContextApp("");
                  }}
                >
                  打开 App
                </button>
                <button
                  onClick={() => {
                    setContextApp("");
                    setPanel("search");
                  }}
                >
                  在 App 库中查看
                </button>
                <button onClick={() => setContextApp("")}>取消</button>
              </div>
            </div>
          )}
          {keyboard && (
            <DeviceKeyboard
              close={() => openKeyboard(false)}
              draft={kbdDraft}
            />
          )}
          {loadError && (
            <button className="runtime-error" onClick={() => setLoadError("")}>
              {loadError}
            </button>
          )}
          <button
            className="home-indicator"
            aria-label="返回桌面"
            onClick={() => {
              if (gestureConsumed.current) return;
              if (locked) {
                beginUnlock();
                return;
              }
              captureApp();
              pendingThread.current = "";
              setHomeRequest((n) => n + 1);
              setKeyboard(false);
              setApp("");
              setFolder("");
              setPanel("");
            }}
          />
          <div className="screen-dimmer" />
          <div className="hardware-reflection" />
        </div>
      </KeyboardContext.Provider>
    </div>
  );
}
function AppSearch({
  apps,
  open,
}: {
  apps: Work["apps"];
  open: (id: string) => void;
}) {
  const [q, set] = useState("");
  return (
    <>
      <input
        autoFocus
        value={q}
        placeholder="App 名称"
        onChange={(e) => set(e.target.value)}
      />
      {apps
        .filter((a) => a.name.toLowerCase().includes(q.toLowerCase()))
        .map((a) => (
          <button
            className="search-result"
            key={a.id}
            onClick={() => open(a.id)}
          >
            <AppIcon id={a.id} small />
            {a.name}
          </button>
        ))}
    </>
  );
}
function Media({ item }: { item: Item }) {
  const src = safeMedia(item.media);
  return src ? (
    item.kind === "audio" ? (
      <audio controls src={src} />
    ) : item.kind === "video" ? (
      <video controls playsInline src={src} />
    ) : (
      <img loading="lazy" src={src} alt={item.title} />
    )
  ) : (
    <div
      className={`original-art art-${item.id.includes("ticket") ? "ticket" : "rain"}`}
    >
      <span>
        {item.id.includes("ticket") ? "城南 / SOUTHBOUND" : "after the rain"}
      </span>
      <strong>{item.id.includes("ticket") ? "09 · 01" : "雨 后"}</strong>
      <small>
        {item.id.includes("ticket")
          ? "16:30 · 一张未完成的约定"
          : "a little moment of quiet"}
      </small>
    </div>
  );
}
function AppContent({
  app,
  name,
  items,
  creator,
  state,
  onRead,
  onEdit,
  onAdd,
  onBack,
  onSettings,
  onRestart,
  onJumpMode,
  onJumpFirst,
  onJumpSecond,
  onJumpSms,
  onJumpEnd,
  onUi,
  work,
  initialThread = "",
  hiddenPhoto = "",
  onNotify,
  onStoryTip,
  onStage5End,
  onStage6End,
  onStage6SmsEnd,
}: {
  app: AppPlugin;
  name: string;
  items: Item[];
  creator: boolean;
  state: Runtime;
  onRead: (id: string) => void;
  onEdit: (item: Item) => void;
  onAdd: () => void;
  onBack: () => void;
  onSettings?: () => void;
  onRestart?: () => void;
  onJumpMode?: () => void;
  onJumpFirst?: () => void;
  onJumpSecond?: () => void;
  onJumpSms?: () => void;
  onJumpEnd?: () => void;
  onUi?: (key: string, value: UiValue) => void;
  work: Work;
  initialThread?: string;
  hiddenPhoto?: string;
  onNotify?: (texts: string[]) => void;
  onStoryTip?: (tip: string | StoryTip) => void;
  onStage5End?: () => void;
  onStage6End?: () => void;
  onStage6SmsEnd?: () => void;
}) {
  const [detail, setDetail] = useState<Item | null>(null);
  const [thread, setThread] = useState(initialThread);
  const [tab, setTab] = useState(app.tabs[0]);
  const [q, setQ] = useState("");
  const [pw, setPw] = useState("");
  const [unlocks, setUnlocks] = useState<string[]>([]);
  const [pwError, setPwError] = useState("");
  const [likes, setLikes] = useState<string[]>([]);
  const appliedThread = useRef(initialThread);
  useEffect(() => {
    // 只在 initialThread 真正变化时同步，避免用户返回列表后又被拉回会话
    if (
      (app.id === "wechat" || app.id === "messages") &&
      initialThread &&
      initialThread !== appliedThread.current
    ) {
      appliedThread.current = initialThread;
      setThread(initialThread);
    }
  }, [app.id, initialThread]);
  const shown = items
    .filter((i) => creator || visible(i, state))
    .filter((i) =>
      (i.title + i.body + i.sender).toLowerCase().includes(q.toLowerCase()),
    );
  const filtered =
    tab === "收藏"
      ? shown.filter((i) => i.favorite)
      : tab === app.tabs[0]
        ? shown
        : shown.filter((i) => i.folder === tab);
  const read = (i: Item) => {
    if (creator) {
      onEdit(i);
      return;
    }
    setDetail(i);
    if (!i.password || unlocks.includes(i.id)) onRead(i.id);
  };
  const chats = [...new Set(shown.map((i) => i.title))];
  const back = () => {
    if (detail) setDetail(null);
    else if (thread) setThread("");
    else onBack();
  };
  const Skin =
    app.id === "wechat"
      ? WeChatSkin
      : app.id === "whatsapp"
        ? WhatsAppSkin
        : (catalogSkins[app.id as keyof typeof catalogSkins] ?? null);
  const hiddenNote =
    app.id === "notes" &&
    detail?.meta?.hiddenBody &&
    state.variables[detail.meta.hiddenKey] === true
      ? detail.meta.hiddenBody
      : "";
  const detailView = detail ? (
    <div className="phone-content detail-content">
      {detail.password && !creator && !unlocks.includes(detail.id) ? (
        <div className="locked-note">
          <LockKeyhole size={36} />
          <h3>这条内容已锁定</h3>
          <input
            type="password"
            placeholder="内容密码"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <button
            onClick={() => {
              if (pw === detail.password) {
                setUnlocks([...unlocks, detail.id]);
                onRead(detail.id);
                setPwError("");
              } else setPwError("密码不正确");
            }}
          >
            解锁内容
          </button>
          <small>{pwError}</small>
        </div>
      ) : (
        <>
          {!(app.id === "delivery" && detail.folder === "商家") && (
            <small className="detail-meta">
              {detail.time} · {detail.sender}
            </small>
          )}
          <h2>{detail.title}</h2>
          {app.id !== "forum" &&
            (detail.media || ["media", "social"].includes(app.engine)) && (
              <Media item={detail} />
            )}
          <RichText value={detail.richText} fallback={detail.body} />
          <dl className="item-metadata">
            {getFields(app.id)
              .filter((f) => detail.meta?.[f.key])
              .map((f) => (
                <div key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>{detail.meta[f.key]}</dd>
                </div>
              ))}
          </dl>
          {detail.folder && (
            <span className="folder-label">
              <Folder size={12} />
              {detail.folder}
            </span>
          )}
          {app.id === "forum" && parseFloors(detail.comments) ? (
            <div className="forum-thread">
              <h3 className="forum-replies-title">回帖区</h3>
              {parseFloors(detail.comments)!.map((f) => (
                <article className="forum-floor" key={f.n}>
                  <div className="forum-floor-head">
                    <small>{f.n}楼</small>
                    {f.op && <em>楼主</em>}
                  </div>
                  {f.quote && (
                    <blockquote className="forum-quote">
                      {f.quote.n}楼：{f.quote.text}
                    </blockquote>
                  )}
                  <p>{f.text}</p>
                  <span className="forum-like">
                    <ThumbsUp size={13} /> {f.likes ?? 0}
                  </span>
                </article>
              ))}
            </div>
          ) : app.id === "redbook" ? (
            <div className="rb-comments">
              <h3 className="forum-replies-title">
                评论 {detail.comments.length}
              </h3>
              {detail.comments.map((c, i) => {
                const split = c.search(/[：:]/),
                  hasName = split > 0 && split < 24,
                  name = hasName ? c.slice(0, split) : "用户",
                  body = hasName ? c.slice(split + 1) : c;
                return (
                  <article className="rb-comment" key={i}>
                    <span className="rb-comment-avatar">
                      {name.slice(0, 1)}
                    </span>
                    <div>
                      <strong>{name}</strong>
                      <p>{body}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : app.id === "douyin" && parseFloors(detail.comments) ? (
            <div className="rb-comments">
              <h3 className="forum-replies-title">
                评论 {detail.comments.length}
              </h3>
              {parseFloors(detail.comments)!.map((f, i) => (
                <article className="rb-comment" key={i}>
                  <span className="rb-comment-avatar">
                    {f.avatar?.startsWith("data:image/") ? (
                      <img src={f.avatar} alt="" />
                    ) : (
                      (f.user ?? "用户").slice(0, 1)
                    )}
                  </span>
                  <div>
                    <strong>{f.user ?? "用户"}</strong>
                    <p>{f.text}</p>
                    <span className="rb-comment-like">♡ {f.likes ?? 0}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            detail.comments.map((c, i) => (
              <p key={i} className="comment">
                {c}
              </p>
            ))
          )}
        </>
      )}
    </div>
  ) : null;
  if (Skin)
    return (
      <>
        <div className="catalog-slot" hidden={!!detail}>
          <Suspense fallback={<div className="catalog-loading">正在打开…</div>}>
            <Skin
              appId={app.id}
              owner={work.phone.owner}
              virtualTime={state.time}
              virtualDate={state.date}
              ui={state.ui?.[app.id]}
              onUi={creator ? undefined : onUi}
              name={name}
              items={shown}
              creator={creator}
              onRead={onRead}
              onItem={read}
              onAdd={onAdd}
              onBack={onBack}
              thread={thread}
              onThread={setThread}
              variables={state.variables}
              hiddenPhoto={hiddenPhoto}
              onNotify={onNotify}
              onStoryTip={onStoryTip}
              onStage6End={onStage6End}
              onStage6SmsEnd={onStage6SmsEnd}
              onStage5End={onStage5End}
            />
          </Suspense>
        </div>
        {detail &&
          (socialDetailApps.has(app.id) &&
          (!detail.password || unlocks.includes(detail.id)) ? (
            <SocialDetail
              app={app.id}
              item={detail}
              back={back}
              owner={work.phone.owner}
              ui={state.ui?.[app.id]}
              onUi={onUi}
            />
          ) : nativeDetailApps.has(app.id) &&
            (!detail.password || unlocks.includes(detail.id)) ? (
            <NativeDetail
              app={app.id}
              item={detail}
              back={back}
              hiddenNote={hiddenNote}
              hiddenFirst={detail.meta?.hiddenFirst === "1"}
            />
          ) : (
            <>
              <div className="app-nav">
                <button aria-label="返回" onClick={back}>
                  <ChevronLeft size={23} />
                </button>
                <strong>{detail.title}</strong>
                <span />
              </div>
              {detailView}
            </>
          ))}
      </>
    );
  return (
    <>
      <div className="app-nav">
        <button onClick={back} aria-label="返回">
          <ChevronLeft size={23} />
          {detail || thread ? "返回" : ""}
        </button>
        <strong>{thread || name}</strong>
        <button
          onClick={
            creator
              ? onAdd
              : () =>
                  document
                    .querySelector<HTMLInputElement>(
                      ".app-screen .phone-search input",
                    )
                    ?.focus()
          }
          aria-label={creator ? "新增内容" : "搜索内容"}
        >
          {creator ? <Plus size={22} /> : <Search size={20} />}
        </button>
      </div>
      {app.id === "settings" && !detail ? (
        <NativeSettings
          work={work}
          items={items}
          creator={creator}
          onItem={read}
          onSettings={onSettings}
          onRestart={onRestart}
          onJumpMode={onJumpMode}
          onJumpFirst={onJumpFirst}
          onJumpSecond={onJumpSecond}
          onJumpSms={onJumpSms}
          onJumpEnd={onJumpEnd}
        />
      ) : app.id === "calculator" && !detail ? (
        <NativeCalculator
          items={shown}
          onRead={read}
          ui={state.ui?.[app.id]}
          onUi={onUi}
        />
      ) : detail ? (
        detailView
      ) : app.engine === "messaging" && thread ? (
        <div className="chat-content">
          <div className="chat-time">2026 年 9 月 1 日</div>
          {shown
            .filter((i) => i.title === thread)
            .map((i) => (
              <button
                key={i.id}
                className={`message-row ${i.outgoing ? "outgoing" : ""}`}
                onClick={() => (creator ? onEdit(i) : onRead(i.id))}
              >
                <span className="avatar">{i.sender.slice(0, 1)}</span>
                <span className="bubble">
                  {i.kind === "image" ||
                  i.kind === "audio" ||
                  i.kind === "video" ? (
                    <Media item={i} />
                  ) : i.kind === "transfer" ? (
                    <span className="transfer">
                      ¥ {i.body}
                      <small>转账记录</small>
                    </span>
                  ) : (
                    i.body
                  )}
                  <small>
                    {i.time.slice(-5)} {i.read ? "✓✓" : ""}
                  </small>
                  {creator && (i.hidden || i.unlock) && (
                    <LockKeyhole size={12} />
                  )}
                </span>
              </button>
            ))}
          {creator ? (
            <button className="chat-compose" onClick={onAdd}>
              ＋ 添加一条消息
            </button>
          ) : (
            <div className="chat-compose muted">
              根据剧情推进，互动回复将在这里出现。
            </div>
          )}
        </div>
      ) : (
        <div
          className={`phone-content ${app.engine === "social" ? "feed-content" : ""}`}
        >
          {app.engine !== "media" && (
            <div className="phone-search">
              <Search size={15} />
              <input
                placeholder={`搜索${name}`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          )}
          {app.engine === "messaging" ? (
            chats.map((t) => {
              const list = shown.filter((i) => i.title === t),
                last = list[list.length - 1];
              return (
                <button
                  className="contact-row"
                  key={t}
                  onClick={() => {
                    setThread(t);
                    onRead(t);
                  }}
                >
                  <span className="avatar" style={{ background: app.color }}>
                    {t.slice(0, 1)}
                  </span>
                  <span>
                    <strong>{t}</strong>
                    <p>{last.body}</p>
                  </span>
                  <small>{last.time.slice(-5)}</small>
                </button>
              );
            })
          ) : app.engine === "media" ? (
            <>
              <div className="media-heading">
                <h1>{tab}</h1>
                <p>{filtered.length} 个故事片段</p>
              </div>
              <div className="media-grid">
                {filtered.map((i) => (
                  <button key={i.id} onClick={() => read(i)}>
                    <Media item={i} />
                    <span>
                      {i.title} {creator && i.hidden ? "· 隐藏" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : app.engine === "social" ? (
            filtered.map((i) => (
              <article className="social-post" key={i.id}>
                <div className="post-author">
                  <span className="avatar" style={{ background: app.color }}>
                    {i.sender.slice(0, 1)}
                  </span>
                  <div>
                    <strong>{i.sender}</strong>
                    <small>{i.time}</small>
                  </div>
                  <button aria-label="查看帖子详情" onClick={() => read(i)}>
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <button className="post-image" onClick={() => read(i)}>
                  <Media item={i} />
                </button>
                <div className="post-actions">
                  <button
                    aria-label="点赞"
                    onClick={() =>
                      setLikes(
                        likes.includes(i.id)
                          ? likes.filter((id) => id !== i.id)
                          : [...likes, i.id],
                      )
                    }
                  >
                    <Heart
                      size={22}
                      fill={likes.includes(i.id) ? "#d67670" : "none"}
                    />
                  </button>
                  <button aria-label="查看评论" onClick={() => read(i)}>
                    <MessageCircle size={22} />
                  </button>
                  <small>
                    {i.likes + (likes.includes(i.id) ? 1 : 0)} 次喜欢
                  </small>
                </div>
                <button className="post-text" onClick={() => read(i)}>
                  <strong>{i.title}</strong>
                  <p>{i.body}</p>
                </button>
              </article>
            ))
          ) : (
            filtered.map((i) => (
              <button
                key={i.id}
                className={`record-row ${app.engine === "document" ? "document-row" : ""}`}
                onClick={() => read(i)}
              >
                <div className="record-symbol">
                  {app.engine === "records" ? (
                    <app.icon size={20} />
                  ) : (
                    <span>{i.title.slice(0, 1)}</span>
                  )}
                </div>
                <div>
                  <strong>{i.title}</strong>
                  <p>{i.body.split("\n")[0]}</p>
                  <small>
                    {i.time} {i.folder && `· ${i.folder}`}
                  </small>
                </div>
                {i.password || i.hidden ? (
                  <LockKeyhole size={14} />
                ) : (
                  <ChevronLeft className="chevron-right" size={16} />
                )}
              </button>
            ))
          )}
          {!filtered.length && app.engine !== "messaging" && (
            <div className="empty-app">
              <app.icon size={36} />
              <h3>这一页还很安静</h3>
              <p>
                {creator
                  ? "添加属于这个 App 的故事内容。"
                  : "暂时没有可浏览的内容。"}
              </p>
            </div>
          )}
          {creator && (
            <button className="phone-add" onClick={onAdd}>
              <Plus size={15} />
              添加
              {app.engine === "messaging"
                ? "聊天"
                : app.engine === "social"
                  ? "帖子"
                  : app.engine === "media"
                    ? "素材"
                    : "内容"}
            </button>
          )}
        </div>
      )}
      {!detail &&
        !thread &&
        app.id !== "calculator" &&
        app.id !== "settings" && (
          <div className="app-tabs">
            {app.tabs.map((t, i) => (
              <button
                key={t}
                className={tab === t ? "selected" : ""}
                onClick={() => setTab(t)}
              >
                {i === 0 ? (
                  <MessageCircle size={17} />
                ) : i === 1 ? (
                  <Search size={17} />
                ) : (
                  <UsersIcon />
                )}
                <span>{t}</span>
              </button>
            ))}
          </div>
        )}
    </>
  );
}
function UsersIcon() {
  return <PhoneIcon size={17} />;
}
