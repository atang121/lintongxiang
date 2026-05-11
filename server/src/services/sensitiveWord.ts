/**
 * 敏感词过滤服务
 *
 * 支持分类：political（政治）、porn（色情）、gambling（赌博）、drugs（毒品）、
 *           insult（辱骂）、ad（广告）、live_animal（宠物活物）、
 *           food_medicine（食品药品）、hygiene_risk（贴身卫生风险）、
 *           safety_hazard（安全隐患）、counterfeit（侵权仿冒）、
 *           dangerous_goods（危险品）、payment_risk（资金风险）、
 *           privacy（隐私风险）、other（其他）
 *
 * 算法：DFA（确定有限自动机），高效匹配大量关键词
 * 词库来源：内置基础词库 + 数据库动态词库（管理员可增删）
 */

import { query, run, uuid } from '../models/db';

// ===== 敏感词分类 =====
export type SensitiveCategory =
  | 'political'
  | 'porn'
  | 'gambling'
  | 'drugs'
  | 'insult'
  | 'ad'
  | 'live_animal'
  | 'food_medicine'
  | 'hygiene_risk'
  | 'safety_hazard'
  | 'counterfeit'
  | 'dangerous_goods'
  | 'payment_risk'
  | 'privacy'
  | 'other';

export const CATEGORY_LABEL: Record<SensitiveCategory, string> = {
  political: '政治敏感',
  porn: '色情低俗',
  gambling: '赌博',
  drugs: '毒品',
  insult: '辱骂',
  ad: '广告',
  live_animal: '宠物活物',
  food_medicine: '食品药品',
  hygiene_risk: '贴身卫生风险',
  safety_hazard: '安全隐患',
  counterfeit: '侵权仿冒',
  dangerous_goods: '危险品',
  payment_risk: '资金风险',
  privacy: '隐私风险',
  other: '其他',
};

export const CATEGORY_EMOJI: Record<SensitiveCategory, string> = {
  political: '🚫',
  porn: '🔞',
  gambling: '🎲',
  drugs: '💊',
  insult: '💢',
  ad: '📢',
  live_animal: '🐾',
  food_medicine: '🥫',
  hygiene_risk: '🧼',
  safety_hazard: '🧯',
  counterfeit: '©️',
  dangerous_goods: '☠️',
  payment_risk: '💸',
  privacy: '🔐',
  other: '⚠️',
};

