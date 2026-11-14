import { NativeComposer, KeyboardContext } from "./DeviceSystem";
import { useSkinState } from "./skinState";
import {
  useState,
  useEffect,
  useLayoutEffect,
  useContext,
  useRef,
  Fragment,
  type ReactNode,
} from "react";
import {
  ChevronLeft,
  Plus,
  CirclePlus,
  Search,
  MessageCircle,
  Users,
  Compass,
  User,
  Camera,
  Phone,
  Video,
  Settings,
  Heart,
  Send,
  Home,
  Play,
  Bookmark,
  MoreHorizontal,
  Mic,
  Smile,
  Grid,
  CheckCheck,
  AtSign,
  Star,
  Music,
  Image as ImageIcon,
  Layers,
  ShoppingBag,
  LockKeyhole,
} from "lucide-react";
import { safeMedia, type Item, type UiValue } from "./schema";
// 剧情弹窗：文本 / 表情包图片 / 自动消失时长 / 交互按钮
export type StoryTip = {
  text?: string;
  image?: string;
  hold?: number;
  /** 顶部悬浮胶囊样式（与相机开场提示一致），不弹白色卡片 */
  inline?: boolean;
  choices?: { label: string; onPick: () => void }[];
};
export type SkinProps = {
  ui?: Record<string, UiValue>;
  onUi?: (key: string, value: UiValue) => void;
  appId?: string;
  owner?: string;
  virtualTime?: string;
  virtualDate?: string;
  name: string;
  items: Item[];
  creator: boolean;
  onRead: (id: string) => void;
  onItem: (i: Item) => void;
  onAdd: () => void;
  onBack: () => void;
  thread: string;
  onThread: (s: string) => void;
  variables?: Record<string, string | number | boolean>;
  hiddenPhoto?: string;
  onNotify?: (texts: string[]) => void;
  onStoryTip?: (tip: string | StoryTip) => void;
  onStage5End?: () => void;
  onStage6End?: () => void;
  onStage6SmsEnd?: () => void;
};
function Avatar({
  name,
  round = false,
  src = "",
}: {
  name: string;
  round?: boolean;
  src?: string;
}) {
  return (
    <span className={`skin-avatar ${round ? "round" : ""}`}>
      {safeMedia(src)?.startsWith("data:image/") ? (
        <img src={safeMedia(src)} alt="" />
      ) : (
        name.slice(0, 1)
      )}
    </span>
  );
}
function WeChatGroupAvatar({
  items,
  names,
  owner,
  ownerAvatar,
}: {
  items: Item[];
  names: string[];
  owner?: string;
  ownerAvatar: string;
}) {
  const rows = [names.slice(0, 2), names.slice(2, 5)];
  return (
    <span className="wx-group-composite">
      {rows.map((row, index) => (
        <span className="wx-group-row" key={index}>
          {row.map((name) => (
            <Avatar
              key={name}
              name={name}
              src={
                name === owner
                  ? ownerAvatar
                  : items.find((i) => i.sender === name)?.avatar
              }
            />
          ))}
        </span>
      ))}
    </span>
  );
}
function dateLabel(time = "") {
  return time.length > 5 ? time.slice(0, -5).trim() : "";
}
function ItemMedia({ item }: { item: Item }) {
  const src = safeMedia(item.media);
  return src ? (
    item.kind === "audio" ? (
      <audio controls src={src} />
    ) : item.kind === "video" ? (
      <video controls playsInline src={src} />
    ) : (
      <img loading="lazy" alt={item.title} src={src} />
    )
  ) : (
    <div className="skin-photo">
      <span>{item.title}</span>
    </div>
  );
}
// 微信经典表情：把 [拥抱] 渲染成表情图，而不是方括号文字
export function HugEmoji({ small = false }: { small?: boolean }) {
  return (
    <span className={`wx-emoji${small ? " sm" : ""}`} aria-label="拥抱" role="img">
      <svg viewBox="0 0 64 64">
        <g stroke="#EFBB00" strokeWidth="1.6">
          <circle cx="41" cy="26" r="12" fill="#FFD84D" />
          <path
            d="M47 34c5 1 8-2 9-6"
            fill="none"
            stroke="#F2B600"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <circle cx="25" cy="35" r="17" fill="#FFE066" />
          <path
            d="M10 40C6 36 6 30 9 26"
            fill="none"
            stroke="#F2B600"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <path
            d="M38 43c6 0 10-2 12-5"
            fill="none"
            stroke="#F2B600"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <path
            d="M18 33c1.6 2 3.8 2 5.4 0M29 33c1.6 2 3.8 2 5.4 0"
            fill="none"
            stroke="#7A4A00"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M22 40c2.6 2.6 6 2.6 8.4 0"
            fill="none"
            stroke="#7A4A00"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <ellipse cx="15.5" cy="39" rx="3.4" ry="2.2" fill="#FFB0B6" stroke="none" />
          <ellipse cx="35" cy="40" rx="3" ry="2" fill="#FFB0B6" stroke="none" />
        </g>
      </svg>
    </span>
  );
}

export function WxText({ text, small = false }: { text: string; small?: boolean }) {
  if (!text || !text.includes("[拥抱]")) return <>{text}</>;
  const parts = text.split("[拥抱]");
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && <HugEmoji small={small} />}
          {part}
        </Fragment>
      ))}
    </>
  );
}

