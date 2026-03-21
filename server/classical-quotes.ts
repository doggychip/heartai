/**
 * Classical Chinese Quotes Library (古典诗词金句)
 *
 * Curated selection from 《易经》《道德经》《论语》《诗经》唐诗宋词《庄子》《孟子》
 * Indexed by five-element association and theme for contextual selection.
 */

interface QuoteEntry {
  text: string;      // 原文
  source: string;    // 出处
  note: string;      // 现代解读 (15-30字)
  elements: string[]; // 五行关联
  themes: string[];  // 主题标签
}

export interface SelectedQuote {
  text: string;
  source: string;
  note: string;
}

const QUOTES: QuoteEntry[] = [
  // ── 《周易》────────────────────────────────────────────────
  { text: "天行健，君子以自强不息。", source: "《周易·乾卦》",
    note: "天道永恒运行，君子也应奋发不止、自我超越。", elements: ["金", "火"], themes: ["career", "persistence"] },
  { text: "地势坤，君子以厚德载物。", source: "《周易·坤卦》",
    note: "大地包容一切，君子应以宽厚之德承载万物。", elements: ["土"], themes: ["general", "social"] },
  { text: "潜龙勿用。", source: "《周易·乾卦》",
    note: "时机未至，蛰伏积蓄力量，静待最佳出发时机。", elements: ["水"], themes: ["caution", "career"] },
  { text: "飞龙在天，利见大人。", source: "《周易·乾卦》",
    note: "时机成熟，龙腾于天，此刻正适合大展身手。", elements: ["火", "金"], themes: ["career", "positive"] },
  { text: "君子豹变，小人革面。", source: "《周易·革卦》",
    note: "君子如豹一样脱变成长，今日适合转型蜕变。", elements: ["金", "木"], themes: ["change", "career"] },
  { text: "谦谦君子，用涉大川，吉。", source: "《周易·谦卦》",
    note: "谦逊之人，即便涉险也能逢凶化吉，吉祥顺遂。", elements: ["水", "土"], themes: ["caution", "general"] },
  { text: "积善之家，必有余庆。", source: "《周易·坤卦·文言》",
    note: "积累善行的家庭，后代必定福泽绵延。", elements: ["土", "木"], themes: ["general", "social"] },

  // ── 《道德经》───────────────────────────────────────────────
  { text: "上善若水，水善利万物而不争。", source: "《道德经·第八章》",
    note: "最高的善如水，滋养万物却从不与人争名夺利。", elements: ["水"], themes: ["general", "social"] },
  { text: "知人者智，自知者明。", source: "《道德经·第三十三章》",
    note: "了解别人是智慧，真正认清自己才是真正的明白。", elements: ["水", "金"], themes: ["study", "general"] },
  { text: "胜人者有力，自胜者强。", source: "《道德经·第三十三章》",
    note: "战胜他人需要力量，能战胜自己才是真正的强大。", elements: ["金", "火"], themes: ["career", "persistence"] },
  { text: "曲则全，枉则直，洼则盈。", source: "《道德经·第二十二章》",
    note: "弯曲能保全，委屈后伸直，低洼处才能盈满。", elements: ["水", "土"], themes: ["caution", "general"] },
  { text: "致虚极，守静笃。万物并作，吾以观复。", source: "《道德经·第十六章》",
    note: "保持内心虚静，从容观察万物循环往复的规律。", elements: ["水", "木"], themes: ["general", "study"] },
  { text: "为而不争，天之道也。", source: "《道德经·第八十一章》",
    note: "努力做事却不与人争抢，这才是顺应天道的方式。", elements: ["木", "土"], themes: ["career", "social"] },
  { text: "信言不美，美言不信。", source: "《道德经·第八十一章》",
    note: "真诚的话不一定好听，好听的话不一定真诚。", elements: ["金", "水"], themes: ["social", "general"] },

  // ── 《论语》────────────────────────────────────────────────
  { text: "吾日三省吾身。", source: "《论语·学而》",
    note: "每天多次反省自己，是持续成长的关键所在。", elements: ["土", "水"], themes: ["study", "general"] },
  { text: "学而时习之，不亦说乎？", source: "《论语·学而》",
    note: "学习并时常温习实践，是一件令人真正愉悦的事。", elements: ["木", "水"], themes: ["study"] },
  { text: "君子和而不同，小人同而不和。", source: "《论语·子路》",
    note: "真正的和谐允许差异，而非盲目附和、失去自我。", elements: ["木", "土"], themes: ["social"] },
  { text: "己所不欲，勿施于人。", source: "《论语·颜渊》",
    note: "自己不愿意承受的，不要强加给别人。", elements: ["土", "火"], themes: ["social", "relationship"] },
  { text: "岁寒，然后知松柏之后凋也。", source: "《论语·子罕》",
    note: "越是艰难时刻，越能显现出真正坚韧的品格。", elements: ["木", "金"], themes: ["persistence", "caution"] },
  { text: "仁者乐山，智者乐水。", source: "《论语·雍也》",
    note: "仁爱的人如山般稳重，智慧的人如水般灵动变通。", elements: ["土", "水"], themes: ["general"] },
  { text: "三人行，必有我师焉。", source: "《论语·述而》",
    note: "身边每一个人都有值得学习之处，保持谦逊开放。", elements: ["木", "土"], themes: ["study", "social"] },

  // ── 《诗经》────────────────────────────────────────────────
  { text: "关关雎鸠，在河之洲。窈窕淑女，君子好逑。", source: "《诗经·关雎》",
    note: "美好的感情总在不经意间，真诚的缘分自会到来。", elements: ["水", "木"], themes: ["love", "relationship"] },
  { text: "青青子衿，悠悠我心。", source: "《诗经·子衿》",
    note: "那人的身影萦绕心间，思念悠长而温柔。", elements: ["木", "水"], themes: ["love"] },
  { text: "蒹葭苍苍，白露为霜。所谓伊人，在水一方。", source: "《诗经·蒹葭》",
    note: "向往之人在彼岸，追求美好需要耐心与方向。", elements: ["水", "金"], themes: ["love", "caution"] },
  { text: "桃之夭夭，灼灼其华。", source: "《诗经·桃夭》",
    note: "桃花灼灼盛开，正是充满活力与生机的好时节。", elements: ["木", "火"], themes: ["love", "positive"] },

  // ── 唐诗──────────────────────────────────────────────────
  { text: "长风破浪会有时，直挂云帆济沧海。", source: "李白《行路难》",
    note: "总有一天能乘风破浪，扬帆渡过人生的大海。", elements: ["金", "水"], themes: ["career", "persistence"] },
  { text: "天生我材必有用，千金散尽还复来。", source: "李白《将进酒》",
    note: "每个人都有独特价值，失去的终将以另一种形式回来。", elements: ["金", "火"], themes: ["career", "wealth", "positive"] },
  { text: "会当凌绝顶，一览众山小。", source: "杜甫《望岳》",
    note: "站上高处时，眼界自然开阔，小事不再困扰于心。", elements: ["火", "土"], themes: ["career", "persistence"] },
  { text: "明月松间照，清泉石上流。", source: "王维《山居秋暝》",
    note: "自然清净之美，提醒你返璞归真，找到内心的平静。", elements: ["水", "木"], themes: ["general", "study"] },
  { text: "海内存知己，天涯若比邻。", source: "王勃《送杜少府之任蜀州》",
    note: "真正的知己无论相距多远，心永远是靠近的。", elements: ["火", "土"], themes: ["social", "relationship"] },
  { text: "春蚕到死丝方尽，蜡炬成灰泪始干。", source: "李商隐《无题》",
    note: "对感情全力投入，如蚕吐丝般执着，如烛光般无私。", elements: ["火", "木"], themes: ["love", "persistence"] },
  { text: "山重水复疑无路，柳暗花明又一村。", source: "陆游《游山西村》",
    note: "看似走投无路时，转个弯往往就是柳暗花明的出口。", elements: ["木", "水"], themes: ["positive", "caution"] },
  { text: "千里莺啼绿映红，水村山郭酒旗风。", source: "杜牧《江南春》",
    note: "春意盎然，万物生机勃勃，适合播种新的计划与希望。", elements: ["木", "火"], themes: ["positive", "career"] },

  // ── 宋词──────────────────────────────────────────────────
  { text: "人有悲欢离合，月有阴晴圆缺，此事古难全。", source: "苏轼《水调歌头》",
    note: "悲欢离合是人生常态，接受不完美才能享受真正的圆满。", elements: ["水", "土"], themes: ["general", "caution"] },
  { text: "但愿人长久，千里共婵娟。", source: "苏轼《水调歌头》",
    note: "距离无法阻断真挚的感情，共赏一轮明月便是联结。", elements: ["水", "木"], themes: ["love", "relationship"] },
  { text: "莫听穿林打叶声，何妨吟啸且徐行。", source: "苏轼《定风波》",
    note: "面对风雨无需惊慌，从容淡定才是真正的自在豁达。", elements: ["木", "水"], themes: ["caution", "general"] },
  { text: "昨夜西风凋碧树，独上高楼，望尽天涯路。", source: "晏殊《蝶恋花》",
    note: "独处高处才能看清方向，孤独也是一种珍贵的成长。", elements: ["金", "木"], themes: ["study", "persistence"] },
  { text: "衣带渐宽终不悔，为伊消得人憔悴。", source: "柳永《蝶恋花》",
    note: "为所爱之事全力付出，即便消瘦憔悴也心甘情愿。", elements: ["火", "木"], themes: ["love", "persistence"] },
  { text: "生当作人杰，死亦为鬼雄。", source: "李清照《夏日绝句》",
    note: "无论何时都要活出气节，顶天立地地做真正的自己。", elements: ["金", "火"], themes: ["career", "persistence"] },
  { text: "大江东去，浪淘尽，千古风流人物。", source: "苏轼《念奴娇》",
    note: "历史的洪流滚滚向前，真正的成就终将流传后世。", elements: ["水", "金"], themes: ["career", "general"] },

  // ── 《庄子》《孟子》──────────────────────────────────────
  { text: "吾生也有涯，而知也无涯。", source: "《庄子·养生主》",
    note: "生命有限，知识无穷，专注当下最值得做的事。", elements: ["水", "木"], themes: ["study", "general"] },
  { text: "相濡以沫，不如相忘于江湖。", source: "《庄子·大宗师》",
    note: "有时候真正的自由是放手，让彼此各自绽放。", elements: ["水", "木"], themes: ["love", "relationship"] },
  { text: "天将降大任于斯人也，必先苦其心志，劳其筋骨。", source: "《孟子·告子下》",
    note: "越重大的使命，越需要经历磨砺才能完成。", elements: ["火", "土"], themes: ["career", "persistence", "caution"] },
  { text: "穷则独善其身，达则兼善天下。", source: "《孟子·尽心上》",
    note: "困境时先修炼自己，顺境时再去帮助更多的人。", elements: ["土", "木"], themes: ["general", "career"] },
  { text: "故天下兼相爱则治，交相恶则乱。", source: "《墨子·兼爱上》",
    note: "彼此以爱相待，世界便和谐；以恶相向，便生纷争。", elements: ["火", "土"], themes: ["social", "relationship"] },
];

