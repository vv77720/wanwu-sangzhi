import { QQThread } from "./QQThread";
import { NativeComposer } from "../DeviceSystem";
import {
  CheckCheck,
  Compass,
  Hash,
  MessageCircle,
  Mic,
  Phone,
  Plus,
  Send,
  Smile,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Item } from "../schema";
import type { StoryTip } from "../AppSkins";
import {
  Add,
  Avatar,
  Empty,
  groupItems,
  Header,
  Media,
  meta,
  SearchBox,
  Tabs,
  useContent,
  type Props,
} from "./shared";
function Bubbles({
  p,
  items,
  className = "",
}: {
  p: Props;
  items: Item[];
  className?: string;
}) {
  return (
    <div className={`catalog-bubbles ${className}`}>
      <time className="bubble-date">{items[0]?.time.slice(0, 10)}</time>
      {items.map((i) => (
        <div
          className={`catalog-message ${i.outgoing ? "outgoing" : ""}`}
          key={i.id}
        >
          <button onClick={() => (p.creator ? p.onItem(i) : p.onRead(i.id))}>
            {["image", "video", "audio"].includes(i.kind) ? (
              <Media item={i} />
            ) : (
              i.body
            )}
            <small>
              {i.time.slice(-5)}
              {i.read && <CheckCheck size={10} />}
            </small>
          </button>
        </div>
      ))}
    </div>
  );
}
function Composer({ p }: { p: Props }) {
  return (
    <div className="catalog-composer">
      <Plus size={19} />
      <NativeComposer creator={p.creator} onAdd={p.onAdd} />

      <Smile size={20} />
      <Mic size={18} />
    </div>
  );
}
function ChatRows({
  p,
  items,
  round = true,
}: {
  p: Props;
  items: Item[];
  round?: boolean;
}) {
  const names = [...new Set(items.map((i) => i.title))];
  return (
    <>
      {names.map((name) => {
        const last = items.filter((i) => i.title === name).at(-1)!;
        return (
          <button
            className="catalog-chat"
            key={name}
            onClick={() => {
              p.onThread(name);
              p.onRead(name);
            }}
          >
            <Avatar name={name} src={last.avatar} round={round} />
            <span>
              <strong>{name}</strong>
              <p>{last.body}</p>
            </span>
            <time>{last.time.slice(-5)}</time>
          </button>
        );
      })}
      <Empty items={items} />
    </>
  );
}
// ---- Stage 6: ？？？ 短信剧本（捡手机的人被反向套话）----
type SMSStep =
  | { from: "？？？"; text: string }
  | { choice: string[] }
  | { popups: string[] };

const SMS_STEPS: SMSStep[] = [
  { from: "？？？", text: "你好" },
  { from: "？？？", text: "是你捡到了这部手机？" },
  { choice: ["我去", "黑客啊"] },
  { from: "？？？", text: "你看了这里面的聊天记录吗？" },
  { choice: ["……", "我能说我没看吗"] },
  { from: "？？？", text: "如果看了的话" },
  { from: "？？？", text: "最好是不要传播里面的内容" },
  { from: "？？？", text: "不然你也知道我们随时能定位这部手机" },
  { choice: ["我貌似并没有那个意思。"] },
  { from: "？？？", text: "不好意思" },
  { from: "？？？", text: "他不是那个意思" },
  { from: "？？？", text: "你可以把这部手机刷机之后拿去卖二手，或者当备用机" },
  { from: "？？？", text: "随意处置就好" },
  { from: "？？？", text: "可是那里面有我很珍贵的聊天记录" },
  { from: "？？？", text: "还不是你自己乱丢？" },
  { from: "？？？", text: "不是你让我丢的吗😭" },
  { from: "？？？", text: "我那是一个比喻" },
  { from: "？？？", text: "我在写诗句" },
  { from: "？？？", text: "你在乱丢垃圾" },
  { from: "？？？", text: "你怎么这样？" },
  { from: "？？？", text: "我伤心了" },
  { from: "？？？", text: "你别伤心" },
  { from: "？？？", text: "我好了" },
  { popups: ["你：这两人怕不是有什么毛病", "你：在这里玩什么两人抢一机的游戏"] },
  { from: "？？？", text: "不早了" },
  { from: "？？？", text: "你也赶紧回家吧" },
  { choice: ["额", "谢谢你们"] },
];

