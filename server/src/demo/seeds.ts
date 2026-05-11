type BadgeSeed = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export interface DemoUserSeed {
  id: string;
  nickname: string;
  avatar: string;
  community: string;
  lat: number;
  lng: number;
  bio: string;
  creditScore: number;
  exchangeCount: number;
  isLiaison: boolean;
  badges: BadgeSeed[];
}

export interface DemoItemSeed {
  id: string;
  userId: string;
  title: string;
  description: string;
  images: string[];
  category: string;
  ageRange: string;
  exchangeMode: 'gift' | 'swap' | 'sell';
  price: number | null;
  condition: '全新' | '几乎全新' | '轻微使用' | '正常使用';
  tags: string[];
  community: string;
  lat: number;
  lng: number;
  status: 'available' | 'pending' | 'completed';
  createdAt: string;
  viewCount: number;
  favoriteCount: number;
}

export interface DemoMessageSeed {
  id: string;
  itemId: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface DemoExchangeSeed {
  id: string;
  itemId: string;
  requesterId: string;
  ownerId: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  message: string;
  createdAt: string;
}

export interface DemoNotificationSeed {
  id: string;
  userId: string;
  type: 'message' | 'exchange' | 'system';
  title: string;
  content: string;
  relatedItemId: string | null;
  read: boolean;
  recalled?: boolean;
  createdAt: string;
}

const communities = [
  { name: '梧桐湾', lat: 32.0106, lng: 112.1321 },
  { name: '清华园', lat: 32.0049, lng: 112.1296 },
  { name: '丽江泊林', lat: 32.0118, lng: 112.1213 },
  { name: '在水一方', lat: 32.0123, lng: 112.1202 },
  { name: '怡和苑', lat: 32.0098, lng: 112.1278 },
];

const badgeLibrary: BadgeSeed[] = [
  { id: 'badge_ambassador', name: '童享大使', icon: '🌟', color: 'text-amber-600' },
  { id: 'badge_books', name: '绘本漂流员', icon: '📚', color: 'text-sky-600' },
  { id: 'badge_green', name: '绿色家庭', icon: '🌿', color: 'text-emerald-600' },
  { id: 'badge_reliable', name: '靠谱邻居', icon: '👍', color: 'text-blue-600' },
  { id: 'badge_sport', name: '运动装备官', icon: '🚲', color: 'text-violet-600' },
];

type ItemTemplate = readonly [string, string, string[]];
type CatalogEntry = {
  category: string;
  ageRange: string;
  exchangeMode: 'gift' | 'swap' | 'sell';
  price: number | null;
  condition: '全新' | '几乎全新' | '轻微使用' | '正常使用';
  titlePrefix: string;
  templates: ItemTemplate[];
};

type FeaturedPublicListing = {
  title: string;
  description: string;
  images: string[];
  category: string;
  ageRange: string;
  exchangeMode: 'gift' | 'swap' | 'sell';
  price: number | null;
  condition: '全新' | '几乎全新' | '轻微使用' | '正常使用';
  tags: string[];
  preferredUserIndex: number;
  status?: 'available' | 'pending' | 'completed';
  dayOffset: number;
  hour: number;
  viewCount: number;
  favoriteCount: number;
};

const itemCatalog: CatalogEntry[] = [
  {
    category: 'book',
    ageRange: '3-6',
    exchangeMode: 'swap' as const,
    price: null,
    condition: '轻微使用' as const,
    titlePrefix: '绘本',
    templates: [
      ['宫西达也恐龙系列', '整套保存完整，适合亲子共读，边角有正常翻阅痕迹。', ['绘本', '宫西达也', '亲子阅读']],
      ['小熊宝宝启蒙绘本', '低幼阶段读得很勤，纸板书耐翻，适合刚开始看书的小朋友。', ['低幼绘本', '启蒙', '纸板书']],
      ['神奇校车桥梁书', '孩子升一年级前读完了，故事性很强，适合喜欢问为什么的小朋友。', ['桥梁书', '科普', '神奇校车']],
    ],
  },
  {
    category: 'toy',
    ageRange: '0-3',
    exchangeMode: 'gift' as const,
    price: null,
    condition: '正常使用' as const,
    titlePrefix: '玩具',
    templates: [
      ['费雪声光健身架', '音乐和小挂件都正常，适合趴玩和抓握训练。', ['费雪', '健身架', '婴儿玩具']],
      ['澳贝牙胶摇铃礼盒', '宝宝月龄过了，用不上了，清洗消毒过，可直接带走。', ['牙胶', '摇铃', '婴儿用品']],
      ['木质认知积木桶', '边角打磨圆润，收纳方便，适合在家里做颜色和形状启蒙。', ['积木', '木质玩具', '认知启蒙']],
    ],
  },
  {
    category: 'toy',
    ageRange: '3-6',
    exchangeMode: 'sell' as const,
    price: 98,
    condition: '轻微使用' as const,
    titlePrefix: '运动',
    templates: [
      ['儿童滑板车可升降', '轮子顺滑，折叠后好收纳，孩子换大号车了。', ['滑板车', '可升降', '户外']],
      ['16寸儿童自行车', '带辅助轮，刹车灵敏，适合刚学骑车的宝宝。', ['自行车', '16寸', '辅助轮']],
      ['平衡车入门款', '车身轻，孩子3岁时骑得很多，现在高度不合适了。', ['平衡车', '户外', '启蒙骑行']],
    ],
  },
  {
    category: 'stroller',
    ageRange: '0-3',
    exchangeMode: 'sell' as const,
    price: 260,
    condition: '正常使用' as const,
    titlePrefix: '大件',
    templates: [
      ['轻便折叠婴儿车', '一键收车，车罩和置物篮都在，适合上下楼。', ['婴儿车', '轻便', '折叠']],
      ['餐椅可调节带安全带', '擦拭后可直接用，托盘齐全，适合加辅食阶段。', ['餐椅', '辅食', '安全带']],
      ['儿童学习桌椅套装', '桌面升降正常，椅背无松动，适合幼小衔接。', ['学习桌', '桌椅', '学习空间']],
    ],
  },
  {
    category: 'clothes',
    ageRange: '0-3',
    exchangeMode: 'gift' as const,
    price: null,
    condition: '几乎全新' as const,
    titlePrefix: '衣物',
    templates: [
      ['女童春秋外套两件', '洗净收好后一直没穿，适合90-100码。', ['女童', '春秋', '外套']],
      ['男童夏季家居服三套', '面料柔软，适合幼儿园在家穿。', ['男童', '家居服', '夏季']],
      ['学步鞋两双打包', '鞋底磨损不大，适合刚学走路的孩子。', ['学步鞋', '鞋子', '打包']],
    ],
  },
  {
    category: 'education',
    ageRange: '3-6',
    exchangeMode: 'swap' as const,
    price: null,
    condition: '轻微使用' as const,
    titlePrefix: '早教',
    templates: [
      ['火火兔早教机', '故事和儿歌都正常，电池续航也还可以。', ['早教机', '故事机', '启蒙']],
      ['磁力片基础套装', '常玩的片数都在，适合亲子一起搭建。', ['磁力片', '空间搭建', 'STEM']],
      ['巧虎低龄启蒙包', '绘本和教具比较齐，适合在家做日常陪伴。', ['巧虎', '启蒙', '教具']],
    ],
  },
];

const notificationCopy = {
  message: ['你收到一条新私信', '有邻居在问物品细节', '有人回复了你的留言'],
  exchange: ['有邻居发起了预约', '预约状态更新了', '一次交换已完成'],
};

const featuredPublicListings: FeaturedPublicListing[] = [
  {
    title: '轻便折叠婴儿车',
    description: '车棚、置物篮、脚踏都在，平时主要是小区里短距离遛娃用，前轮顺滑，折叠后放后备箱没压力。孩子已经不用推车了，想转给同片区有需要的家庭。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/Baby%20stroller%20%2850941798266%29.jpg?width=1280'],
    category: 'stroller',
    ageRange: '0-3',
    exchangeMode: 'sell',
    price: 258,
    condition: '轻微使用',
    tags: ['婴儿车', '折叠', '小区自提'],
    preferredUserIndex: 1,
    dayOffset: 0,
    hour: 23,
    viewCount: 126,
    favoriteCount: 16,
  },
  {
    title: '宝宝高脚餐椅',
    description: '托盘和安全带齐全，家里一直是吃饭时用，擦拭消毒后可直接继续使用。适合刚开始独立坐餐椅和练习自主进食的宝宝。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/Baby%20High%20Chair%20%2850841207558%29.jpg?width=1280'],
    category: 'furniture',
    ageRange: '0-3',
    exchangeMode: 'sell',
    price: 138,
    condition: '正常使用',
    tags: ['餐椅', '辅食期', '安全带'],
    preferredUserIndex: 4,
    dayOffset: 0,
    hour: 22,
    viewCount: 94,
    favoriteCount: 12,
  },
  {
    title: '宝宝学步车带防侧翻底盘',
    description: '轮子和音乐都正常，家里宝宝刚会走后就基本闲置了。更适合当过渡用品，同片区邻居自提会比较方便。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/Baby%20Walker%20%2850842018142%29.jpg?width=1280'],
    category: 'toy',
    ageRange: '0-3',
    exchangeMode: 'gift',
    price: null,
    condition: '正常使用',
    tags: ['学步车', '低龄', '免费送'],
    preferredUserIndex: 7,
    dayOffset: 0,
    hour: 21,
    viewCount: 88,
    favoriteCount: 14,
  },
  {
    title: '儿童安全座椅 9个月-4岁',
    description: '家里第二辆车拆下来的，卡扣正常、坐垫完整，短途接送孩子一直在用。更适合有车家庭周末来看实物后再决定。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/Child%20car%20seat.JPG?width=1280'],
    category: 'furniture',
    ageRange: '0-3',
    exchangeMode: 'sell',
    price: 199,
    condition: '轻微使用',
    tags: ['安全座椅', '车载', '自提优先'],
    preferredUserIndex: 10,
    dayOffset: 0,
    hour: 20,
    viewCount: 110,
    favoriteCount: 11,
  },
  {
    title: '平衡车入门款',
    description: '车身比较轻，孩子 3 岁时在小区里骑得很多，现在腿长不太合适了。车把和坐垫升降都正常，适合刚接触骑行的小朋友。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/Balance%20bike.jpg?width=1280'],
    category: 'toy',
    ageRange: '3-6',
    exchangeMode: 'sell',
    price: 96,
    condition: '轻微使用',
    tags: ['平衡车', '户外', '启蒙骑行'],
    preferredUserIndex: 13,
    dayOffset: 0,
    hour: 19,
    viewCount: 132,
    favoriteCount: 19,
  },
  {
    title: '木质彩色积木桶',
    description: '颜色和形状都比较全，边角比较圆润，适合在家做颜色配对和简单搭建。我们家已经转到磁力片阶段了，这套想继续流转。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/Toyblocks.JPG'],
    category: 'education',
    ageRange: '0-3',
    exchangeMode: 'gift',
    price: null,
    condition: '轻微使用',
    tags: ['积木', '木质玩具', '启蒙'],
    preferredUserIndex: 16,
    dayOffset: 0,
    hour: 18,
    viewCount: 73,
    favoriteCount: 10,
  },
  {
    title: '木制角色玩具一套',
    description: '适合做过家家和角色扮演，孩子小时候很喜欢摆着玩。收纳后一直放在柜子里，整体成色还不错，想换点绘本或者拼图。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/Wooden%20toys.JPG?width=1280'],
    category: 'toy',
    ageRange: '3-6',
    exchangeMode: 'swap',
    price: null,
    condition: '轻微使用',
    tags: ['木制玩具', '角色扮演', '换绘本'],
    preferredUserIndex: 19,
    dayOffset: 0,
    hour: 17,
    viewCount: 81,
    favoriteCount: 9,
  },
  {
    title: '复古小三轮摆拍车',
    description: '更适合院子里慢慢骑或者拍照用，造型特别，金属件保存还可以。家里腾地方，便宜出给喜欢这种老式小车的邻居。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/Old%20Children%27s%20tricycle%20pic1.JPG?width=1280'],
    category: 'toy',
    ageRange: '3-6',
    exchangeMode: 'sell',
    price: 66,
    condition: '正常使用',
    tags: ['三轮车', '院子玩具', '复古款'],
    preferredUserIndex: 22,
    status: 'pending',
    dayOffset: 0,
    hour: 16,
    viewCount: 67,
    favoriteCount: 7,
  },
  {
    title: '木制火车轨道套装',
    description: '轨道、桥和小车都还在，适合在地垫上慢慢搭。家里已经换成拼插玩具了，这套更适合继续给喜欢轨道的小朋友。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/Wooden%20toy%20train%20%E2%80%A2%20tracks%20and%20bridge.jpg?width=1280'],
    category: 'toy',
    ageRange: '3-6',
    exchangeMode: 'sell',
    price: 88,
    condition: '轻微使用',
    tags: ['木制火车', '轨道玩具', '桥梁场景'],
    preferredUserIndex: 2,
    dayOffset: 0,
    hour: 15,
    viewCount: 86,
    favoriteCount: 12,
  },
  {
    title: '彩色小火车头积木',
    description: '颜色比较鲜艳，拿在手里很顺手，适合做颜色认知和简单角色扮演。家里收纳压力有点大，想打包让它继续被玩起来。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/Toytrain.jpg?width=1280'],
    category: 'toy',
    ageRange: '0-3',
    exchangeMode: 'gift',
    price: null,
    condition: '正常使用',
    tags: ['小火车', '颜色认知', '免费送'],
    preferredUserIndex: 5,
    dayOffset: 0,
    hour: 14,
    viewCount: 64,
    favoriteCount: 8,
  },
  {
    title: '木制过家家厨房',
    description: '锅具、台面和小柜门完整，适合在家玩做饭游戏。虽然是复古一点的款式，但质感很好，拍照和日常玩都不错。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/Toy%20Kitchen%20MET%20ES5699.jpg?width=1280'],
    category: 'toy',
    ageRange: '3-6',
    exchangeMode: 'sell',
    price: 128,
    condition: '轻微使用',
    tags: ['过家家', '厨房玩具', '木质'],
    preferredUserIndex: 8,
    dayOffset: 0,
    hour: 13,
    viewCount: 92,
    favoriteCount: 13,
  },
  {
    title: '木制手工玩具摆件',
    description: '这件更像有工艺感的小玩具，适合给喜欢木头质感和慢节奏玩耍的孩子。放在书柜或玩具角都很耐看。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/Wooden%20toy.jpg?width=1280'],
    category: 'toy',
    ageRange: '3-6',
    exchangeMode: 'swap',
    price: null,
    condition: '几乎全新',
    tags: ['木制玩具', '手工感', '交换'],
    preferredUserIndex: 11,
    dayOffset: 0,
    hour: 12,
    viewCount: 58,
    favoriteCount: 6,
  },
  {
    title: '传统木制拖拉玩具',
    description: '适合放在地上推着走或者当成玩具角陈列，质感很稳。我们家更偏爱磁力片了，这件转给喜欢木质玩具的邻居。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/Traditional%20Wooden%20toy.jpg?width=1280'],
    category: 'toy',
    ageRange: '0-3',
    exchangeMode: 'gift',
    price: null,
    condition: '轻微使用',
    tags: ['拖拉玩具', '木制', '低龄'],
    preferredUserIndex: 14,
    dayOffset: 0,
    hour: 11,
    viewCount: 49,
    favoriteCount: 5,
  },
  {
    title: '木制小汽车组合',
    description: '适合男孩女孩一起玩，放在车轨或者地垫上都行。细节比较完整，适合喜欢车辆主题的小朋友。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/Wooden%20toy%20models.jpg?width=1280'],
    category: 'toy',
    ageRange: '3-6',
    exchangeMode: 'sell',
    price: 59,
    condition: '轻微使用',
    tags: ['小汽车', '木制模型', '车辆玩具'],
    preferredUserIndex: 17,
    dayOffset: 0,
    hour: 10,
    viewCount: 72,
    favoriteCount: 9,
  },
  {
    title: '桥梁书一摞',
    description: '这一摞适合已经能独立看图配字的孩子，比较适合作为幼小衔接阶段的过渡阅读。书脊都比较完整，打包更省心。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/Stack%20of%20books.jpg?width=1280'],
    category: 'book',
    ageRange: '3-6',
    exchangeMode: 'swap',
    price: null,
    condition: '轻微使用',
    tags: ['桥梁书', '打包', '阅读进阶'],
    preferredUserIndex: 20,
    dayOffset: 0,
    hour: 9,
    viewCount: 83,
    favoriteCount: 11,
  },
  {
    title: '启蒙绘本一大摞',
    description: '适合刚开始建立阅读习惯的小朋友，放在床头或阅读角都很方便。想换一些拼图或者低龄桌游。',
    images: ['https://commons.wikimedia.org/wiki/Special:FilePath/A%20Stack%20of%20Books.png?width=1280'],
    category: 'book',
    ageRange: '0-3',
    exchangeMode: 'swap',
    price: null,
    condition: '正常使用',
    tags: ['绘本', '低龄阅读', '交换拼图'],
    preferredUserIndex: 23,
    dayOffset: 0,
    hour: 8,
    viewCount: 95,
    favoriteCount: 15,
  },
];