// ── Element alias map ──────────────────────────────────────────
const ELEMENT_ALIASES: Record<string, string> = {
  "Metal": "金", "Wood": "木", "Water": "水", "Fire": "火", "Earth": "土",
  "金": "金", "木": "木", "水": "水", "火": "火", "土": "土",
};

// ── Theme-to-tag mapping ───────────────────────────────────────
const DIMENSION_THEME_MAP: Record<string, string[]> = {
  love: ["love", "relationship"],
  wealth: ["wealth", "career"],
  career: ["career", "persistence"],
  study: ["study", "general"],
  social: ["social", "relationship"],
  positive: ["positive"],
  caution: ["caution"],
  general: ["general"],
};

/**
 * Pick a contextually appropriate classical quote.
 * Selection is deterministic when `seed` is provided (same date → same quote).
 */
export function pickClassicalQuote(options: {
  element?: string;
  theme?: string;
  seed?: number;
}): SelectedQuote {
  const { element, theme, seed = Date.now() } = options;

  let candidates = [...QUOTES];

  // Filter by element
  if (element) {
    const el = ELEMENT_ALIASES[element] || element;
    const byEl = candidates.filter(q => q.elements.includes(el));
    if (byEl.length > 0) candidates = byEl;
  }

  // Further filter by theme
  if (theme) {
    const tags = DIMENSION_THEME_MAP[theme] || [theme];
    const byTheme = candidates.filter(q => q.themes.some(t => tags.includes(t)));
    if (byTheme.length > 0) candidates = byTheme;
  }

  const idx = Math.abs(Math.floor(seed)) % candidates.length;
  const q = candidates[idx];
  return { text: q.text, source: q.source, note: q.note };
}