// ===== 内置基础敏感词库 =====
const BUILTIN_WORDS: Array<{ word: string; category: SensitiveCategory }> = [
  // --- 政治（中国政治人物、敏感事件等）---
  { word: '习近平', category: 'political' },
  { word: '习大大', category: 'political' },
  { word: '习主席', category: 'political' },
  { word: '习总', category: 'political' },
  { word: '习近平主席', category: 'political' },
  { word: '李强', category: 'political' },
  { word: '李克强', category: 'political' },
  { word: '胡锦涛', category: 'political' },
  { word: '江泽民', category: 'political' },
  { word: '温家宝', category: 'political' },
  { word: '朱镕基', category: 'political' },
  { word: '毛泽东', category: 'political' },
  { word: '邓小平', category: 'political' },
  { word: '周恩来', category: 'political' },
  { word: '王岐山', category: 'political' },
  { word: '六四', category: 'political' },
  { word: '天安门事件', category: 'political' },
  { word: '法轮功', category: 'political' },
  { word: '法轮大法', category: 'political' },
  { word: '台独', category: 'political' },
  { word: '藏独', category: 'political' },
  { word: '疆独', category: 'political' },
  { word: '反华', category: 'political' },
  { word: '颠覆政权', category: 'political' },
  { word: '推翻政府', category: 'political' },
  { word: '分裂国家', category: 'political' },

  // --- 色情低俗 ---
  { word: '色情', category: 'porn' },
  { word: '裸体', category: 'porn' },
  { word: '裸聊', category: 'porn' },
  { word: '裸照', category: 'porn' },
  { word: '卖淫', category: 'porn' },
  { word: '嫖娼', category: 'porn' },
  { word: '一夜情', category: 'porn' },
  { word: '援交', category: 'porn' },
  { word: '约炮', category: 'porn' },
  { word: '性服务', category: 'porn' },
  { word: '成人视频', category: 'porn' },
  { word: '情趣用品', category: 'porn' },
  { word: '性行为', category: 'porn' },
  { word: '口交', category: 'porn' },
  { word: '肛交', category: 'porn' },
  { word: '自慰', category: 'porn' },
  { word: '手淫', category: 'porn' },
  { word: '强奸', category: 'porn' },
  { word: '轮奸', category: 'porn' },
  { word: '迷奸', category: 'porn' },

  // --- 赌博 ---
  { word: '赌博', category: 'gambling' },
  { word: '赌场', category: 'gambling' },
  { word: '赌钱', category: 'gambling' },
  { word: '网赌', category: 'gambling' },
  { word: '棋牌充值', category: 'gambling' },
  { word: '百家乐', category: 'gambling' },
  { word: '老虎机', category: 'gambling' },
  { word: '时时彩', category: 'gambling' },
  { word: '六合彩', category: 'gambling' },
  { word: '赌球', category: 'gambling' },
  { word: '博彩', category: 'gambling' },
  { word: '下注', category: 'gambling' },
  { word: '庄家', category: 'gambling' },
  { word: '开盘', category: 'gambling' },
  { word: '赌资', category: 'gambling' },

  // --- 毒品 ---
  { word: '毒品', category: 'drugs' },
  { word: '冰毒', category: 'drugs' },
  { word: '海洛因', category: 'drugs' },
  { word: '大麻', category: 'drugs' },
  { word: '可卡因', category: 'drugs' },
  { word: '摇头丸', category: 'drugs' },
  { word: 'K粉', category: 'drugs' },
  { word: '麻古', category: 'drugs' },
  { word: '鸦片', category: 'drugs' },
  { word: '吗啡', category: 'drugs' },
  { word: '吸贩毒', category: 'drugs' },
  { word: '贩毒', category: 'drugs' },
  { word: '吸毒', category: 'drugs' },

  // --- 辱骂 ---
  { word: '傻逼', category: 'insult' },
  { word: '操你', category: 'insult' },
  { word: '妈的', category: 'insult' },
  { word: '他妈的', category: 'insult' },
  { word: '狗日的', category: 'insult' },
  { word: '王八蛋', category: 'insult' },
  { word: '混蛋', category: 'insult' },
  { word: '脑残', category: 'insult' },
  { word: '白痴', category: 'insult' },
  { word: '废物', category: 'insult' },
  { word: '滚蛋', category: 'insult' },
  { word: '去死', category: 'insult' },
  { word: '贱人', category: 'insult' },
  { word: '婊子', category: 'insult' },
  { word: '骚货', category: 'insult' },
  { word: '草泥马', category: 'insult' },
  { word: '尼玛', category: 'insult' },
  { word: '日你', category: 'insult' },
  { word: '放屁', category: 'insult' },
  { word: '滚你', category: 'insult' },
  { word: '垃圾人', category: 'insult' },
  { word: '人渣', category: 'insult' },
  { word: '骗子', category: 'insult' },
  { word: '诈骗', category: 'insult' },
  { word: '坑蒙拐骗', category: 'insult' },
  { word: '坑人', category: 'insult' },

  // --- 广告 ---
  { word: '加微信', category: 'ad' },
  { word: '加我微信', category: 'ad' },
  { word: '加V', category: 'ad' },
  { word: '加v信', category: 'ad' },
  { word: '兼职刷单', category: 'ad' },
  { word: '日赚千元', category: 'ad' },
  { word: '免费领红包', category: 'ad' },
  { word: '点击领取', category: 'ad' },
  { word: '代开发票', category: 'ad' },
  { word: '办理信用卡', category: 'ad' },
  { word: '贷款秒批', category: 'ad' },
  { word: '贷款无需审核', category: 'ad' },
  { word: '代办证件', category: 'ad' },
  { word: '办假证', category: 'ad' },
  { word: '刷单', category: 'ad' },
  { word: '刷信誉', category: 'ad' },
  { word: '扫码领奖', category: 'ad' },
  { word: '扫码领取', category: 'ad' },
  { word: '转发领红包', category: 'ad' },
  { word: '拉群', category: 'ad' },
  { word: '营销号', category: 'ad' },
  { word: '售假', category: 'ad' },
  { word: '低价出售', category: 'ad' },
  { word: '低价代购', category: 'ad' },

  // --- 宠物/活物（平台明确禁止发布、赠送、领养、交易）---
  { word: '宠物', category: 'live_animal' },
  { word: '活物', category: 'live_animal' },
  { word: '活体', category: 'live_animal' },
  { word: '领养', category: 'live_animal' },
  { word: '送养', category: 'live_animal' },
  { word: '猫', category: 'live_animal' },
  { word: '小猫', category: 'live_animal' },
  { word: '猫咪', category: 'live_animal' },
  { word: '狗', category: 'live_animal' },
  { word: '小狗', category: 'live_animal' },
  { word: '狗狗', category: 'live_animal' },
  { word: '鸟', category: 'live_animal' },
  { word: '鹦鹉', category: 'live_animal' },
  { word: '仓鼠', category: 'live_animal' },
  { word: '兔子', category: 'live_animal' },
  { word: '乌龟', category: 'live_animal' },
  { word: '金鱼', category: 'live_animal' },
  { word: '观赏鱼', category: 'live_animal' },
  { word: '爬宠', category: 'live_animal' },
  { word: '蜥蜴', category: 'live_animal' },
  { word: '蛇', category: 'live_animal' },
  { word: '小伙伴', category: 'live_animal' },
  { word: '不养了', category: 'live_animal' },
  { word: '养不了', category: 'live_animal' },
  { word: '谁喜欢', category: 'live_animal' },
  { word: '名字叫', category: 'live_animal' },
  { word: '鸟笼', category: 'live_animal' },
  { word: '笼子', category: 'live_animal' },

  // --- 协议风控：食品 / 药品 / 医疗器械（发布场景直接拦截）---
  { word: '食品', category: 'food_medicine' },
  { word: '零食', category: 'food_medicine' },
  { word: '饮品', category: 'food_medicine' },
  { word: '冲调品', category: 'food_medicine' },
  { word: '奶粉', category: 'food_medicine' },
  { word: '辅食', category: 'food_medicine' },
  { word: '保健品', category: 'food_medicine' },
  { word: '药品', category: 'food_medicine' },
  { word: '处方药', category: 'food_medicine' },
  { word: '退烧药', category: 'food_medicine' },
  { word: '感冒药', category: 'food_medicine' },
  { word: '医疗器械', category: 'food_medicine' },
  { word: '雾化器', category: 'food_medicine' },
  { word: '体温枪', category: 'food_medicine' },
  { word: '过期', category: 'food_medicine' },
  { word: '三无', category: 'food_medicine' },
  { word: '无中文标识', category: 'food_medicine' },

  // --- 协议风控：贴身 / 卫生风险母婴用品 ---
  { word: '贴身衣物', category: 'hygiene_risk' },
  { word: '内裤', category: 'hygiene_risk' },
  { word: '奶嘴', category: 'hygiene_risk' },
  { word: '奶瓶', category: 'hygiene_risk' },
  { word: '牙胶', category: 'hygiene_risk' },
  { word: '口水巾', category: 'hygiene_risk' },
  { word: '吸奶器', category: 'hygiene_risk' },
  { word: '尿布', category: 'hygiene_risk' },
  { word: '尿不湿', category: 'hygiene_risk' },
  { word: '安抚奶嘴', category: 'hygiene_risk' },

  // --- 协议风控：儿童用品安全隐患 ---
  { word: '破损', category: 'safety_hazard' },
  { word: '变形', category: 'safety_hazard' },
  { word: '结构松动', category: 'safety_hazard' },
  { word: '尖锐边角', category: 'safety_hazard' },
  { word: '甲醛超标', category: 'safety_hazard' },
  { word: '电池鼓包', category: 'safety_hazard' },
  { word: '充电异常', category: 'safety_hazard' },
  { word: '出过事故', category: 'safety_hazard' },
  { word: '事故安全座椅', category: 'safety_hazard' },

  // --- 协议风控：侵权 / 盗版 / 仿冒 ---
  { word: '盗版', category: 'counterfeit' },
  { word: '盗印', category: 'counterfeit' },
  { word: '复印教材', category: 'counterfeit' },
  { word: '仿品', category: 'counterfeit' },
  { word: '高仿', category: 'counterfeit' },
  { word: 'A货', category: 'counterfeit' },
  { word: '假货', category: 'counterfeit' },
  { word: '品牌仿冒', category: 'counterfeit' },
  { word: '破解版课程', category: 'counterfeit' },

  // --- 协议风控：危险品 ---
  { word: '管制刀具', category: 'dangerous_goods' },
  { word: '弩', category: 'dangerous_goods' },
  { word: '气枪', category: 'dangerous_goods' },
  { word: '烟花', category: 'dangerous_goods' },
  { word: '爆竹', category: 'dangerous_goods' },
  { word: '易燃易爆', category: 'dangerous_goods' },
  { word: '有毒有害', category: 'dangerous_goods' },
  { word: '农药', category: 'dangerous_goods' },

  // --- 协议风控：资金 / 诈骗风险 ---
  { word: '定金', category: 'payment_risk' },
  { word: '预付款', category: 'payment_risk' },
  { word: '保证金', category: 'payment_risk' },
  { word: '押金', category: 'payment_risk' },
  { word: '先转账', category: 'payment_risk' },
  { word: '扫码付款', category: 'payment_risk' },
  { word: '链接付款', category: 'payment_risk' },

  // --- 协议风控：隐私暴露 / 诱导收集 ---
  { word: '详细地址', category: 'privacy' },
  { word: '门牌号', category: 'privacy' },
  { word: '孩子姓名', category: 'privacy' },
  { word: '学校班级', category: 'privacy' },
  { word: '身份证', category: 'privacy' },
  { word: '验证码', category: 'privacy' },
];

