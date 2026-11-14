import { readFile, writeFile } from "node:fs/promises";

const f = "stories/玩物丧志/story.json";
const story = JSON.parse(await readFile(f, "utf8"));

const zuohangAvatar = "data:image/jpeg;base64," + (await readFile(process.env.TEMP + "/avatar_zuohang.b64", "utf8")).trim();
const zhuAvatar = "data:image/jpeg;base64," + (await readFile(process.env.TEMP + "/avatar_zhuzhixin.b64", "utf8")).trim();
const screenshotMedia = "data:image/png;base64," + (await readFile("scripts/wechat-screenshot.png")).toString("base64");

const OWNER = "朱志鑫";
const CONTACT_ID = "zuohang";
const CONTACT_NAME = "左航";

// Ensure contact exists
const existingContact = story.contacts.find((c) => c.id === CONTACT_ID);
if (existingContact) {
  existingContact.name = CONTACT_NAME;
  existingContact.avatar = zuohangAvatar;
} else {
  story.contacts.push({
    id: CONTACT_ID,
    name: CONTACT_NAME,
    phone: "",
    avatar: zuohangAvatar,
    bio: "",
  });
}

let mid = 0;
const mk = (sender, body, time, variant, extra = {}) => ({
  id: `wx-zh-${mid++}`,
  body,
  senderId: sender === OWNER ? "owner" : CONTACT_ID,
  time,
  meta: { variant },
  ...extra,
});

const UNLOCK = "wechatTruthUnlocked";