function createDemoImage(seed: string, title: string, accent: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="#f8fafc" />
        </linearGradient>
      </defs>
      <rect width="640" height="640" rx="56" fill="url(#bg)" />
      <circle cx="510" cy="124" r="76" fill="rgba(255,255,255,0.45)" />
      <circle cx="154" cy="516" r="92" fill="rgba(255,255,255,0.35)" />
      <text x="64" y="126" fill="#0f172a" font-size="36" font-family="Arial, sans-serif">童邻市集好物</text>
      <text x="64" y="336" fill="#0f172a" font-size="56" font-weight="700" font-family="Arial, sans-serif">${title}</text>
      <text x="64" y="404" fill="#334155" font-size="28" font-family="Arial, sans-serif">${seed}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function isoDaysAgo(dayOffset: number, hour: number) {
  const base = new Date(Date.UTC(2026, 3, 21, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() - dayOffset);
  base.setUTCHours(hour, (dayOffset * 7) % 60, 0, 0);
  return base.toISOString();
}

function pick<T>(list: T[], index: number): T {
  return list[index % list.length];
}

function buildFeaturedPublicItems(users: DemoUserSeed[]): DemoItemSeed[] {
  return featuredPublicListings.map((listing, index) => {
    const owner = users[listing.preferredUserIndex % users.length];

    return {
      id: `item_demo_${String(index + 1).padStart(3, '0')}`,
      userId: owner.id,
      title: listing.title,
      description: `${listing.description} ${owner.community}同片区都可以约时间，自提优先。`,
      images: listing.images,
      category: listing.category,
      ageRange: listing.ageRange,
      exchangeMode: listing.exchangeMode,
      price: listing.price,
      condition: listing.condition,
      tags: listing.tags,
      community: owner.community,
      lat: owner.lat,
      lng: owner.lng,
      status: listing.status ?? 'available',
      createdAt: isoDaysAgo(listing.dayOffset, listing.hour),
      viewCount: listing.viewCount,
      favoriteCount: listing.favoriteCount,
    };
  });
}

export function buildDemoUsers(): DemoUserSeed[] {
  const namePool = [
    '果果妈', '阿哲爸爸', '小汤圆妈', '七七爸爸', '年糕妈', '乐乐爸',
    '鱼丸妈妈', '宸宸爸爸', '米粒妈', '小满爸爸', '柚子妈', '安安爸',
    '跳跳妈', '航航爸爸', '木木妈', '可乐爸', '桃桃妈', '小南爸爸',
    '糖豆妈', '多多爸爸', '朵朵妈', '麦麦爸爸', '可可妈', '一一爸爸',
    '西西妈', '团团爸', '暖暖妈', '泡泡爸', '橙子妈', '元宝爸'
  ];
  const avatars = ['👩', '👨', '👩‍🦱', '👨‍🦰', '👩‍🦰', '👨‍💼'];

  return namePool.map((nickname, index) => {
    const community = pick(communities, index);
    const isLiaison = index % 7 === 0;
    const badges = [
      pick(badgeLibrary, index),
      ...(isLiaison ? [badgeLibrary[0]] : []),
    ].filter((badge, badgeIndex, all) => all.findIndex((item) => item.id === badge.id) === badgeIndex);

    return {
      id: `user_demo_${String(index + 1).padStart(3, '0')}`,
      nickname,
      avatar: pick(avatars, index),
      community: community.name,
      lat: community.lat + (index % 3) * 0.0007,
      lng: community.lng + (index % 4) * 0.0005,
      bio: [
        '家里闲置更新很快，想把好用的东西继续传下去。',
        '平时主要流转绘本和户外玩具，喜欢小区里互相分享。',
        '更关注质量和自提方便，愿意认真回复每条私信。',
      ][index % 3],
      creditScore: Number((4.6 + (index % 5) * 0.08).toFixed(1)),
      exchangeCount: 3 + (index % 9) * 2,
      isLiaison,
      badges,
    };
  });
}

export function buildDemoItems(users: DemoUserSeed[]): DemoItemSeed[] {
  return buildFeaturedPublicItems(users);
}

export function buildDemoMessages(items: DemoItemSeed[], users: DemoUserSeed[]): DemoMessageSeed[] {
  const messages: DemoMessageSeed[] = [];
  const conversationItems = items.filter((item, index) => index % 3 === 0).slice(0, 24);

  conversationItems.forEach((item, index) => {
    const owner = users.find((user) => user.id === item.userId)!;
    const requester = users[(index + 5) % users.length];

    messages.push(
      {
        id: `msg_demo_${String(messages.length + 1).padStart(3, '0')}`,
        itemId: item.id,
        fromUserId: requester.id,
        toUserId: owner.id,
        content: index % 2 === 0 ? '你好，这件还在吗？周末方便自提。' : '请问这件成色和描述一样吗？想给孩子试试。',
        read: index % 4 !== 0,
        createdAt: isoDaysAgo(index % 7, 10 + (index % 5)),
      },
      {
        id: `msg_demo_${String(messages.length + 2).padStart(3, '0')}`,
        itemId: item.id,
        fromUserId: owner.id,
        toUserId: requester.id,
        content: item.status === 'completed'
          ? '已经给前一位邻居了，不过我家还有类似的可以整理出来。'
          : item.status === 'pending'
            ? '已经有人先约了，如果最后没拿走我再联系你。'
            : '还在的，可以周六下午来小区门口看看。',
        read: true,
        createdAt: isoDaysAgo(index % 7, 11 + (index % 5)),
      }
    );
  });

  return messages;
}

export function buildDemoExchanges(items: DemoItemSeed[], users: DemoUserSeed[]): DemoExchangeSeed[] {
  return items
    .filter((item) => item.status !== 'available')
    .slice(0, 14)
    .map((item, index) => {
      const requester = users[(index + 9) % users.length];

      return {
        id: `exchange_demo_${String(index + 1).padStart(3, '0')}`,
        itemId: item.id,
        requesterId: requester.id,
        ownerId: item.userId,
        status: item.status === 'completed' ? 'completed' : 'pending',
        message: item.status === 'completed' ? '已经在小区门口顺利交接。' : '想先帮孩子留一下，这周末来取。',
        createdAt: isoDaysAgo(index % 6, 13 + (index % 5)),
      };
    });
}

export function buildDemoNotifications(
  messages: DemoMessageSeed[],
  exchanges: DemoExchangeSeed[]
): DemoNotificationSeed[] {
  const notifications: DemoNotificationSeed[] = [];

  messages.slice(0, 18).forEach((message, index) => {
    notifications.push({
      id: `notif_demo_${String(notifications.length + 1).padStart(3, '0')}`,
      userId: message.toUserId,
      type: 'message',
      title: pick(notificationCopy.message, index),
      content: message.content,
      relatedItemId: message.itemId,
      read: index % 4 === 0,
      createdAt: message.createdAt,
    });
  });

  exchanges.forEach((exchange, index) => {
    notifications.push({
      id: `notif_demo_${String(notifications.length + 1).padStart(3, '0')}`,
      userId: exchange.ownerId,
      type: 'exchange',
      title: pick(notificationCopy.exchange, index),
      content: exchange.status === 'completed' ? '有一单交换已完成，可以继续发布新的闲置啦。' : '有邻居发起了预约，记得尽快回复。',
      relatedItemId: exchange.itemId,
      read: index % 3 === 0,
      createdAt: exchange.createdAt,
    });
  });

  return notifications;
}

export function buildDemoDataset() {
  const users = buildDemoUsers();
  const items = buildDemoItems(users);
  const messages = buildDemoMessages(items, users);
  const exchanges = buildDemoExchanges(items, users);
  const notifications = buildDemoNotifications(messages, exchanges);

  return {
    users,
    items,
    messages,
    exchanges,
    notifications,
  };
}