// ===== 文本预处理 =====

// 需要去除的干扰字符（用于绕过 DFA 的特殊符号、空格、零宽字符等）
const STRIP_CHARS_RE = /[\s\u00A0\u3000\u200B-\u200F\u2028-\u202F\uFEFF\u00AD\-_/\\|.*+~^$#@!?;:，。、；：！？…—–·""''（）【】《》〈〉「」『』\[\](){}<>]/g;

/**
 * 预处理文本：去除干扰字符 + 统一英文大小写
 * 返回 { cleaned: 去噪后的文本, map: cleaned[i] → original 中的位置 }
 */
function preprocessText(text: string): { cleaned: string; posMap: number[] } {
  const posMap: number[] = [];
  let cleaned = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!STRIP_CHARS_RE.test(ch)) {
      cleaned += ch.toLowerCase();
      posMap.push(i);
    }
  }
  return { cleaned, posMap };
}

// ===== DFA 实现 =====

interface DFANode {
  isEnd: boolean;
  category?: SensitiveCategory;
  children: Map<string, DFANode>;
}

let dfaRoot: DFANode = { isEnd: false, children: new Map() };
let dfaBuilt = false;

function addToDFA(word: string, category: SensitiveCategory) {
  let node = dfaRoot;
  // DFA 内部统一用小写存储，匹配时也用小写
  const normalized = word.toLowerCase();
  for (const ch of normalized) {
    if (!node.children.has(ch)) {
      node.children.set(ch, { isEnd: false, children: new Map() });
    }
    node = node.children.get(ch)!;
  }
  node.isEnd = true;
  node.category = category;
}