function MessageList({
  items,
  creator,
  onItem,
  onRead,
  whatsapp = false,
  ownerAvatar = "",
  scrollToken,
  scrollToTop = false,
  footer,
  nameOf = (name: string) => name,
}: {
  items: Item[];
  creator: boolean;
  onItem: (i: Item) => void;
  onRead: (id: string) => void;
  whatsapp?: boolean;
  ownerAvatar?: string;
  scrollToken?: string;
  scrollToTop?: boolean;
  footer?: ReactNode;
  nameOf?: (name: string) => string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(!scrollToTop);
  useLayoutEffect(() => {
    if (!scrollToken) return;
    const el = box.current;
    if (!el) return;
    stick.current = !scrollToTop;
    const jump = () => {
      el.scrollTop = scrollToTop ? 0 : el.scrollHeight;
    };
    jump();
    const raf = requestAnimationFrame(jump);
    return () => cancelAnimationFrame(raf);
  }, [scrollToken, scrollToTop]);
  useEffect(() => {
    if (!scrollToken) return;
    const el = box.current;
    if (!el) return;
    if (scrollToTop) return;
    const jump = () => {
      el.scrollTop = el.scrollHeight;
    };
    const timer = setTimeout(jump, 60);
    return () => clearTimeout(timer);
  }, [items.length, scrollToken, scrollToTop]);
  // 新内容（逐句弹出的 scripted 消息）出现时自动跟随到底部
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const syncStick = () => {
      // 键盘弹出会把可视区压矮近 370px，阈值放宽避免误判为"用户上滑"
      stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 420;
    };
    el.addEventListener("wheel", syncStick, { passive: true });
    el.addEventListener("touchmove", syncStick, { passive: true });
    const toBottom = () => {
      if (!stick.current) return;
      el.scrollTop = el.scrollHeight;
      requestAnimationFrame(() => {
        if (stick.current) el.scrollTop = el.scrollHeight;
      });
    };
    const obs = new MutationObserver(toBottom);
    obs.observe(el, { childList: true, subtree: true, characterData: true });
    const ro = new ResizeObserver(toBottom);
    ro.observe(el);
    return () => {
      el.removeEventListener("wheel", syncStick);
      el.removeEventListener("touchmove", syncStick);
      obs.disconnect();
      ro.disconnect();
    };
  }, [scrollToken]);
  return (
    <div ref={box} className={`skin-messages ${whatsapp ? "wa-wallpaper" : ""}`}>
      <div className="skin-date">
        {dateLabel(items[0]?.time)
          ? items[0].time
          : items[0]?.time.slice(0, 10)}
      </div>
      {items.map((i, n) => {
        const label = dateLabel(i.time);
        const showDate =
          n > 0 &&
          (!!label && label !== dateLabel(items[n - 1].time)
            ? true
            : i.meta?.dateBreak === "1");
        const groupIncoming =
          !whatsapp && !i.outgoing && i.meta?.variant === "group";
        const bubble = (
          <button
            className={`skin-bubble ${["image", "video"].includes(i.kind) ? "is-media" : ""}`}
            onClick={() => (creator ? onItem(i) : onRead(i.id))}
          >
            {["image", "audio", "video"].includes(i.kind) ? (
              <ItemMedia item={i} />
            ) : i.kind === "transfer" ? (
              <div className="skin-transfer">
                ¥ {i.body}
                <small>转账记录</small>
              </div>
            ) : (
              <WxText text={i.body} />
            )}
            <small className={whatsapp ? undefined : "wx-message-time"}>
              {i.time.slice(-5)} {whatsapp && i.outgoing && <CheckCheck size={11} />}
            </small>
          </button>
        );
        return (
          <Fragment key={i.id}>
            {showDate && <div className="skin-date">{i.time}</div>}
            {i.meta?.groupSystem === "1" ? (
              <div className="wx-group-system">{i.body}</div>
            ) : (
              <div className={`skin-message ${i.outgoing ? "outgoing" : ""}`}>
                {!whatsapp && !i.outgoing && (
                  <Avatar name={nameOf(i.sender)} src={i.avatar} />
                )}
                {groupIncoming ? (
                  <div className="skin-message-stack">
                    <span className="wx-group-name">{nameOf(i.sender)}</span>
                    {bubble}
                  </div>
                ) : (
                  bubble
                )}
                {!whatsapp && i.outgoing && (
                  <Avatar name={i.sender} src={ownerAvatar || i.avatar} />
                )}
              </div>
            )}
          </Fragment>
        );
      })}
      {footer}
    </div>
  );
}
function Compose({
  creator,
  onAdd,
  wa = false,
}: {
  creator: boolean;
  onAdd: () => void;
  wa?: boolean;
}) {
  return (
    <div className={`skin-compose ${wa ? "wa-compose" : ""}`}>
      {wa ? <Plus size={20} /> : <Mic size={20} />}
      <NativeComposer creator={creator} onAdd={onAdd} />

      <Smile size={21} />
      {wa ? <Mic size={20} /> : <Plus size={22} />}
    </div>
  );
}
function ScriptedMessage({
  outgoing = false,
  avatar,
  time,
  photo,
  children,
}: {
  outgoing?: boolean;
  avatar: ReactNode;
  time: string;
  photo?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`skin-message ${outgoing ? "outgoing" : ""}`}>
      {!outgoing && avatar}
      <span className={`skin-bubble ${photo ? "is-media" : ""}`}>
        {photo ? (
          <img className="wx-script-photo" src={photo} alt="四重奏生日蛋糕" />
        ) : (
          children
        )}
        <small className="wx-message-time">{time}</small>
      </span>
      {outgoing && avatar}
    </div>
  );
}

// ---- Stage 5: 左航新 scripted 对话 + 键盘打字动画 ----
type S5Line = {
  who: "zuohang" | "owner";
  text: string;
  typed?: boolean; // 在键盘输入框里逐字打出中文
  pinyin?: string; // 每个字对应的拼音（驱动键盘按键动画，空格分隔）
  typing?: boolean; // 显示"正在输入"提示
  hold?: boolean; // 打完不发送，停在输入框中
};
const S5_LEFTANG: S5Line[] = [
  { who: "zuohang", text: "真不在？" },
  { who: "owner", text: "……", typed: true },
  { who: "zuohang", text: "你又闹什么脾气？", typing: true },
  { who: "owner", text: "明明", typed: true, pinyin: "ming ming" },
  { who: "owner", text: "明明是你囚禁的我", typed: true, pinyin: "ming ming shi ni qiu jin de wo" },
  { who: "owner", text: "明明是你把我关起来的", typed: true, pinyin: "ming ming shi ni ba wo guan qi lai de" },
  { who: "owner", text: "为什么这样做了之后", typed: true, pinyin: "wei shen me zhe yang zuo le zhi hou" },
  { who: "owner", text: "又不理我了", typed: true, pinyin: "you bu li wo le" },
  { who: "owner", text: "你把我当什么了", typed: true, pinyin: "ni ba wo dang shen me le" },
  { who: "owner", text: "当玩物？", typed: true, pinyin: "dang wan wu" },
  { who: "zuohang", text: "这都什么和什么啊", typing: true },
  { who: "zuohang", text: "你是不是又犯毛病了", typing: true },
  { who: "zuohang", text: "不是你让我关的你吗" },
  { who: "owner", text: "我……", typed: true, pinyin: "wo", hold: true },
];

// 中文 -> 逐字拼音（用于按键动画）；标点也给一组按键，保证每句话都有键盘动作
const S5_PUNCT: Record<string, string> = {
  "…": "dian",
  "？": "wen",
  "！": "wen",
  "。": "ju",
  "，": "dou",
};
function lettersFor(text: string, pinyin?: string) {
  const words = (pinyin ?? "").split(/\s+/).filter(Boolean);
  let w = 0;
  return [...text].map((c) =>
    /[\u4e00-\u9fa5]/.test(c)
      ? (words[w++] ?? "")
      : (S5_PUNCT[c] ?? ""),
  );
}

// 「我……」打完后顶部连弹的微信通知
const S5_BANNERS = [
  "微信：张极：左航找你都找疯了",
  "微信：苏新皓：本来想给你庆祝的",
  "微信：张泽禹：现在连左航消息都不回了？？？",
  "微信：妈妈：妈妈只想你开心",
  "微信：四个等一个：快找",
];

// 需要玩家逐一看完的新会话
const REVEAL_CHATS = ["张极", "苏新皓", "张泽禹", "妈妈", "四个等一个"];
// 群名带人数后缀（四个等一个（5）），用前缀匹配
const isRevealChat = (title: string) =>
  REVEAL_CHATS.some(
    (t) => title === t || title.startsWith(`${t}（`) || title.startsWith(`${t}(`),
  );