const hidden = [
  mk(OWNER, "我通过了你的朋友验证请求，现在我们可以开始聊天了", "2026-06-13 22:43", "hidden", { unlock: UNLOCK }),
  mk(OWNER, "之前的手机卡注销了，以后都用这个号联系我。", "2026-06-13 22:43", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "嗯，挺官方", "2026-06-13 22:43", "hidden", { unlock: UNLOCK }),
  mk(OWNER, "然后就是私人的内容了", "2026-06-13 22:43", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "私人的内容不是已经在你的接风饭局上说过了？", "2026-06-13 22:43", "hidden", { unlock: UNLOCK }),
  mk(OWNER, "不一样", "2026-06-13 22:43", "hidden", { unlock: UNLOCK }),
  mk(OWNER, "有些话只想和你说", "2026-06-13 22:43", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "比如？", "2026-06-13 22:43", "hidden", { unlock: UNLOCK }),
  mk(OWNER, "我很想你", "2026-06-13 22:43", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "会不会有些太露骨了？", "2026-06-13 22:43", "hidden", { unlock: UNLOCK }),
  mk(OWNER, "我实话实说，怎么就露骨了？", "2026-06-13 22:43", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你在国外待的那几年也把那些风土人情给统统吸纳了？", "2026-06-13 22:43", "hidden", { unlock: UNLOCK }),
  mk(OWNER, "你一点也没想哥哥？我很伤心", "2026-06-13 22:43", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "开个玩笑", "2026-06-13 22:43", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "我也想你", "2026-06-13 22:43", "hidden", { unlock: UNLOCK }),

  mk(CONTACT_NAME, "朱志鑫", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你家来人了？", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "今天", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "好像已经第二天了", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "总之我回家看见你生物爹车上下来一个人", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "生面孔，我没在这片见过", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(OWNER, "嗯", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(OWNER, "家里来客人了", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "嚯", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "来了不认识的人那确实闷得慌", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "要不要明天来我家坐坐，我父母都很想见你", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(OWNER, "上次从国外回来不是拜访过伯父伯母了？", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "啧", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "不解风情", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "我撤回那句说你被腌入味了的话", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "不来我家那带你去别的地方转转？这几年变化还挺大的", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),
  mk(OWNER, "好，都听你的", "2026-07-18 01:23", "hidden", { unlock: UNLOCK }),

  mk(CONTACT_NAME, "不是说是客人的吗？", "2026-08-08 23:45", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "没事，不用跟我解释", "2026-08-08 23:45", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "这种事情确实很难开口", "2026-08-08 23:45", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你也别听你生物爹胡说", "2026-08-08 23:45", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "很多人听他说的话都听乐了，你是什么样的人这么多年来大家有目共睹", "2026-08-08 23:45", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "其实大部分人都觉得他这样做很上不得台面，大家也不是傻子", "2026-08-08 23:45", "hidden", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "只是还有合作，不好在这种场合驳了他的面子", "2026-08-08 23:45", "hidden", { unlock: UNLOCK }),
  mk(OWNER, "嗯，谢谢你", "2026-08-08 23:45", "hidden", { unlock: UNLOCK }),
  mk(OWNER, "我知道的", "2026-08-08 23:45", "hidden", { unlock: UNLOCK }),
];

const cold = [
  mk(OWNER, "这算什么", "2026-09-21 08:33", "cold"),
  mk(OWNER, "囚禁吗？", "2026-09-21 08:33", "cold"),
  mk(CONTACT_NAME, "嗯", "2026-09-21 08:33", "cold"),
  mk(CONTACT_NAME, "你可以这么理解", "2026-09-21 08:33", "cold"),
  mk(OWNER, "我能出门吗？", "2026-09-21 08:33", "cold"),

  mk(OWNER, "你出去了？", "2026-10-09 09:32", "cold"),
  mk(CONTACT_NAME, "我要工作", "2026-10-09 09:32", "cold"),
  mk(CONTACT_NAME, "不然拿什么养你？", "2026-10-09 09:32", "cold"),
  mk(OWNER, "……", "2026-10-09 09:32", "cold"),

  mk(OWNER, "我微信里的好友怎么都不见了？", "2026-10-13 19:47", "cold"),
  mk(CONTACT_NAME, "现在才察觉吗", "2026-10-13 19:47", "cold"),
  mk(CONTACT_NAME, "想找人求助？", "2026-10-13 19:47", "cold"),
  mk(CONTACT_NAME, "你觉得我会给你那样的机会？", "2026-10-13 19:47", "cold"),
  mk(OWNER, "我不是那个意思", "2026-10-13 19:47", "cold"),

  mk(OWNER, "怎么还没到家？", "2026-10-20 21:03", "cold"),
  mk(CONTACT_NAME, "我回我自己家", "2026-10-20 21:03", "cold"),
  mk(OWNER, "……", "2026-10-20 21:03", "cold"),
  mk(OWNER, "好", "2026-10-20 21:03", "cold"),

  mk(OWNER, "还不回来吗？", "2026-10-23 22:05", "cold"),
  mk(CONTACT_NAME, "我很忙", "2026-10-23 22:05", "cold"),
  mk(CONTACT_NAME, "你知不知道你事很多", "2026-10-23 22:05", "cold"),
  mk(CONTACT_NAME, "你又看了什么", "2026-10-23 22:05", "cold"),
  mk(CONTACT_NAME, "想这么多", "2026-10-23 22:05", "cold"),
  mk(CONTACT_NAME, "把你的抖音小红书卸了", "2026-10-23 22:05", "cold"),
  mk(OWNER, "好", "2026-10-23 22:05", "cold"),

  mk(OWNER, "……", "2026-11-01 22:36", "cold"),
  mk(OWNER, "你最近回来的越来越晚了", "2026-11-01 22:36", "cold"),
  mk(OWNER, "你不需要我了吗？", "2026-11-01 22:36", "cold"),

  mk(OWNER, "我走了，别找我。", "2026-11-01 23:03", "cold", { meta: { variant: "cold", dateBreak: "1" } }),
];

const warm = [
  mk(OWNER, "这算什么", "2026-09-21 08:33", "warm", { unlock: UNLOCK }),
  mk(OWNER, "囚禁吗？", "2026-09-21 08:33", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "嗯", "2026-09-21 08:33", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你可以这么理解", "2026-09-21 08:33", "warm", { unlock: UNLOCK }),
  mk(OWNER, "我能出门吗？", "2026-09-21 08:33", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "可以啊", "2026-09-21 08:33", "warm", { unlock: UNLOCK }),
  mk(OWNER, "头一次见被囚禁的还可以出门", "2026-09-21 08:33", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "我只是觉得那样说你会高兴一点", "2026-09-21 08:33", "warm", { unlock: UNLOCK }),

  mk(OWNER, "你出去了？", "2026-10-09 09:32", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "我要工作", "2026-10-09 09:32", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "不然拿什么养你？", "2026-10-09 09:32", "warm", { unlock: UNLOCK }),
  mk(OWNER, "……", "2026-10-09 09:32", "warm", { unlock: UNLOCK }),
  mk(OWNER, "我这样说", "2026-10-09 09:32", "warm", { unlock: UNLOCK }),
  mk(OWNER, "会让你感觉很为难吗？", "2026-10-09 09:32", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "不工作还是囚禁？", "2026-10-09 09:32", "warm", { unlock: UNLOCK }),
  mk(OWNER, "二者", "2026-10-09 09:32", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "会的话", "2026-10-09 09:32", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你就不会出现在这里了", "2026-10-09 09:32", "warm", { unlock: UNLOCK }),

  mk(OWNER, "我微信里的好友怎么都不见了？", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "现在才察觉吗", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "想找人求助？", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你觉得我会给你那样的机会？", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "开个玩笑", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你怎么还沉浸在那个设定里？", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(OWNER, "……", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "朱志鑫", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你再这样", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "我真的要喊心理医生到家里了", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(OWNER, "我不敢看", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "为什么不敢看", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你的微信还加了你的仇家？", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(OWNER, "我不怕看见仇人的嘲笑", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(OWNER, "相反，我害怕相熟的人对我失望", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(OWNER, "我没能满足他们的期待，没有从一地泥泞里挣扎着站起身来，而是直接逃走，直接抽离了那个环境", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(OWNER, "这不是一个负责任的人该做的", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你现在这个状态", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "只有先逃离那个环境，才有机会重整旗鼓，卷土重来", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "这不是逃跑", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你得先恢复过来，才能去满足他人对你的期待", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "虽然我个人认为你不用为他们负责", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "但是如果你非要找一个人对他负责才能好受一点的话", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "那就对我负责吧", "2026-10-13 19:47", "warm", { unlock: UNLOCK }),

  mk(OWNER, "……", "2026-10-13 20:08", "warm", { unlock: UNLOCK }),
  mk(OWNER, "突然感觉", "2026-10-13 20:08", "warm", { unlock: UNLOCK }),
  mk(OWNER, "一直这样被你关着也挺好的", "2026-10-13 20:08", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "我刚刚说那么多", "2026-10-13 20:08", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你都没听进去？", "2026-10-13 20:08", "warm", { unlock: UNLOCK }),
  mk(OWNER, "我不是那个意思", "2026-10-13 20:08", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "我知道", "2026-10-13 20:08", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你想我了", "2026-10-13 20:08", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "晚点我们一起出门转转", "2026-10-13 20:08", "warm", { unlock: UNLOCK }),

  mk(OWNER, "怎么还没到家？", "2026-10-20 21:03", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "我回我自己家", "2026-10-20 21:03", "warm", { unlock: UNLOCK }),
  mk(OWNER, "……", "2026-10-20 21:03", "warm", { unlock: UNLOCK }),
  mk(OWNER, "好", "2026-10-20 21:03", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "不高兴了？", "2026-10-20 21:03", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "昨天晚上一进门我就告诉你了", "2026-10-20 21:03", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "某个人忙着抱着我啃应该是没听见", "2026-10-20 21:03", "warm", { unlock: UNLOCK }),
  mk(OWNER, "这样吗", "2026-10-20 21:03", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "又装傻", "2026-10-20 21:03", "warm", { unlock: UNLOCK }),
  mk(OWNER, "😞", "2026-10-20 21:03", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "好了", "2026-10-20 21:03", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "明天早点回去陪你", "2026-10-20 21:03", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "回我们的家", "2026-10-20 21:03", "warm", { unlock: UNLOCK }),

  mk(OWNER, "还不回来吗？", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "我很忙", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你知不知道你事很多", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你最近状态恢复得不错啊", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "给他们找了不少事", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你知道我是如何保证你最近有多么多么颓废多么多么沮丧", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "他们才打消了一点疑心", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(OWNER, "你上次还让他们洗干净脖子等着呢", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "呵", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "他那么自作聪明", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "怎么可能还记得这码事", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "就算还记得，多半也只是觉得你在虚张声势", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(OWNER, "好嘛", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(OWNER, "这下真被人当成废物了", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(OWNER, "你会像他们一样嫌弃我吗？", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "你又看了什么", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "想这么多", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "把你的抖音小红书卸了", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "赶紧的", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "这毛病不轻", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(OWNER, "好，都听你的", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(OWNER, "已经卸了", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "。", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "真从网上学的？", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(OWNER, "你猜", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "我看你是完全恢复活力了", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "是不是也不需要我“囚禁”你了？", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(OWNER, "没有🥺", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(OWNER, "我还很需要你", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(OWNER, "你还有多久到家", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(OWNER, "要不要我接你", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "不用", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "在家等我", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(CONTACT_NAME, "我马上", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(OWNER, "好", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
  mk(OWNER, "^ ꇴ ^", "2026-10-23 22:05", "warm", { unlock: UNLOCK }),
];

const messages = [...hidden, ...cold, ...warm];

// Replace or add the wechat chat
const chatId = "wx-zuohang";
const existingIdx = story.chats.findIndex((c) => c.id === chatId);
const chat = {
  id: chatId,
  app: "wechat",
  title: CONTACT_NAME,
  participants: ["owner", CONTACT_ID],
  messages,
};
if (existingIdx >= 0) story.chats[existingIdx] = chat;
else story.chats.push(chat);

// Add owner profile item (for owner avatar in WeChat)
if (!story.content.wechat) story.content.wechat = [];
const profileId = "wx-profile-owner";
const profileIdx = story.content.wechat.findIndex((i) => i.id === profileId);
const profile = {
  id: profileId,
  title: OWNER,
  body: "",
  sender: OWNER,
  avatar: zhuAvatar,
  kind: "text",
  folder: "__profile__",
  meta: {},
  time: "2026-11-01 23:03",
};
if (profileIdx >= 0) story.content.wechat[profileIdx] = profile;
else story.content.wechat.push(profile);

// Hidden photo (screenshot of unsent message) - hidden album
if (!story.content.photos) story.content.photos = [];
const photoId = "hidden-screenshot-unsent";
const photoIdx = story.content.photos.findIndex((i) => i.id === photoId);
const hiddenPhoto = {
  id: photoId,
  title: "未发送的消息",
  body: "今天他说的那些，你别信。我不是那样的。",
  sender: OWNER,
  kind: "image",
  media: screenshotMedia,
  meta: { caption: "2026-08-08 23:45 截图" },
  hidden: false,
  folder: "隐藏相册",
  time: "2026-08-08 23:45",
};
if (photoIdx >= 0) story.content.photos[photoIdx] = hiddenPhoto;
else story.content.photos.push(hiddenPhoto);

// Add the unlock variable default
if (!story.variables) story.variables = {};
story.variables[UNLOCK] = false;

await writeFile(f, JSON.stringify(story, null, 2) + "\n", "utf8");
console.log(`Added ${messages.length} messages (hidden:${hidden.length} cold:${cold.length} warm:${warm.length})`);
