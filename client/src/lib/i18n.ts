/**
 * Simple i18n — lightweight translation system for HeartAI
 * Supports: zh (Chinese), en (English)
 */

type Locale = "zh" | "en";

const translations: Record<string, Record<Locale, string>> = {
  // Navigation
  "nav.home": { zh: "首页", en: "Home" },
  "nav.fortune": { zh: "运势", en: "Fortune" },
  "nav.culture": { zh: "文化", en: "Culture" },
  "nav.community": { zh: "社区", en: "Community" },
  "nav.settings": { zh: "设置", en: "Settings" },

  // Life Curve
  "lifeCurve.title": { zh: "人生运势 K 线图", en: "Life Fortune K-Line" },
  "lifeCurve.subtitle": { zh: "100年运势", en: "100-Year Fortune" },
  "lifeCurve.peak": { zh: "巅峰", en: "Peak" },
  "lifeCurve.current": { zh: "当前", en: "Now" },
  "lifeCurve.valley": { zh: "低谷", en: "Valley" },
  "lifeCurve.share": { zh: "分享", en: "Share" },
  "lifeCurve.age": { zh: "岁", en: "yr" },
  "lifeCurve.score": { zh: "分", en: "pts" },
  "lifeCurve.prevYear": { zh: "上一年", en: "Prev" },
  "lifeCurve.nextYear": { zh: "下一年", en: "Next" },
  "lifeCurve.needBirthDate": { zh: "需要出生日期才能生成运势曲线", en: "Birth date required to generate fortune curve" },
  "lifeCurve.goSettings": { zh: "去设置", en: "Go to Settings" },
  "lifeCurve.disclaimer": {
    zh: "基于八字命理学推算，仅供文化探索和娱乐参考。人生掌握在自己手中。",
    en: "Based on Chinese bazi astrology. For cultural exploration and entertainment only."
  },

  // Premium
  "premium.free": { zh: "免费版", en: "Free" },
  "premium.basic": { zh: "基础版", en: "Basic" },
  "premium.pro": { zh: "专业版", en: "Pro" },
  "premium.vip": { zh: "VIP", en: "VIP" },
  "premium.credits": { zh: "积分", en: "Credits" },
  "premium.subscribe": { zh: "开通会员", en: "Subscribe" },
  "premium.upgrade": { zh: "升级", en: "Upgrade" },
  "premium.perMonth": { zh: "/月", en: "/mo" },
  "premium.unlockFull": { zh: "注册解锁完整报告", en: "Sign up to unlock full report" },
  "premium.referral": { zh: "邀请好友", en: "Invite Friends" },
  "premium.referralDesc": { zh: "分享邀请码，双方各得5积分", en: "Share your code, both get 5 credits" },

  // Dimensions
  "dim.total": { zh: "综合", en: "Overall" },
  "dim.love": { zh: "爱情", en: "Love" },
  "dim.wealth": { zh: "财富", en: "Wealth" },
  "dim.career": { zh: "事业", en: "Career" },
  "dim.study": { zh: "学习", en: "Study" },
  "dim.social": { zh: "人际", en: "Social" },

  // Fortune labels
  "fortune.daji": { zh: "大吉", en: "Excellent" },
  "fortune.ji": { zh: "吉", en: "Good" },
  "fortune.zhongji": { zh: "中吉", en: "Fair" },
  "fortune.ping": { zh: "平", en: "Average" },
  "fortune.xiong": { zh: "凶", en: "Poor" },

  // Shop
  "shop.title": { zh: "开运商城", en: "Fortune Shop" },
  "shop.recommended": { zh: "为你推荐", en: "Recommended for You" },
  "shop.basedOnElement": { zh: "基于你的五行命理", en: "Based on your elemental profile" },
  "shop.discount": { zh: "会员折扣", en: "Member Discount" },

  // Consult
  "consult.title": { zh: "真人解读", en: "Expert Reading" },
  "consult.book": { zh: "预约", en: "Book" },
  "consult.cost": { zh: "消耗积分", en: "Credits required" },

  // Common
  "common.branding": { zh: "观星 HeartAI · 你的 AI 命理伙伴", en: "HeartAI · Your AI Fortune Companion" },
  "common.login": { zh: "登录", en: "Login" },
  "common.register": { zh: "注册", en: "Sign Up" },
  "common.tryNow": { zh: "立即体验", en: "Try Now" },
};

let currentLocale: Locale = "zh";

export function setLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem("heartai-locale", locale);
  }
}

export function getLocale(): Locale {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("heartai-locale");
    if (saved === "en" || saved === "zh") return saved;
    // Auto-detect from browser
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("en")) return "en";
  }
  return currentLocale;
}

export function t(key: string): string {
  const locale = getLocale();
  return translations[key]?.[locale] ?? translations[key]?.zh ?? key;
}

export function isEnglish(): boolean {
  return getLocale() === "en";
}