function buildDFA() {
  dfaRoot = { isEnd: false, children: new Map() };
  for (const { word, category } of BUILTIN_WORDS) {
    addToDFA(word, category);
  }
  // 加载数据库中的动态词库
  try {
    const dbWords = query('SELECT word, category FROM sensitive_words') as Array<Record<string, string>>;
    for (const row of dbWords) {
      addToDFA(row.word, row.category as SensitiveCategory);
    }
  } catch {
    // 表可能不存在，忽略
  }
  dfaBuilt = true;
  console.log(`✅ 敏感词 DFA 已构建，内置 ${BUILTIN_WORDS.length} 词`);
}

// 确保 sensitive_words 表存在
let tableEnsured = false;
function ensureTable() {
  if (tableEnsured) return;
  tableEnsured = true;
  try {
    query(`CREATE TABLE IF NOT EXISTS sensitive_words (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'other',
      source TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    query('CREATE INDEX IF NOT EXISTS idx_sensitive_words_word ON sensitive_words(word)');
  } catch {
    // 忽略
  }
}

// ===== 导出接口 =====

export interface CheckResult {
  hasSensitive: boolean;
  matches: Array<{ word: string; category: SensitiveCategory; position: number }>;
  categories: Set<SensitiveCategory>;
  sanitizedText: string;  // 将敏感词替换为 ***
}

/**
 * 检查文本是否包含敏感词（支持变体/拆分/大小写绕过检测）
 * 策略：替换放行 — 将敏感词替换为 *** 后返回 sanitizedText，由调用方决定是否使用
 */
export function checkSensitiveText(text: string): CheckResult {
  if (!dfaBuilt) {
    ensureTable();
    buildDFA();
  }

  const matches: Array<{ word: string; category: SensitiveCategory; position: number }> = [];
  const categories = new Set<SensitiveCategory>();

  // 1. 对原始文本做直接匹配（完整词匹配，精确位置）
  let i = 0;
  while (i < text.length) {
    let node = dfaRoot;
    let j = i;
    let lastMatch: { word: string; category: SensitiveCategory; end: number } | null = null;

    while (j < text.length && node.children.has(text[j].toLowerCase())) {
      node = node.children.get(text[j].toLowerCase())!;
      j++;
      if (node.isEnd && node.category) {
        lastMatch = { word: text.slice(i, j), category: node.category, end: j };
      }
    }

    if (lastMatch) {
      matches.push({ word: lastMatch.word, category: lastMatch.category, position: i });
      categories.add(lastMatch.category);
      i = lastMatch.end;
    } else {
      i++;
    }
  }

  // 2. 预处理去噪后匹配（捕获拆分/加空格/特殊字符等绕过变体）
  const { cleaned, posMap } = preprocessText(text);
  // 记录原始文本中已被直接匹配覆盖的位置范围，避免重复匹配
  const coveredPositions = new Set<number>();
  for (const m of matches) {
    for (let p = m.position; p < m.position + m.word.length; p++) {
      coveredPositions.add(p);
    }
  }

  let ci = 0;
  while (ci < cleaned.length) {
    let node = dfaRoot;
    let cj = ci;
    let lastMatch: { endInCleaned: number; category: SensitiveCategory } | null = null;

    while (cj < cleaned.length && node.children.has(cleaned[cj])) {
      node = node.children.get(cleaned[cj])!;
      cj++;
      if (node.isEnd && node.category) {
        lastMatch = { endInCleaned: cj, category: node.category };
      }
    }

    if (lastMatch) {
      // 将 cleaned 中的位置映射回原始文本位置
      const startPosInOriginal = posMap[ci];
      const endPosInOriginal = posMap[lastMatch.endInCleaned - 1] + 1;
      const originalWord = text.slice(startPosInOriginal, endPosInOriginal);

      // 检查这个范围是否已被直接匹配覆盖
      let alreadyCovered = true;
      for (let p = startPosInOriginal; p < endPosInOriginal; p++) {
        if (!coveredPositions.has(p)) {
          alreadyCovered = false;
          break;
        }
      }

      if (!alreadyCovered) {
        matches.push({
          word: originalWord,
          category: lastMatch.category,
          position: startPosInOriginal,
        });
        categories.add(lastMatch.category);
      }

      ci = lastMatch.endInCleaned;
    } else {
      ci++;
    }
  }

  // 3. 按位置排序，确保替换时顺序正确
  matches.sort((a, b) => a.position - b.position);

  // 4. 生成替换后的文本
  let sanitizedText = text;
  if (matches.length > 0) {
    // 从后往前替换，避免位置偏移
    for (let k = matches.length - 1; k >= 0; k--) {
      const m = matches[k];
      sanitizedText = sanitizedText.slice(0, m.position) + '*'.repeat(m.word.length) + sanitizedText.slice(m.position + m.word.length);
    }
  }

  return {
    hasSensitive: matches.length > 0,
    matches,
    categories,
    sanitizedText,
  };
}

/**
 * 重新加载词库（管理员增删词后调用）
 */
export function reloadSensitiveWords() {
  dfaBuilt = false;
  ensureTable();
  buildDFA();
}

/**
 * 管理员添加敏感词
 */
export function addSensitiveWord(word: string, category: SensitiveCategory, operatorId: string): boolean {
  ensureTable();
  const id = `sw_${uuid().slice(0, 8)}`;
  try {
    run('INSERT OR IGNORE INTO sensitive_words (id, word, category, source) VALUES (?, ?, ?, ?)', [id, word, category, 'admin']);
    reloadSensitiveWords();
    return true;
  } catch {
    return false;
  }
}

/**
 * 管理员删除敏感词
 */
export function removeSensitiveWord(word: string): boolean {
  ensureTable();
  try {
    run('DELETE FROM sensitive_words WHERE word = ?', [word]);
    reloadSensitiveWords();
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取所有动态敏感词（管理后台用）
 */
export function listDynamicWords(): Array<Record<string, string>> {
  ensureTable();
  return query('SELECT * FROM sensitive_words ORDER BY category, word') as Array<Record<string, string>>;
}
