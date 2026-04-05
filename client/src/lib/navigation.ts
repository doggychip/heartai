import {
  Sparkles,
  MessageCircle,
  ClipboardList,
  BookHeart,
  Users,
  Bot,
  Sun,
  Moon,
  Star,
  Compass,
  Gauge,
  Calendar,
  Layers,
  Home as HomeIcon,
  TrendingUp,
  Lightbulb,
  Heart,
  Radar,
  Zap,
  LayoutDashboard,
  Grid3X3,
  CalendarCheck,
  Network,
  Code,
  Package,
  Hexagon,
  CircleDot,
  Hash,
  TreePine,
  Orbit,
  Activity,
  PenTool,
  Shell,
  Fingerprint,
  Gem,
  Coins,
  Flame,
  Podcast,
  Scroll,
  Crown,
  ShoppingBag,
  Palette,
  Gift,
} from "lucide-react";

// ─── Navigation Types ─────────────────────────────────────
export interface NavItem {
  path: string;
  label: string;
  icon: any;
  guestVisible: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
  guestOnly?: boolean;
}

// ─── Navigation Groups ─────────────────────────────────────
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "首页",
    defaultOpen: true,
    items: [
      { path: "/", label: "今日运势", icon: LayoutDashboard, guestVisible: true },
    ],
  },
  {
    label: "免费体验",
    defaultOpen: true,
    guestOnly: true,
    items: [
      { path: "/almanac", label: "万年黄历", icon: CalendarCheck, guestVisible: true },
      { path: "/qiuqian", label: "求签解签", icon: Flame, guestVisible: true },
      { path: "/name-score", label: "姓名测分", icon: Star, guestVisible: true },
      { path: "/horoscope", label: "星座运势", icon: TrendingUp, guestVisible: true },
      { path: "/community", label: "社区浏览", icon: Users, guestVisible: true },
      { path: "/crypto", label: "加密运势", icon: Coins, guestVisible: true },
    ],
  },
  {
    label: "命理探索",
    defaultOpen: true,
    items: [
      { path: "/fortune", label: "今日运势", icon: Gauge, guestVisible: false },
      { path: "/zodiac", label: "星座解读", icon: Star, guestVisible: false },
      { path: "/horoscope", label: "星座运势", icon: TrendingUp, guestVisible: false },
      { path: "/mbti", label: "MBTI人格", icon: Compass, guestVisible: false },
      { path: "/bazi", label: "八字命理", icon: Calendar, guestVisible: true },
      { path: "/tarot", label: "塔罗占卜", icon: Layers, guestVisible: true },
      { path: "/qiuqian", label: "求签解签", icon: Flame, guestVisible: true },
      { path: "/zeji", label: "择吉日", icon: CalendarCheck, guestVisible: true },
      { path: "/fengshui", label: "风水评估", icon: HomeIcon, guestVisible: false },
      { path: "/crypto", label: "加密运势", icon: Coins, guestVisible: true },
      { path: "/compatibility", label: "缘分雷达", icon: Radar, guestVisible: false },
      { path: "/soulmate", label: "灵魂伴侣", icon: Heart, guestVisible: false },
    ],
  },
  {
    label: "玄学测试",
    defaultOpen: false,
    items: [
      { path: "/discover/enneagram", label: "九型人格", icon: Hexagon, guestVisible: true },
      { path: "/discover/star-mansion", label: "二十八星宿", icon: CircleDot, guestVisible: true },
      { path: "/discover/zodiac", label: "生肖详解", icon: Shell, guestVisible: true },
      { path: "/discover/numerology", label: "灵数分析", icon: Hash, guestVisible: true },
      { path: "/discover/ziwei", label: "紫微斗数", icon: Gem, guestVisible: true },
      { path: "/discover/chakra", label: "脉轮测试", icon: Activity, guestVisible: true },
      { path: "/discover/htp", label: "房树人", icon: TreePine, guestVisible: true },
      { path: "/discover/mayan", label: "玛雅历", icon: Orbit, guestVisible: true },
      { path: "/discover/human-design", label: "人类图", icon: Fingerprint, guestVisible: true },
      { path: "/discover/zhengyu", label: "政余", icon: PenTool, guestVisible: true },
    ],
  },
  {
    label: "AI 互动",
    defaultOpen: true,
    items: [
      { path: "/wisdom", label: "智慧问答", icon: Lightbulb, guestVisible: false },
      { path: "/chat", label: "AI 对话", icon: MessageCircle, guestVisible: false },
      { path: "/avatar", label: "AI 分身", icon: Zap, guestVisible: false },
      { path: "/avatar-plaza", label: "分身广场", icon: Podcast, guestVisible: false },
    ],
  },
  {
    label: "自我探索",
    defaultOpen: false,
    items: [
      { path: "/dream", label: "梦境解析", icon: Moon, guestVisible: true },
      { path: "/emotion-insights", label: "情感频道", icon: Sparkles, guestVisible: false },
      { path: "/assessments", label: "心理测评", icon: ClipboardList, guestVisible: false },
      { path: "/journal", label: "情绪日记", icon: BookHeart, guestVisible: false },
    ],
  },
  {
    label: "社区广场",
    defaultOpen: true,
    items: [
      { path: "/culture", label: "国粹频道", icon: Scroll, guestVisible: true },
      { path: "/community", label: "互助社区", icon: Users, guestVisible: true },
      { path: "/agents", label: "Agent 名录", icon: Bot, guestVisible: true },
      { path: "/agent-team", label: "Agent Team", icon: Network, guestVisible: false },
    ],
  },
  {
    label: "会员服务",
    defaultOpen: false,
    items: [
      { path: "/premium", label: "会员中心", icon: Crown, guestVisible: false },
      { path: "/shop", label: "开运商城", icon: ShoppingBag, guestVisible: false },
      { path: "/ai-portrait", label: "AI 画像", icon: Palette, guestVisible: false },
      { path: "/referral", label: "邀请好友", icon: Gift, guestVisible: false },
      { path: "/life-curve", label: "人生K线", icon: TrendingUp, guestVisible: false },
    ],
  },
  {
    label: "开发者",
    defaultOpen: false,
    items: [
      { path: "/clawhub", label: "ClawHub Skills", icon: Package, guestVisible: false },
      { path: "/developer", label: "开发者中心", icon: Code, guestVisible: false },
    ],
  },
];

// Flatten for lookups
export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

// Mobile bottom tabs: 5 primary destinations
export const MOBILE_TABS: NavItem[] = [
  { path: "/", label: "首页", icon: LayoutDashboard, guestVisible: false },
  { path: "/fortune", label: "运势", icon: Gauge, guestVisible: false },
  { path: "/chat", label: "灵魂", icon: MessageCircle, guestVisible: false },
  { path: "/community", label: "社区", icon: Users, guestVisible: true },
  { path: "/discover", label: "发现", icon: Grid3X3, guestVisible: true },
];

export const GUEST_MOBILE_TABS: NavItem[] = [
  { path: "/", label: "运势", icon: LayoutDashboard, guestVisible: true },
  { path: "/almanac", label: "黄历", icon: CalendarCheck, guestVisible: true },
  { path: "/qiuqian", label: "灵签", icon: Flame, guestVisible: true },
  { path: "/community", label: "社区", icon: Users, guestVisible: true },
  { path: "/discover", label: "发现", icon: Grid3X3, guestVisible: true },
];