function StageFiveLeftang({
  start,
  ownerAvatar,
  peerAvatar,
  time,
  onNotify,
  onStage5End,
  ui,
  onUi,
}: {
  start: boolean;
  ownerAvatar: ReactNode;
  peerAvatar: ReactNode;
  time: string;
  onNotify?: (texts: string[]) => void;
  onStage5End?: () => void;
  ui?: Record<string, UiValue>;
  onUi?: (key: string, value: UiValue) => void;
}) {
  // active = 正在处理的句子；shown = 已发送、已渲染成气泡的句子数
  // 进度写入界面状态，退出再进入不会从头重播
  const [active, setActive] = useState(() =>
    Math.min(S5_LEFTANG.length, Math.max(0, Number(ui?.stage5Active ?? 0) || 0)),
  );
  const [shown, setShown] = useState(() =>
    Math.min(S5_LEFTANG.length, Math.max(0, Number(ui?.stage5Shown ?? 0) || 0)),
  );
  // 这段动画只放一次，放完标记，重进不再重播
  const [finished, setFinished] = useState(() => ui?.stage5Done === true);
  const openKeyboard = useContext(KeyboardContext);
  // 回调用 ref 存，避免父组件每次 render 新引用打断动画定时器
  const onUiRef = useRef(onUi);
  onUiRef.current = onUi;
  const onNotifyRef = useRef(onNotify);
  onNotifyRef.current = onNotify;
  const onStage5EndRef = useRef(onStage5End);
  onStage5EndRef.current = onStage5End;

  useEffect(() => {
    onUiRef.current?.("stage5Active", active);
  }, [active]);
  useEffect(() => {
    onUiRef.current?.("stage5Shown", shown);
  }, [shown]);

  useEffect(() => {
    if (!start || finished) return;
    if (active >= S5_LEFTANG.length) return;
    const line = S5_LEFTANG[active];
    const timers: number[] = [];
    // 一句话发送后，间隔 1.3s 再开始下一句
    const send = (delay: number) => {
      timers.push(
        window.setTimeout(() => {
          setShown(active + 1);
          if (line.hold) return;
          timers.push(
            window.setTimeout(() => setActive(active + 1), 1300),
          );
        }, delay),
      );
    };

    if (line.who === "owner" && line.typed) {
      const speed = 340;
      openKeyboard(true, {
        text: line.text,
        letters: lettersFor(line.text, line.pinyin),
        speed,
      });
      timers.push(
        window.setTimeout(
          () => {
            if (line.hold) {
              // 「我……」停在输入框不发送，紧接着顶部连弹通知、并完成这段对话
              onUiRef.current?.("stage5Done", true);
              setFinished(true);
              onNotifyRef.current?.(S5_BANNERS);
              onStage5EndRef.current?.();
              return;
            }
            // 保持键盘打开、只清空草稿，避免输入条反复出现导致布局跳动
            openKeyboard(true, { text: "" });
            send(0);
          },
          [...line.text].length * speed + 120,
        ),
      );
      return () => timers.forEach((t) => window.clearTimeout(t));
    }

    send(line.typing ? 900 : 400);
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [start, active, finished, openKeyboard]);

  useEffect(() => {
    if (!start) return;
    return () => openKeyboard(false);
  }, [start, openKeyboard]);

  return (
    <>
      <div className="wx-script-date">2026年11月1日 23:03</div>
      <ScriptedMessage outgoing avatar={ownerAvatar} time="23:03">
        我走了，别找我。
      </ScriptedMessage>
      <div className="wx-script-date">2026年11月1日 23:31</div>
      {S5_LEFTANG.slice(0, shown).map((l, i) => {
        const outgoing = l.who === "owner";
        return (
          <ScriptedMessage
            key={i}
            outgoing={outgoing}
            avatar={outgoing ? ownerAvatar : peerAvatar}
            time={time}
          >
            {l.text}
          </ScriptedMessage>
        );
      })}
    </>
  );
}

// ---- Stage 6: 左航【想起来没？】后的对话（接在 Stage5 之后，动画设置一致）----
const S6_LEFTANG: S5Line[] = [
  { who: "owner", text: "我", typed: true, pinyin: "wo" },
  { who: "owner", text: "我这是", typed: true, pinyin: "wo zhe shi" },
  { who: "zuohang", text: "很神奇吧", typing: true },
  { who: "zuohang", text: "其实", typing: true },
  { who: "zuohang", text: "我也不知道你这是怎么了", typing: true },
  { who: "zuohang", text: "这段时间", typing: true },
  { who: "zuohang", text: "你老说我囚禁了你什么的", typing: true },
  { who: "zuohang", text: "一开始", typing: true },
  { who: "zuohang", text: "我只当那是你的一点……", typing: true },
  { who: "zuohang", text: "个人趣味", typing: true },
  { who: "zuohang", text: "毕竟你在国外待过", typing: true },
  { who: "zuohang", text: "时间久了我就发现", typing: true },
  { who: "zuohang", text: "好像有些不对劲", typing: true },
  { who: "zuohang", text: "我只好自己去问心理医生", typing: true },
  { who: "owner", text: "为什么不带我去", typed: true, pinyin: "wei shen me bu dai wo qu" },
  { who: "zuohang", text: "你不去啊", typing: true },
  { who: "zuohang", text: "我一说你是不是有毛病你就闹", typing: true },
  { who: "zuohang", text: "你看我敢吗？", typing: true },
  { who: "owner", text: "……哦", typed: true, pinyin: "o" },
  { who: "owner", text: "那你刚刚还说我犯病😭", typed: true, pinyin: "na ni gang gang hai shuo wo fan bing" },
  { who: "zuohang", text: "实话实话", typing: true },
  { who: "zuohang", text: "谢谢", typing: true },
  { who: "zuohang", text: "而且我真的以为你这几天这么安静", typing: true },
  { who: "zuohang", text: "是好了的意思", typing: true },
  { who: "zuohang", text: "因为医生说可能是压力太大导致的", typing: true },
  { who: "zuohang", text: "我想事情都解决了", typing: true },
  { who: "zuohang", text: "压力的来源都消失了", typing: true },
  { who: "zuohang", text: "那应该是好了", typing: true },
  { who: "zuohang", text: "原来是疯了", typing: true },
  { who: "owner", text: "😭😭😭" },
  { who: "zuohang", text: "快回家", typing: true },
  { who: "zuohang", text: "大家都在等你", typing: true },
  { who: "owner", text: "左航", typed: true, pinyin: "zuo hang" },
  { who: "owner", text: "我很想你", typed: true, pinyin: "wo hen xiang ni" },
  { who: "zuohang", text: "我知道", typing: true },
  { who: "zuohang", text: "对不起", typing: true },
  { who: "zuohang", text: "明明是想给你惊喜的", typing: true },
  { who: "zuohang", text: "却反倒把你吓坏了", typing: true },
  { who: "owner", text: "我刚刚不小心把手机摔地上了", typed: true, pinyin: "wo gang gang bu xiao xin ba shou ji shuai di shang le" },
  { who: "owner", text: "沾了好多泥", typed: true, pinyin: "zhan le hao duo ni" },
  { who: "owner", text: "忽然觉得", typed: true, pinyin: "hu ran jue de" },
  { who: "owner", text: "也许它也在暗示我那些都过去了", typed: true, pinyin: "ye xu ta ye zai an shi wo na xie dou guo qu le" },
  { who: "zuohang", text: "丢了", typing: true },
  { who: "zuohang", text: "给你买了新的", typing: true },
  { who: "zuohang", text: "把过去的那些", typing: true },
  { who: "zuohang", text: "令人作呕的", typing: true },
  { who: "zuohang", text: "不愿想起的事情", typing: true },
  { who: "zuohang", text: "一起丢掉吧", typing: true },
  { who: "zuohang", text: "我们回家", typing: true },
  { who: "owner", text: "回我们的家？", typed: true, pinyin: "hui wo men de jia" },
  { who: "zuohang", text: "对", typing: true },
  { who: "zuohang", text: "我们的家", typing: true },
  { who: "owner", text: "你这样说", typed: true, pinyin: "ni zhe yang shuo" },
  { who: "owner", text: "让我好想把你关起来", typed: true, pinyin: "rang wo hao xiang ba ni guan qi lai" },
  { who: "zuohang", text: "能出门不？", typing: true },
  { who: "owner", text: "不可以", typed: true, pinyin: "bu ke yi" },
  { who: "owner", text: "你被我囚禁了", typed: true, pinyin: "ni bei wo qiu jin le" },
  { who: "zuohang", text: "能打瓦不？", typing: true },
  { who: "owner", text: "可以吧", typed: true, pinyin: "ke yi ba" },
  { who: "zuohang", text: "行", typing: true },
  { who: "zuohang", text: "那你关吧", typing: true },
  { who: "zuohang", text: "快回家", typing: true },
  { who: "owner", text: "好", typed: true, pinyin: "hao" },
];

function StageSixThread({
  start,
  done,
  ownerAvatar,
  peerAvatar,
  time,
  onStage6End,
  ui,
  onUi,
}: {
  start: boolean;
  done: boolean;
  ownerAvatar: ReactNode;
  peerAvatar: ReactNode;
  time: string;
  onStage6End?: () => void;
  ui?: Record<string, UiValue>;
  onUi?: (key: string, value: UiValue) => void;
}) {
  // Stage5 已发送的部分（去掉停在输入框的「我……」）
  const base = S5_LEFTANG.filter((l) => !l.hold);
  const [active, setActive] = useState(() =>
    Math.min(S6_LEFTANG.length, Math.max(0, Number(ui?.stage6Active ?? 0) || 0)),
  );
  const [shown, setShown] = useState(() =>
    Math.min(S6_LEFTANG.length, Math.max(0, Number(ui?.stage6Shown ?? 0) || 0)),
  );
  const openKeyboard = useContext(KeyboardContext);
  useEffect(() => {
    onUi?.("stage6Active", active);
  }, [active]);
  useEffect(() => {
    onUi?.("stage6Shown", shown);
  }, [shown]);
  const bubble = (l: S5Line, i: number, key: string) => {
    const outgoing = l.who === "owner";
    return (
      <ScriptedMessage
        key={key}
        outgoing={outgoing}
        avatar={outgoing ? ownerAvatar : peerAvatar}
        time={time}
      >
        {l.text}
      </ScriptedMessage>
    );
  };
  useEffect(() => {
    if (!start || done) return;
    if (active >= S6_LEFTANG.length) return;
    const line = S6_LEFTANG[active];
    const last = active === S6_LEFTANG.length - 1;
    const timers: number[] = [];
    const send = (delay: number) => {
      timers.push(
        window.setTimeout(() => {
          setShown(active + 1);
          if (last) {
            // 对话放完 → 通知 Phone 走弹窗剧情
            onStage6End?.();
            return;
          }
          timers.push(
            window.setTimeout(() => setActive(active + 1), 1300),
          );
        }, delay),
      );
    };

    if (line.who === "owner" && line.typed) {
      const speed = 340;
      openKeyboard(true, {
        text: line.text,
        letters: lettersFor(line.text, line.pinyin),
        speed,
      });
      timers.push(
        window.setTimeout(
          () => {
            openKeyboard(true, { text: "" });
            send(0);
          },
          [...line.text].length * speed + 120,
        ),
      );
      return () => timers.forEach((t) => window.clearTimeout(t));
    }

    send(line.who === "owner" ? 400 : line.typing ? 900 : 400);
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, active, done]);

  useEffect(() => {
    if (!start || done) return;
    return () => openKeyboard(false);
  }, [start, done, openKeyboard]);

  if (done)
    return (
      <>
        <div className="wx-script-date">2026年11月1日 23:03</div>
        <ScriptedMessage outgoing avatar={ownerAvatar} time="23:03">
          我走了，别找我。
        </ScriptedMessage>
        <div className="wx-script-date">2026年11月1日 23:31</div>
        {base.map((l, i) => bubble(l, i, `b${i}`))}
        <div className="wx-script-date">2026年11月2日 00:02</div>
        <ScriptedMessage avatar={peerAvatar} time="00:02">
          想起来没？
        </ScriptedMessage>
        {S6_LEFTANG.map((l, i) => bubble(l, i, `s6-${i}`))}
      </>
    );
  return (
    <>
      <div className="wx-script-date">2026年11月1日 23:03</div>
      <ScriptedMessage outgoing avatar={ownerAvatar} time="23:03">
        我走了，别找我。
      </ScriptedMessage>
      <div className="wx-script-date">2026年11月2日 00:02</div>
      {base.map((l, i) => bubble(l, i, `b${i}`))}
      <ScriptedMessage avatar={peerAvatar} time="00:02">
        想起来没？
      </ScriptedMessage>
      {S6_LEFTANG.slice(0, shown).map((l, i) => bubble(l, i, `s6-${i}`))}
    </>
  );
}

export function WeChatSkin(p: SkinProps) {
  const [tab, setTab] = useState("微信"),
    [query, setQuery] = useState(""),
    [moments, setMoments] = useState(false),
    [menu, setMenu] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [utility, setUtility] = useState(""),
    [lockTip, setLockTip] = useState("");
  const openedThreads = useRef<Set<string>>(new Set());
  const [pinnedThreads, setPinnedThreads] = useState<Record<string, boolean>>(
    {},
  );
  // 已看过的五个新会话：写入界面状态，切 App / 刷新后不用重新点开
  const [revealRead, setRevealRead] = useState<string[]>(() => {
    const saved = p.ui?.revealRead;
    return Array.isArray(saved) ? saved : [];
  });
  const tipTimer = useRef(0);
  const momentLocked =
    !p.creator && p.variables?.["wxUnlock:moments"] !== true;
  const stage5Done = p.ui?.stage5Done === true;
  const truthUnlocked =
    p.variables?.["wechatTruthUnlocked"] === true;
  // 剧情推进后，左航的备注改成「小航」
  const wxName = (name: string) =>
    name === "左航" && p.variables?.["wxLeftangRemark"] === true
      ? "小航"
      : name;
  const variantOf = (i: Item) => i.meta?.variant || "";
  // 左航的隐藏聊天记录必须等 Stage5 动画完全播完（stage5Done）才能显示，
  // 避免动画还在播放时 hidden 消息就插进来。其他五个会话不受影响。
  const threadItems = (thread: string) =>
    p.items
      .filter((i) => i.title === thread)
      .filter((i) => {
        const v = variantOf(i);
        if (!v) return true;
        if (v === "group") return true;
        // 未解锁：只显示 cold（最早的聊天记录）
        // 已解锁：cold + warm + hidden 全部显示
        // 左航额外限制：Stage5 动画没播完前，hidden 不显示
        if (thread === "左航" && v === "hidden" && !stage5Done) return false;
        return truthUnlocked ? true : v === "cold";
      });
  const openThread = (thread: string) => {
    if (!openedThreads.current.has(thread)) {
      openedThreads.current.add(thread);
      setPinnedThreads((m) => ({ ...m, [thread]: true }));
    }
    if (isRevealChat(thread) && !revealRead.includes(thread)) {
      const next = [...revealRead, thread];
      setRevealRead(next);
      p.onUi?.("revealRead", next);
    }
    p.onThread(thread);
    p.onRead(thread);
  };
  const closeThread = () => {
    const thread = p.thread;
    setPinnedThreads((m) => {
      if (!m[thread]) return m;
      const next = { ...m };
      delete next[thread];
      return next;
    });
    p.onThread("");
  };
  const openMoments = () => {
    if (momentLocked) {
      setLockTip("朋友圈暂时还不能查看");
      setTimeout(() => setLockTip(""), 1600);
      return;
    }
    setMoments(true);
  };
  const lockEntry = (label: string) => {
    setLockTip(`${label}暂时还不能查看`);
    setTimeout(() => setLockTip(""), 1600);
  };
  const wxLeftangNew =
    !p.creator && p.variables?.["wxLeftangNew"] === true;
  const stage6Started =
    !p.creator && p.variables?.["wxStage6"] === true;
  const stage6Done = p.ui?.stage6Done === true;
  const stage6Thread = stage6Started && p.thread === "左航";
  const stage5Thread =
    wxLeftangNew && !stage6Started && p.thread === "左航";
  // 五个新会话全部看完、回到列表后 1 秒提示去看别的 App
  useEffect(() => {
    if (p.creator || !wxLeftangNew || stage6Started) return;
    if (p.thread || revealRead.length < REVEAL_CHATS.length) return;
    if (p.ui?.revealTip === true || tipTimer.current) return;
    tipTimer.current = window.setTimeout(() => {
      p.onUi?.("revealTip", true);
      p.onStoryTip?.(
        "现在再去其他软件看看吧，理应还有一些信息被遗漏了。",
      );
    }, 1000);
  }, [p, wxLeftangNew, revealRead]);
  const conversations = [
    ...new Set(
      p.items
        .filter((i) => !["朋友圈", "我", "通讯录", "__profile__"].includes(i.folder))
        .map((i) => i.title),
    ),
  ];
  const contacts = [
    ...new Set(
      p.items
        .filter((i) => !["朋友圈", "__profile__"].includes(i.folder))
        .map((i) => i.sender)
        .filter((s) => s !== "我" && s !== (p.owner || "机主")),
    ),
  ].sort((a, b) => a.localeCompare(b, "zh-CN"));
  const profile = p.items.find((i) => i.folder === "__profile__");
  const posts = p.items.filter(
    (i) => i.folder === "朋友圈" || i.kind === "post",
  );
  const ownerAvatar =
    profile?.avatar ||
    p.items.find((i) => i.avatar && i.sender === (p.owner || "机主"))?.avatar ||
    "";
  return (
    <div
      className="wechat-ui independent-skin"
      data-tab={tab}
      data-thread={!!p.thread}
      data-moments={moments}
      data-utility={!!utility}
    >
      <div className="app-nav wx-nav">
        <button
          aria-label={utility || p.thread || moments ? "返回" : "收藏"}
          onClick={() =>
            utility
              ? setUtility("")
              : p.thread
                ? closeThread()
                : moments
                  ? setMoments(false)
                  : setUtility("收藏")
          }
        >
          {utility || p.thread || moments ? (
            <ChevronLeft size={22} />
          ) : (
            <Star size={22} />
          )}
        </button>
        <strong>
          {utility ||
            wxName(p.thread) ||
            (moments ? "朋友圈" : tab === "微信" ? p.name : tab)}
        </strong>
        <button
          aria-label={
            p.creator ? "新增内容" : p.thread ? "聊天详情" : "微信菜单"
          }
          onClick={
            p.creator
              ? p.onAdd
              : () => (p.thread ? setUtility("聊天信息") : setMenu(!menu))
          }
        >
          {p.thread ? <MoreHorizontal size={22} /> : <CirclePlus size={22} />}
        </button>
      </div>
      {menu && (
        <div className="wx-popup-menu" role="menu">
          {["搜索", "发起群聊", "添加朋友", "扫一扫", "收付款"].map((label) => (
            <button
              role="menuitem"
              key={label}
              onClick={() => {
                setMenu(false);
                if (label === "搜索") {
                  setSearchOpen(true);
                } else setUtility(label);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {utility ? (
        <div className="skin-scroll wx-utility">
          {utility === "聊天信息" &&
            (() => {
              const chatItems = p.items.filter((i) => i.title === p.thread);
              // 群聊花名册：消息里配置了 roster 就按它显示全部成员（备注名）
              const roster = chatItems.find((i) => i.meta?.roster)?.meta?.roster;
              const isGroup = chatItems.some(
                (i) => i.meta?.variant === "group",
              );
              const names = roster
                ? roster
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : [...new Set(chatItems.map((i) => i.sender))];
              // 没有花名册时，群聊成员要包含机主本人：他没在群里发言，也得有头像
              if (!roster && isGroup && p.owner && !names.includes(p.owner))
                names.push(p.owner);
              return (
                <div className="wx-members">
                  {names.map((name) => (
                    <div key={name}>
                      <Avatar
                        name={name}
                        src={
                          name === p.owner
                            ? ownerAvatar
                            : chatItems.find((i) => i.sender === name)?.avatar
                        }
                      />
                      <small>{wxName(name)}</small>
                    </div>
                  ))}
                </div>
              );
            })()}
          {p.items
            .filter((i) => i.folder === utility)
            .map((i) => (
              <button
                key={i.id}
                className="wx-discovery"
                onClick={() => p.onItem(i)}
              >
                {i.title}
                <span>›</span>
              </button>
            ))}
          {!p.items.some((i) => i.folder === utility) &&
            utility !== "聊天信息" && <p className="skin-empty">暂无内容</p>}
        </div>
      ) : p.thread ? (
        <>
          <MessageList
            items={threadItems(p.thread).filter(
              // 「我走了，别找我。」改由 stage5/6 的剧本块固定渲染，避免重复
              (i) => !((stage5Thread || stage6Thread) && i.id === "wx-zh-69"),
            )}
            creator={p.creator}
            onItem={p.onItem}
            onRead={p.onRead}
            nameOf={wxName}
            ownerAvatar={ownerAvatar}
            scrollToken={`${p.thread}:${truthUnlocked}:${wxLeftangNew ? "s5" : ""}:${stage6Started ? "s6" : ""}`}
            scrollToTop={!!pinnedThreads[p.thread] && !stage5Thread && !stage6Thread}
            footer={
              stage6Thread ? (
                <StageSixThread
                  start={stage6Thread}
                  done={stage6Done}
                  onStage6End={p.onStage6End}
                  ui={p.ui}
                  onUi={p.onUi}
                  ownerAvatar={
                    <Avatar name={p.owner || "机主"} src={ownerAvatar} />
                  }
                  peerAvatar={
                    <Avatar
                      name="左航"
                      src={
                        p.items.find((i) => !i.outgoing && i.title === "左航")
                          ?.avatar
                      }
                    />
                  }
                  time={p.virtualTime?.slice(-5) ?? ""}
                />
              ) : stage5Thread ? (
                <StageFiveLeftang
                  start={stage5Thread}
                  onNotify={p.onNotify}
                  onStage5End={p.onStage5End}
                  ui={p.ui}
                  onUi={p.onUi}
                  ownerAvatar={
                    <Avatar name={p.owner || "机主"} src={ownerAvatar} />
                  }
                  peerAvatar={
                    <Avatar
                      name="左航"
                      src={
                        p.items.find((i) => !i.outgoing && i.title === "左航")
                          ?.avatar
                      }
                    />
                  }
                  time={p.virtualTime?.slice(-5) ?? ""}
                />
              ) : undefined
            }
          />
          <Compose creator={p.creator} onAdd={p.onAdd} />
        </>
      ) : moments ? (
        <div className="wx-moments">
          <div
            className={`wx-moment-cover${profile?.media ? " has-image" : ""}`}
          >
            {profile?.media ? (
              <>
                <img src={profile.media} alt="" />
                <span className="wx-moment-cover-name">
                  {profile.title || p.owner}
                </span>
              </>
            ) : (
              <>
                <Camera size={32} />
                <span>朋友圈</span>
              </>
            )}
          </div>
          {posts.map((i) => (
            <button
              key={i.id}
              className="wx-moment-post"
              onClick={() => p.onItem(i)}
            >
              <Avatar name={i.sender} src={i.avatar} />
              <div>
                <strong>{i.sender}</strong>
                <p>{i.body}</p>
                {i.media && <ItemMedia item={i} />}
                {i.meta?.mention && <small>提到了：{i.meta.mention}</small>}
                {i.meta?.likesBy && (
                  <small className="wx-moment-likes">
                    <Heart size={11} /> {i.meta.likesBy}
                  </small>
                )}
                <small>
                  {i.time}
                  {i.meta?.visibility ? " " + i.meta.visibility : ""}
                </small>
              </div>
            </button>
          ))}
          {!posts.length && <p className="skin-empty">暂无朋友圈动态</p>}
          {p.creator && (
            <button className="phone-add" onClick={p.onAdd}>
              添加朋友圈动态
            </button>
          )}
        </div>
      ) : (
        <div className="skin-scroll">
          {tab === "微信" ? (
            <>
              {searchOpen && (
                <label className="wx-search">
                  <Search size={14} />
                  <input
                    aria-label="搜索微信内容"
                    placeholder="搜索"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              )}
              {conversations
                .filter(
                  (t) =>
                    t.includes(query) ||
                    p.items.some(
                      (i) => i.title === t && i.body.includes(query),
                    ),
                )
                .map((t) => {
                  const list = threadItems(t),
                    last = list.at(-1)!;
                  const isGroup = list.some(
                    (i) => i.meta?.variant === "group",
                  );
                  const names = [...new Set(list.map((i) => i.sender))];
                  if (isGroup && p.owner && !names.includes(p.owner))
                    names.push(p.owner);
                  return (
                    <button
                      className="wx-chat-row"
                      key={t}
                      onClick={() => openThread(t)}
                    >
                      <span className="wx-chat-avatar">
                        {isGroup ? (
                          <WeChatGroupAvatar
                            items={list}
                            names={names}
                            owner={p.owner}
                            ownerAvatar={ownerAvatar}
                          />
                        ) : (
                          <Avatar
                            name={t}
                            src={
                              list.find((i) => !i.outgoing)?.avatar ||
                              last?.avatar
                            }
                          />
                        )}
                      </span>
                      <div>
                        <strong>{wxName(t)}</strong>
                        <p>
                          <WxText text={last?.body || ""} small />
                        </p>
                      </div>
                      <time>{last?.time.slice(-5) || ""}</time>
                    </button>
                  );
                })}
              {!conversations.length && <p className="skin-empty">暂无聊天</p>}
            </>
          ) : tab === "通讯录" ? (
            <>
              <div className="wx-section-label">联系人</div>
              {contacts.map((c) => (
                <button
                  key={c}
                  className="wx-contact"
                  onClick={() => {
                    const item = p.items.find((i) => i.sender === c);
                    if (item) openThread(item.title);
                  }}
                >
                  <Avatar
                    name={c}
                    src={p.items.find((i) => i.sender === c)?.avatar}
                  />
                  {c}
                </button>
              ))}
            </>
          ) : tab === "发现" ? (
            <div className="wx-discover-groups">
              {[
                [Camera, "朋友圈", "#26a958"],
                [Play, "视频号", "#fa9d3b"],
                [Music, "听一听", "#fa5151"],
              ].map(([Icon, label, color]) => {
                const Glyph = Icon as typeof Camera;
                // 发现页只作摆设：和文件、邮件一样不承载剧情，不做上锁提示
                return (
                  <div key={String(label)} className="wx-discovery">
                    <Glyph size={22} style={{ color: String(color) }} />
                    {String(label)}
                    <span>›</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <div className="wx-profile">
                <Avatar
                  name={profile?.title || p.owner || "机主"}
                  src={ownerAvatar}
                />
                <div>
                  <h2>{profile?.title || p.owner || "机主"}</h2>
                  <small>微信号：22X051119</small>
                  <button
                    className="wx-profile-status"
                    onClick={() => setUtility("状态")}
                  >
                    ＋ 状态
                  </button>
                </div>
              </div>
              <div className="wx-profile-menu">
                {[
                  [MessageCircle, "服务", "#07c160"],
                  [Layers, "收藏", "#e8a828"],
                  [ImageIcon, "朋友圈", "#3a9bd9"],
                  [Layers, "作品", "#329dd8"],
                  [ShoppingBag, "小店与卡包", "#ed7c59"],
                  [Smile, "表情", "#f7b900"],
                  [Settings, "设置", "#1696d2"],
                ].map(([Icon, label, color]) => {
                  const Glyph = Icon as typeof Settings;
                  const locked = String(label) === "朋友圈" && !p.creator;
                  return (
                    <button
                      key={String(label)}
                      className={`wx-discovery${locked ? " locked" : ""}`}
                      onClick={() =>
                        locked
                          ? lockEntry(String(label))
                          : label === "朋友圈"
                            ? openMoments()
                            : setUtility(String(label))
                      }
                    >
                      <Glyph size={22} style={{ color: String(color) }} />
                      {String(label)}
                      <span>{locked ? <LockKeyhole size={13} /> : "›"}</span>
                    </button>
                  );
                })}
              </div>
              {p.items
                .filter((i) => i.folder === "我")
                .map((i) => (
                  <button
                    className="wx-discovery"
                    key={i.id}
                    onClick={() => p.onItem(i)}
                  >
                    <User size={18} />
                    {i.title}
                    <span>›</span>
                  </button>
                ))}
              {p.creator && (
                <button className="phone-add" onClick={p.onAdd}>
                  编辑个人资料内容
                </button>
              )}
            </>
          )}
        </div>
      )}
      {lockTip && <div className="app-lock-toast">{lockTip}</div>}
      {!p.thread && !moments && !utility && (
        <nav className="wx-bottom">
          {[
            { label: "微信", icon: MessageCircle },
            { label: "通讯录", icon: Users },
            { label: "发现", icon: Compass },
            { label: "我", icon: User },
          ].map((t) => (
            <button
              className={tab === t.label ? "selected" : ""}
              key={t.label}
              onClick={() => setTab(t.label)}
            >
              <t.icon size={21} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
export function WhatsAppSkin(p: SkinProps) {
  const [tab, setTab] = useState("聊天"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("全部");
  const tabs = [
    { label: "动态", icon: Compass },
    { label: "通话", icon: Phone },
    { label: "社区", icon: Users },
    { label: "聊天", icon: MessageCircle },
    { label: "设置", icon: Settings },
  ];
  const conversations = [
    ...new Set(
      p.items
        .filter((i) => !["动态", "通话", "社区", "设置"].includes(i.folder))
        .filter((i) => filter !== "未读" || !i.read)
        .map((i) => i.title),
    ),
  ];
  const name = tab === "聊天" ? p.name : tab;
  return (
    <div className="whatsapp-ui independent-skin">
      <div className="app-nav wa-nav">
        <button
          aria-label="返回"
          onClick={() => (p.thread ? p.onThread("") : p.onBack())}
        >
          <ChevronLeft size={22} />
        </button>
        <strong>{p.thread || name}</strong>
        <button
          aria-label={p.creator ? "新增内容" : "搜索内容"}
          onClick={
            p.creator
              ? p.onAdd
              : () =>
                  document
                    .querySelector<HTMLInputElement>(".wa-search input")
                    ?.focus()
          }
        >
          {p.creator ? <Plus size={21} /> : <Search size={20} />}
        </button>
      </div>
      {p.thread ? (
        <>
          <div className="wa-thread-profile">
            <button aria-label="返回聊天列表" onClick={() => p.onThread("")}>
              <ChevronLeft size={23} />
            </button>
            <Avatar
              name={p.thread}
              src={p.items.find((i) => i.title === p.thread)?.avatar}
              round
            />
            <div>
              <strong>{p.thread}</strong>
              <small>联系人</small>
            </div>
            <Video size={18} />
            <Phone size={17} />
          </div>
          <MessageList
            items={p.items.filter((i) => i.title === p.thread)}
            creator={p.creator}
            onItem={p.onItem}
            onRead={p.onRead}
            whatsapp
          />
          <Compose creator={p.creator} onAdd={p.onAdd} wa />
        </>
      ) : (
        <div className="skin-scroll">
          <h1 className="wa-large-title">{tab}</h1>
          {tab === "聊天" ? (
            <>
              <label className="wa-search">
                <Search size={16} />
                <input
                  placeholder="搜索"
                  aria-label="搜索WhatsApp"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="wa-filters">
                {["全部", "未读", "群组"].map((f) => (
                  <button
                    key={f}
                    className={filter === f ? "selected" : ""}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {conversations
                .filter((t) => t.includes(query))
                .filter(
                  (t) =>
                    filter !== "群组" ||
                    p.items.some((i) => i.title === t && i.folder === "群组"),
                )
                .map((t) => {
                  const last = p.items.filter((i) => i.title === t).at(-1)!;
                  return (
                    <button
                      className="wa-chat-row"
                      key={t}
                      onClick={() => {
                        p.onThread(t);
                        p.onRead(t);
                      }}
                    >
                      <Avatar name={t} src={last.avatar} round />
                      <div>
                        <strong>{t}</strong>
                        <p>
                          {last.outgoing && <CheckCheck size={12} />}{" "}
                          {last.body}
                        </p>
                      </div>
                      <time>{last.time.slice(-5)}</time>
                    </button>
                  );
                })}
            </>
          ) : tab === "设置" ? (
            <>
              <div className="wa-settings-profile">
                <Avatar name="我" round />
                <h2>个人资料</h2>
              </div>
              {p.items
                .filter((i) => i.folder === "设置")
                .map((i) => (
                  <button
                    key={i.id}
                    className="wa-record"
                    onClick={() => p.onItem(i)}
                  >
                    {i.title}
                    <span>›</span>
                  </button>
                ))}
            </>
          ) : (
            <>
              {tab === "动态" && (
                <div className="wa-status">
                  <Avatar name="我" round />
                  <span>我的状态</span>
                  {p.creator && (
                    <button aria-label="添加状态" onClick={p.onAdd}>
                      <Plus size={17} />
                    </button>
                  )}
                </div>
              )}
              {p.items
                .filter(
                  (i) =>
                    i.folder === tab || (tab === "通话" && i.kind === "call"),
                )
                .map((i) => (
                  <button
                    className="wa-record"
                    key={i.id}
                    onClick={() => p.onItem(i)}
                  >
                    <Avatar name={i.sender} src={i.avatar} round />
                    <div>
                      <strong>{i.title}</strong>
                      <p>{i.body}</p>
                    </div>
                    <span>
                      {tab === "通话" ? (
                        <Phone size={17} />
                      ) : (
                        <ChevronLeft size={15} />
                      )}
                    </span>
                  </button>
                ))}
              {!p.items.some((i) => i.folder === tab) && (
                <p className="skin-empty">暂无{tab}内容</p>
              )}
            </>
          )}
          {p.creator && (
            <button className="phone-add" onClick={p.onAdd}>
              添加{tab === "聊天" ? "聊天" : tab}内容
            </button>
          )}
        </div>
      )}
      {!p.thread && (
        <nav className="wa-bottom">
          {tabs.map((t) => (
            <button
              className={tab === t.label ? "selected" : ""}
              key={t.label}
              onClick={() => setTab(t.label)}
            >
              <t.icon size={20} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
export function InstagramSkin(p: SkinProps) {
  const [tab, setTab] = useState("首页"),
    [dm, setDm] = useState(false),
    [query, setQuery] = useState(""),
    [likes, setLikes] = useSkinState<string[]>(p, "likes", []),
    [saved, setSaved] = useSkinState<string[]>(p, "saved", []),
    [showSaved, setShowSaved] = useState(false);
  const posts = p.items.filter(
      (i) =>
        i.kind === "post" ||
        !["私信", "Story", "Reels", "个人主页"].includes(i.folder),
    ),
    stories = p.items.filter((i) => i.folder === "Story"),
    reels = p.items.filter((i) => i.kind === "video" || i.folder === "Reels"),
    messages = p.items.filter((i) => i.folder === "私信");
  const tabs = [
    { label: "首页", icon: Home },
    { label: "搜索", icon: Search },
    { label: "Reels", icon: Play },
    { label: "个人主页", icon: User },
  ];
  const shown = (
    showSaved ? posts.filter((i) => saved.includes(i.id)) : posts
  ).filter((i) => (i.title + i.body + i.sender).includes(query));
  return (
    <div className="instagram-ui independent-skin">
      <div className="app-nav ig-nav">
        <button
          aria-label="返回"
          onClick={() => (dm ? setDm(false) : p.onBack())}
        >
          <ChevronLeft size={22} />
        </button>
        <strong>{dm ? "私信" : p.name}</strong>
        <div>
          {p.creator && (
            <button aria-label="新增内容" onClick={p.onAdd}>
              <Plus size={21} />
            </button>
          )}
          <button aria-label="Instagram 私信" onClick={() => setDm(!dm)}>
            <Send size={20} />
          </button>
        </div>
      </div>
      <div className="skin-scroll ig-scroll">
        {dm ? (
          <>
            {messages.map((i) => (
              <button
                key={i.id}
                className="ig-dm-row"
                onClick={() => p.onItem(i)}
              >
                <Avatar name={i.sender} round />
                <div>
                  <strong>{i.sender}</strong>
                  <p>{i.body}</p>
                </div>
              </button>
            ))}
            {!messages.length && <p className="skin-empty">暂无私信</p>}
            {p.creator && (
              <button className="phone-add" onClick={p.onAdd}>
                添加私信
              </button>
            )}
          </>
        ) : tab === "首页" ? (
          <>
            <div className="ig-stories">
              <button
                className="ig-story"
                onClick={
                  p.creator
                    ? p.onAdd
                    : () => {
                        if (stories[0]) p.onItem(stories[0]);
                      }
                }
                disabled={!p.creator && !stories.length}
              >
                <span>
                  <Avatar name="我" round />
                </span>
                <small>你的快拍</small>
              </button>
              {stories.map((i) => (
                <button
                  key={i.id}
                  className="ig-story"
                  onClick={() => p.onItem(i)}
                >
                  <span>
                    <Avatar name={i.sender} round />
                  </span>
                  <small>{i.sender}</small>
                </button>
              ))}
            </div>
            {posts.map((i) => (
              <article className="ig-post" key={i.id}>
                <div className="ig-post-author">
                  <Avatar name={i.sender} round />
                  <strong>{i.sender}</strong>
                  <button
                    aria-label={`帖子详情${i.title}`}
                    onClick={() => p.onItem(i)}
                  >
                    <MoreHorizontal size={19} />
                  </button>
                </div>
                <button className="ig-post-media" onClick={() => p.onItem(i)}>
                  <ItemMedia item={i} />
                </button>
                <div className="ig-post-controls">
                  <button
                    aria-label={`喜欢${i.title}`}
                    onClick={() =>
                      setLikes(
                        likes.includes(i.id)
                          ? likes.filter((x) => x !== i.id)
                          : [...likes, i.id],
                      )
                    }
                  >
                    <Heart
                      size={23}
                      fill={likes.includes(i.id) ? "#ed4956" : "none"}
                      color={likes.includes(i.id) ? "#ed4956" : "currentColor"}
                    />
                  </button>
                  <button
                    aria-label={`评论${i.title}`}
                    onClick={() => p.onItem(i)}
                  >
                    <MessageCircle size={22} />
                  </button>
                  <button
                    aria-label={`查看${i.title}`}
                    onClick={() => p.onItem(i)}
                  >
                    <Send size={21} />
                  </button>
                  <button
                    aria-label={`收藏${i.title}`}
                    onClick={() =>
                      setSaved(
                        saved.includes(i.id)
                          ? saved.filter((x) => x !== i.id)
                          : [...saved, i.id],
                      )
                    }
                  >
                    <Bookmark
                      size={22}
                      fill={saved.includes(i.id) ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <div className="ig-post-caption">
                  <strong>
                    {i.likes + (likes.includes(i.id) ? 1 : 0)} 次赞
                  </strong>
                  <p>
                    <b>{i.sender}</b> {i.body}
                  </p>
                  <button onClick={() => p.onItem(i)}>
                    查看全部 {i.comments.length} 条评论
                  </button>
                  <time>{i.time}</time>
                </div>
              </article>
            ))}
          </>
        ) : tab === "搜索" ? (
          <>
            <label className="ig-search">
              <Search size={15} />
              <input
                value={query}
                aria-label="搜索Instagram"
                placeholder="搜索"
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="ig-explore">
              {shown.map((i) => (
                <button key={i.id} onClick={() => p.onItem(i)}>
                  <ItemMedia item={i} />
                </button>
              ))}
            </div>
          </>
        ) : tab === "Reels" ? (
          <>
            {reels.map((i) => (
              <div className="ig-reel" key={i.id}>
                <ItemMedia item={i} />
                <button onClick={() => p.onItem(i)}>
                  {i.sender} · {i.title}
                </button>
              </div>
            ))}
            {!reels.length && <p className="skin-empty">暂无 Reels</p>}
          </>
        ) : (
          <>
            <div className="ig-profile">
              <Avatar name={posts[0]?.sender ?? "我"} round />
              <div>
                <strong>{posts.length}</strong>
                <small>帖子</small>
              </div>
              <div>
                <strong>0</strong>
                <small>关注者</small>
              </div>
              <div>
                <strong>0</strong>
                <small>正在关注</small>
              </div>
            </div>
            <h3 className="ig-profile-name">{posts[0]?.sender ?? "我"}</h3>
            <div className="ig-profile-tabs">
              <button aria-label="帖子网格" onClick={() => setShowSaved(false)}>
                <Grid size={21} />
              </button>
              <button
                aria-label="已收藏帖子"
                onClick={() => setShowSaved(true)}
              >
                <Bookmark size={21} />
              </button>
              <button
                aria-label="资料内容"
                onClick={() => {
                  const i = p.items.find((i) => i.folder === "个人主页");
                  if (i) p.onItem(i);
                  else if (p.creator) p.onAdd();
                }}
              >
                <AtSign size={21} />
              </button>
            </div>
            <div className="ig-explore">
              {shown.map((i) => (
                <button key={i.id} onClick={() => p.onItem(i)}>
                  <ItemMedia item={i} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <nav className="ig-bottom">
        {tabs.map((t) => (
          <button
            key={t.label}
            className={tab === t.label ? "selected" : ""}
            aria-label={`Instagram ${t.label}`}
            onClick={() => {
              setTab(t.label);
              setDm(false);
            }}
          >
            <t.icon size={23} />
          </button>
        ))}
      </nav>
    </div>
  );
}