function StageSMS({
  done,
  onStoryTip,
  onUi,
  onEnd,
}: {
  done: boolean;
  onStoryTip?: (tip: string | StoryTip) => void;
  onUi?: (key: string, value: string | number | boolean) => void;
  onEnd?: () => void;
}) {
  const [shown, setShown] = useState(0);
  // 每一步已按顺序选过的选项：选项不是二选一，而是按时间顺序逐个点完
  const [chosen, setChosen] = useState<Record<number, string[]>>({});
  const endedRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  // 新消息进来自动滚到底部（iMessage 行为），不用手动下滑
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() =>
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }),
    );
    return () => cancelAnimationFrame(id);
  }, [shown, chosen, done]);

  useEffect(() => {
    if (done || shown >= SMS_STEPS.length) return;
    const step = SMS_STEPS[shown];
    if ("popups" in step) {
      // 每个弹窗持续约 2s，播完继续短信
      step.popups.forEach((text, i) =>
        window.setTimeout(
          () => onStoryTip?.({ text, hold: 2000, inline: true }),
          i * 2000,
        ),
      );
      const t = window.setTimeout(
        () => setShown(shown + 1),
        step.popups.length * 2000,
      );
      return () => window.clearTimeout(t);
    }
    if ("choice" in step) return;
    const t = window.setTimeout(() => setShown(shown + 1), 1300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, done]);

  useEffect(() => {
    if (done || endedRef.current || shown < SMS_STEPS.length) return;
    endedRef.current = true;
    onUi?.("stage6Sms", "end");
    onEnd?.();
  }, [shown, done, onUi, onEnd]);

  const pick = (label: string) => {
    const step = SMS_STEPS[shown];
    if (!step || !("choice" in step)) return;
    const next = [...(chosen[shown] ?? []), label];
    setChosen((c) => ({ ...c, [shown]: next }));
    // 本步选项全部点完才推进到下一段剧情
    if (next.length >= step.choice.length) setShown((s) => s + 1);
  };

  const rows: { text: string; outgoing: boolean }[] = [];
  if (done) {
    for (const step of SMS_STEPS) {
      if ("from" in step) rows.push({ text: step.text, outgoing: false });
      else if ("choice" in step)
        for (const c of step.choice) rows.push({ text: c, outgoing: true });
    }
  } else {
    for (let i = 0; i < shown; i++) {
      const step = SMS_STEPS[i];
      if ("from" in step) rows.push({ text: step.text, outgoing: false });
      else if ("choice" in step)
        for (const c of chosen[i] ?? [])
          rows.push({ text: c, outgoing: true });
    }
  }
  // 只暴露当前按顺序该点的那一个选项
  const currentChoices =
    !done && shown < SMS_STEPS.length && "choice" in SMS_STEPS[shown]
      ? (() => {
          const opts = (SMS_STEPS[shown] as { choice: string[] }).choice;
          const picked = chosen[shown]?.length ?? 0;
          return picked < opts.length ? [opts[picked]] : [];
        })()
      : [];
  return (
    <>
      <div className="catalog-bubbles sms-bubbles" ref={listRef}>
        <time className="bubble-date">2026年11月2日</time>
        {rows.map((r, i) => (
          <div
            className={`catalog-message ${r.outgoing ? "outgoing" : ""}`}
            key={i}
          >
            <button>{r.text}</button>
          </div>
        ))}
      </div>
      {currentChoices.length ? (
        <div className="sms-choice-bar">
          {currentChoices.map((c) => (
            <button key={c} onClick={() => pick(c)}>
              {c}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

export function MessagesSkin(p: Props) {
  const { q, setQ, items } = useContent(p, "信息");
  const [unread, setUnread] = useState(false);
  const smsStage6 =
    !p.creator &&
    p.thread === "？？？" &&
    (p.ui?.stage6Sms === "run" || p.ui?.stage6Sms === "end");
  return (
    <div className="catalog-skin native-messages">
      <Header
        p={{
          ...p,
          name: p.thread || p.name,
          onBack: () => (p.thread ? p.onThread("") : p.onBack()),
        }}
      />
      {!p.thread && (
        <div className="message-heading">
          <h1>信息</h1>
          <button onClick={() => setUnread(!unread)}>
            {unread ? "全部" : "未读"}
          </button>
        </div>
      )}
      {smsStage6 ? (
        <StageSMS
          done={p.ui?.stage6Sms === "end"}
          onStoryTip={p.onStoryTip}
          onUi={p.onUi}
          onEnd={p.onStage6SmsEnd}
        />
      ) : p.thread ? (
        <>
          <Bubbles
            p={p}
            items={items.filter((i) => i.title === p.thread)}
            className="sms-bubbles"
          />
          <Composer p={p} />
        </>
      ) : (
        <div className="catalog-scroll">
          <SearchBox value={q} set={setQ} />
          <ChatRows
            p={p}
            items={unread ? items.filter((i) => !i.read) : items}
          />
        </div>
      )}
    </div>
  );
}
export function QQSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "消息");
  const list = items.filter((i) => i.folder !== "空间" && i.kind !== "post");
  return (
    <div className="catalog-skin qq-ui">
      {!p.thread && <Header p={p} />}
      {!p.thread && (
        <div className="qq-profile-bar">
          <Avatar name={p.owner ?? "我"} />
          <div>
            <strong>{p.thread || p.owner || "我的QQ"}</strong>
            <small>QQ</small>
          </div>
        </div>
      )}
      {p.thread ? (
        <QQThread {...p} />
      ) : (
        <>
          <div className="catalog-scroll">
            <SearchBox value={q} set={setQ} />
            {tab === "消息" ? (
              <ChatRows p={p} items={list} />
            ) : tab === "联系人" ? (
              <>
                {[...new Set(list.map((i) => i.sender))].map((s) => (
                  <button
                    key={s}
                    className="qq-contact"
                    onClick={() => {
                      const i = list.find((i) => i.sender === s);
                      if (i) p.onThread(i.title);
                    }}
                  >
                    <Avatar name={s} />
                    {s}
                  </button>
                ))}
              </>
            ) : (
              <div className="qq-space">
                <h2>好友动态</h2>
                {items
                  .filter((i) => i.folder === "空间" || i.kind === "post")
                  .map((i) => (
                    <button key={i.id} onClick={() => p.onItem(i)}>
                      <Avatar name={i.sender} src={i.avatar} />
                      <strong>{i.sender}</strong>
                      <p>{i.body}</p>
                      {i.media && <Media item={i} />}
                      <small>{i.time}</small>
                    </button>
                  ))}
                <Add p={p} label="添加空间动态" />
              </div>
            )}
          </div>
          <Tabs
            tabs={["消息", "联系人", "空间"]}
            value={tab}
            set={setTab}
            icons={[<MessageCircle />, <Users />, <Compass />]}
          />
        </>
      )}
    </div>
  );
}
export function TelegramSkin(p: Props) {
  const { q, setQ, items } = useContent(p, "全部");
  const [folder, setFolder] = useState("全部");
  const folders = ["全部", ...groupItems(items).filter((f) => f !== "未分类")];
  const list =
    folder === "全部" ? items : items.filter((i) => i.folder === folder);
  return (
    <div className="catalog-skin telegram-ui">
      <Header
        p={{ ...p, onBack: () => (p.thread ? p.onThread("") : p.onBack()) }}
      />
      {p.thread ? (
        <>
          <div className="telegram-peer">
            <Avatar name={p.thread} />
            <strong>{p.thread}</strong>
            <span>
              {list.filter((i) => i.title === p.thread).length} 条消息
            </span>
          </div>
          <Bubbles
            p={p}
            items={items.filter((i) => i.title === p.thread)}
            className="telegram-bubbles"
          />
          <Composer p={p} />
        </>
      ) : (
        <>
          <div className="telegram-search">
            <SearchBox value={q} set={setQ} />
          </div>
          <div className="telegram-folders">
            {folders.map((f) => (
              <button
                className={folder === f ? "selected" : ""}
                key={f}
                onClick={() => setFolder(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="catalog-scroll">
            <ChatRows p={p} items={list} />
          </div>
          <div className="telegram-footer">
            <Send size={17} />
            聊天 · {list.length} 条记录
          </div>
        </>
      )}
    </div>
  );
}
export function DiscordSkin(p: Props) {
  const { tab, setTab, items } = useContent(p, "频道");
  const servers = [
    ...new Set(items.map((i) => meta(i, "server", "故事服务器"))),
  ];
  const [server, setServer] = useState(""),
    [channel, setChannel] = useState("");
  const current = server || servers[0] || "服务器";
  const list = items.filter((i) => meta(i, "server", "故事服务器") === current);
  const channels = groupItems(list, "general");
  const active = channel || channels[0] || "general";
  const messages = list.filter((i) => (i.folder || "general") === active);
  return (
    <div className="catalog-skin discord-ui">
      <Header p={p} />
      <div className="discord-layout">
        <aside className="discord-servers">
          {servers.map((s) => (
            <button
              aria-label={`服务器${s}`}
              className={s === current ? "selected" : ""}
              key={s}
              onClick={() => {
                setServer(s);
                setChannel("");
                p.onRead(s);
              }}
            >
              {s.slice(0, 2)}
            </button>
          ))}
        </aside>
        <section className="discord-main">
          <div className="discord-server-name">
            <strong>{current}</strong>
            <Hash size={17} />
          </div>
          <div className="discord-channel-tabs">
            {channels.map((c) => (
              <button
                className={c === active ? "selected" : ""}
                key={c}
                onClick={() => {
                  setChannel(c);
                  p.onRead(c);
                }}
              >
                # {c}
              </button>
            ))}
          </div>
          <div className="discord-current">
            {tab === "频道" ? (
              <>
                <Hash size={16} />
                {active}
              </>
            ) : (
              <>
                <Users size={16} />
                成员
              </>
            )}
          </div>
          <div className="catalog-scroll">
            {tab === "成员"
              ? [...new Set(list.map((i) => i.sender))].map((s) => (
                  <div key={s} className="discord-member">
                    <Avatar name={s} />
                    <span>
                      {s}
                      <small>
                        {meta(
                          list.find((i) => i.sender === s)!,
                          "status",
                          "在线",
                        )}
                      </small>
                    </span>
                  </div>
                ))
              : messages.map((i) => (
                  <button
                    key={i.id}
                    className="discord-message"
                    onClick={() => p.onItem(i)}
                  >
                    <Avatar name={i.sender} />
                    <div>
                      <strong>{i.sender}</strong>
                      <time>{i.time.slice(-5)}</time>
                      <p>{i.body}</p>
                      {i.media && <Media item={i} />}
                    </div>
                  </button>
                ))}
            <Empty items={list} />
          </div>
          <Add p={p} label={`添加 #${active} 的消息`} />
        </section>
      </div>
      <Tabs
        tabs={["频道", "成员"]}
        value={tab}
        set={setTab}
        icons={[<Hash />, <Users />]}
      />
    </div>
  );
}
export function LineSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "聊天");
  return (
    <div className="catalog-skin line-ui">
      <Header
        p={{ ...p, onBack: () => (p.thread ? p.onThread("") : p.onBack()) }}
      />
      {p.thread ? (
        <>
          <h3 className="line-peer">{p.thread}</h3>
          <Bubbles
            p={p}
            items={items.filter((i) => i.title === p.thread)}
            className="line-bubbles"
          />
          <Composer p={p} />
        </>
      ) : (
        <>
          <div className="catalog-scroll">
            <h1>{tab}</h1>
            <SearchBox value={q} set={setQ} />
            {tab === "聊天" ? (
              <ChatRows p={p} items={items} />
            ) : (
              <>
                <div className="line-owner">
                  <Avatar name={p.owner ?? "我"} />
                  <h2>{p.owner ?? "我"}</h2>
                </div>
                <h4>好友</h4>
                <div className="line-friends">
                  {[...new Set(items.map((i) => i.sender))].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        const i = items.find((i) => i.sender === s);
                        if (i) p.onThread(i.title);
                      }}
                    >
                      <Avatar name={s} />
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <Tabs
            tabs={["好友", "聊天"]}
            value={tab}
            set={setTab}
            icons={[<Users />, <MessageCircle />]}
          />
        </>
      )}
    </div>
  );
}
export function MessengerSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "聊天");
  return (
    <div className="catalog-skin messenger-ui">
      <Header
        p={{ ...p, onBack: () => (p.thread ? p.onThread("") : p.onBack()) }}
      />
      {p.thread ? (
        <>
          <div className="messenger-peer">
            <Avatar name={p.thread} />
            <strong>{p.thread}</strong>
            <Phone size={18} />
          </div>
          <Bubbles
            p={p}
            items={items.filter((i) => i.title === p.thread)}
            className="messenger-bubbles"
          />
          <Composer p={p} />
        </>
      ) : (
        <>
          <div className="catalog-scroll">
            <h1>{tab}</h1>
            <SearchBox value={q} set={setQ} />
            <div className="messenger-people">
              {[...new Set(items.map((i) => i.sender))].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    const i = items.find((i) => i.sender === s);
                    if (i) p.onThread(i.title);
                  }}
                >
                  <Avatar name={s} />
                  <small>{s}</small>
                </button>
              ))}
            </div>
            {tab === "聊天" ? (
              <ChatRows p={p} items={items} />
            ) : (
              <div className="messenger-contacts">
                {items.map((i) => (
                  <button key={i.id} onClick={() => p.onItem(i)}>
                    <Avatar name={i.sender} />
                    <strong>{i.sender}</strong>
                    <small>{i.title}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Tabs
            tabs={["聊天", "联系人"]}
            value={tab}
            set={setTab}
            icons={[<MessageCircle />, <Users />]}
          />
        </>
      )}
    </div>
  );
}
