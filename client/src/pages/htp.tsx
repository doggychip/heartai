import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Sparkles, Check } from "lucide-react";
import { Link } from "wouter";

// ─── HTP Selection Data ─────────────────────────────────────

interface HtpOption {
  id: string;
  label: string;
  description: string;
  shape: React.ReactNode;
}

interface HtpCategory {
  id: string;
  label: string;
  options: HtpOption[];
}

interface HtpTab {
  id: string;
  label: string;
  emoji: string;
  categories: HtpCategory[];
}

const HTP_TABS: HtpTab[] = [
  {
    id: "house", label: "房", emoji: "🏠",
    categories: [
      {
        id: "roof", label: "屋顶",
        options: [
          { id: "roof_triangle", label: "三角形尖顶", description: "传统尖顶屋顶", shape: <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-b-[16px] border-l-transparent border-r-transparent border-b-current" /> },
          { id: "roof_flat", label: "平顶", description: "现代简约平顶", shape: <div className="w-10 h-2 bg-current rounded-t" /> },
          { id: "roof_curved", label: "圆弧形", description: "柔和的弧形屋顶", shape: <div className="w-10 h-5 bg-current rounded-t-full" /> },
          { id: "roof_big", label: "超大屋顶", description: "屋顶比墙壁大很多", shape: <div className="w-12 h-4 bg-current rounded-t-lg -mx-1" /> },
        ],
      },
      {
        id: "wall", label: "墙壁",
        options: [
          { id: "wall_solid", label: "实心墙壁", description: "完整、厚实的墙壁", shape: <div className="w-10 h-8 bg-current rounded-sm" /> },
          { id: "wall_thin", label: "薄墙壁", description: "线条细的墙壁", shape: <div className="w-10 h-8 border-2 border-current rounded-sm" /> },
          { id: "wall_brick", label: "砖块墙", description: "有纹理的砖墙", shape: <div className="w-10 h-8 border-2 border-current rounded-sm grid grid-cols-3 gap-px p-px">{[...Array(6)].map((_, i) => <div key={i} className="bg-current/30 rounded-[1px]" />)}</div> },
          { id: "wall_transparent", label: "透明/玻璃", description: "可以看到内部", shape: <div className="w-10 h-8 border-2 border-current/40 rounded-sm bg-current/10" /> },
        ],
      },
      {
        id: "door", label: "门",
        options: [
          { id: "door_normal", label: "普通门", description: "标准大小的门", shape: <div className="w-4 h-7 bg-current rounded-t" /> },
          { id: "door_big", label: "大门", description: "宽大的门", shape: <div className="w-7 h-8 bg-current rounded-t" /> },
          { id: "door_small", label: "小门", description: "很小的门", shape: <div className="w-3 h-4 bg-current rounded-t" /> },
          { id: "door_none", label: "没有门", description: "墙上没有门", shape: <div className="w-10 h-6 bg-current/20 rounded flex items-center justify-center text-[8px] opacity-50">无</div> },
        ],
      },
      {
        id: "window", label: "窗户",
        options: [
          { id: "window_normal", label: "方窗", description: "标准方形窗户", shape: <div className="w-5 h-5 border-2 border-current rounded-sm grid grid-cols-2 grid-rows-2 gap-px">{[...Array(4)].map((_, i) => <div key={i} className="bg-current/20" />)}</div> },
          { id: "window_curtain", label: "有窗帘", description: "带着装饰窗帘", shape: <div className="w-6 h-5 border-2 border-current rounded-sm overflow-hidden"><div className="w-full h-1 bg-current/40" /><div className="flex"><div className="w-1/2 h-3 bg-current/20" /><div className="w-1/2 h-3 bg-current/20" /></div></div> },
          { id: "window_many", label: "很多窗", description: "墙上有很多窗户", shape: <div className="flex gap-1">{[...Array(3)].map((_, i) => <div key={i} className="w-3 h-3 border border-current rounded-[1px]" />)}</div> },
          { id: "window_none", label: "没有窗", description: "墙上没有窗户", shape: <div className="w-10 h-6 bg-current/20 rounded flex items-center justify-center text-[8px] opacity-50">无</div> },
        ],
      },
      {
        id: "path", label: "台阶和路",
        options: [
          { id: "path_straight", label: "直路", description: "直通门口的路", shape: <div className="w-4 h-8 bg-current/40 rounded-b" /> },
          { id: "path_curved", label: "弯曲小路", description: "蜿蜒到门口", shape: <div className="w-8 h-6 flex items-end"><div className="w-3 h-6 bg-current/40 rounded-full" /></div> },
          { id: "path_steps", label: "台阶", description: "阶梯状", shape: <div className="flex flex-col items-center gap-[1px]"><div className="w-4 h-1 bg-current/40" /><div className="w-5 h-1 bg-current/40" /><div className="w-6 h-1 bg-current/40" /></div> },
          { id: "path_none", label: "没有路", description: "没有通往门的路", shape: <div className="w-10 h-6 bg-current/20 rounded flex items-center justify-center text-[8px] opacity-50">无</div> },
        ],
      },
      {
        id: "chimney", label: "烟囱",
        options: [
          { id: "chimney_smoke", label: "有烟", description: "烟囱冒着烟", shape: <div className="flex flex-col items-center"><div className="text-xs opacity-50">~</div><div className="w-3 h-4 bg-current rounded-t" /></div> },
          { id: "chimney_plain", label: "无烟", description: "烟囱没有烟", shape: <div className="w-3 h-4 bg-current rounded-t" /> },
          { id: "chimney_none", label: "没有烟囱", description: "房子没有烟囱", shape: <div className="w-10 h-6 bg-current/20 rounded flex items-center justify-center text-[8px] opacity-50">无</div> },
        ],
      },
    ],
  },
  {
    id: "tree", label: "树", emoji: "🌳",
    categories: [
      {
        id: "crown", label: "树冠",
        options: [
          { id: "crown_round", label: "圆形树冠", description: "茂密的圆形", shape: <div className="w-10 h-8 bg-current rounded-full" /> },
          { id: "crown_wide", label: "宽大树冠", description: "横向展开", shape: <div className="w-12 h-6 bg-current rounded-full" /> },
          { id: "crown_sparse", label: "稀疏树冠", description: "枝叶不多", shape: <div className="w-8 h-6 bg-current/40 rounded-full" /> },
          { id: "crown_detailed", label: "枝叶分明", description: "细节丰富", shape: <div className="flex gap-[2px]"><div className="w-3 h-5 bg-current rounded-full" /><div className="w-4 h-7 bg-current rounded-full" /><div className="w-3 h-5 bg-current rounded-full" /></div> },
        ],
      },
      {
        id: "trunk", label: "树干",
        options: [
          { id: "trunk_normal", label: "普通树干", description: "标准粗细", shape: <div className="w-3 h-8 bg-current rounded" /> },
          { id: "trunk_thick", label: "粗壮树干", description: "又粗又稳", shape: <div className="w-5 h-8 bg-current rounded" /> },
          { id: "trunk_thin", label: "细长树干", description: "纤细的树干", shape: <div className="w-1.5 h-8 bg-current rounded" /> },
          { id: "trunk_knotty", label: "有树节", description: "有疤痕纹理", shape: <div className="w-3 h-8 bg-current rounded relative"><div className="absolute top-2 -left-1 w-2 h-1.5 bg-current rounded-full" /></div> },
        ],
      },
      {
        id: "roots", label: "树根",
        options: [
          { id: "roots_visible", label: "可见树根", description: "根部露出地面", shape: <div className="flex"><div className="w-2 h-3 bg-current/60 rounded-b -rotate-12" /><div className="w-2 h-3 bg-current/60 rounded-b rotate-12" /></div> },
          { id: "roots_hidden", label: "隐藏树根", description: "根在地下", shape: <div className="w-8 h-1 bg-current/30 rounded" /> },
          { id: "roots_big", label: "发达根系", description: "粗壮外露的根", shape: <div className="flex gap-[1px]"><div className="w-2 h-4 bg-current/60 rounded-b -rotate-[20deg]" /><div className="w-2 h-3 bg-current/60 rounded-b -rotate-6" /><div className="w-2 h-3 bg-current/60 rounded-b rotate-6" /><div className="w-2 h-4 bg-current/60 rounded-b rotate-[20deg]" /></div> },
          { id: "roots_none", label: "没有根", description: "看不到根部", shape: <div className="w-10 h-4 bg-current/20 rounded flex items-center justify-center text-[8px] opacity-50">无</div> },
        ],
      },
      {
        id: "fruit", label: "果实",
        options: [
          { id: "fruit_many", label: "很多果实", description: "硕果累累", shape: <div className="flex gap-1"><div className="w-2.5 h-2.5 bg-current rounded-full" /><div className="w-2.5 h-2.5 bg-current rounded-full" /><div className="w-2.5 h-2.5 bg-current rounded-full" /></div> },
          { id: "fruit_few", label: "少量果实", description: "一两个果子", shape: <div className="w-2.5 h-2.5 bg-current rounded-full" /> },
          { id: "fruit_flowers", label: "开花", description: "树上有花", shape: <div className="flex gap-1"><div className="w-2.5 h-2.5 bg-current rounded-full opacity-60" /><div className="w-3 h-3 bg-current rounded-full opacity-40" /></div> },
          { id: "fruit_none", label: "没有果实", description: "只有树叶", shape: <div className="w-10 h-4 bg-current/20 rounded flex items-center justify-center text-[8px] opacity-50">无</div> },
        ],
      },
    ],
  },
  {
    id: "person", label: "人", emoji: "🧑",
    categories: [
      {
        id: "head", label: "头部",
        options: [
          { id: "head_normal", label: "正常头部", description: "比例协调", shape: <div className="w-5 h-5 bg-current rounded-full" /> },
          { id: "head_big", label: "大头", description: "头部比例偏大", shape: <div className="w-7 h-7 bg-current rounded-full" /> },
          { id: "head_small", label: "小头", description: "头部比例偏小", shape: <div className="w-3 h-3 bg-current rounded-full" /> },
          { id: "head_detailed", label: "五官清晰", description: "画出了眼睛嘴巴", shape: <div className="w-6 h-6 bg-current rounded-full flex items-center justify-center"><div className="flex gap-[2px] mt-[-1px]"><div className="w-1 h-1 bg-background rounded-full" /><div className="w-1 h-1 bg-background rounded-full" /></div></div> },
        ],
      },
      {
        id: "body", label: "身体",
        options: [
          { id: "body_normal", label: "正常身体", description: "比例标准", shape: <div className="w-4 h-6 bg-current rounded" /> },
          { id: "body_big", label: "魁梧身体", description: "宽大的身躯", shape: <div className="w-6 h-7 bg-current rounded" /> },
          { id: "body_thin", label: "纤细身体", description: "瘦长的体型", shape: <div className="w-2 h-7 bg-current rounded" /> },
          { id: "body_stick", label: "火柴人", description: "用线条表示", shape: <div className="w-px h-6 bg-current mx-auto" /> },
        ],
      },
      {
        id: "hands", label: "手",
        options: [
          { id: "hands_open", label: "张开的手", description: "手臂张开", shape: <div className="flex items-center"><div className="w-4 h-px bg-current" /><div className="w-1 h-3 bg-current rounded" /><div className="w-4 h-px bg-current" /></div> },
          { id: "hands_down", label: "垂下的手", description: "双手自然下垂", shape: <div className="flex gap-3"><div className="w-px h-4 bg-current" /><div className="w-px h-4 bg-current" /></div> },
          { id: "hands_hidden", label: "藏起的手", description: "手放在背后/口袋", shape: <div className="w-4 h-5 bg-current/30 rounded flex items-center justify-center text-[8px] opacity-50">?</div> },
          { id: "hands_none", label: "没画手", description: "没有手的描绘", shape: <div className="w-10 h-4 bg-current/20 rounded flex items-center justify-center text-[8px] opacity-50">无</div> },
        ],
      },
      {
        id: "feet", label: "脚",
        options: [
          { id: "feet_normal", label: "正常的脚", description: "比例协调", shape: <div className="flex gap-2"><div className="w-3 h-1.5 bg-current rounded" /><div className="w-3 h-1.5 bg-current rounded" /></div> },
          { id: "feet_big", label: "大脚", description: "脚比较大", shape: <div className="flex gap-2"><div className="w-4 h-2 bg-current rounded" /><div className="w-4 h-2 bg-current rounded" /></div> },
          { id: "feet_grounded", label: "稳稳站立", description: "脚踏实地", shape: <div className="flex flex-col items-center"><div className="flex gap-2"><div className="w-3 h-1.5 bg-current rounded" /><div className="w-3 h-1.5 bg-current rounded" /></div><div className="w-10 h-px bg-current/40 mt-px" /></div> },
          { id: "feet_none", label: "没画脚", description: "没有脚的描绘", shape: <div className="w-10 h-4 bg-current/20 rounded flex items-center justify-center text-[8px] opacity-50">无</div> },
        ],
      },
    ],
  },
  {
    id: "extras", label: "附加物", emoji: "🌤️",
    categories: [
      {
        id: "sun", label: "太阳",
        options: [
          { id: "sun_full", label: "完整太阳", description: "圆形带光芒", shape: <div className="w-6 h-6 bg-current rounded-full" /> },
          { id: "sun_half", label: "半个太阳", description: "在角落露出一半", shape: <div className="w-6 h-3 bg-current rounded-t-full" /> },
          { id: "sun_none", label: "没有太阳", description: "天空中没有太阳", shape: <div className="w-10 h-4 bg-current/20 rounded flex items-center justify-center text-[8px] opacity-50">无</div> },
        ],
      },
      {
        id: "clouds", label: "云",
        options: [
          { id: "clouds_fluffy", label: "蓬松白云", description: "柔软的云朵", shape: <div className="flex"><div className="w-4 h-3 bg-current/40 rounded-full" /><div className="w-3 h-2 bg-current/40 rounded-full -ml-1 mt-1" /></div> },
          { id: "clouds_dark", label: "乌云", description: "深色阴沉的云", shape: <div className="w-8 h-3 bg-current rounded-full" /> },
          { id: "clouds_none", label: "没有云", description: "晴朗天空", shape: <div className="w-10 h-4 bg-current/20 rounded flex items-center justify-center text-[8px] opacity-50">无</div> },
        ],
      },
      {
        id: "nature", label: "花草",
        options: [
          { id: "nature_flowers", label: "鲜花", description: "地上有花朵", shape: <div className="flex gap-1 items-end"><div className="flex flex-col items-center"><div className="w-2 h-2 bg-current rounded-full opacity-60" /><div className="w-px h-2 bg-current" /></div><div className="flex flex-col items-center"><div className="w-2 h-2 bg-current rounded-full opacity-60" /><div className="w-px h-3 bg-current" /></div></div> },
          { id: "nature_grass", label: "草地", description: "有绿草", shape: <div className="flex gap-[2px] items-end"><div className="w-px h-2 bg-current" /><div className="w-px h-3 bg-current" /><div className="w-px h-2 bg-current" /><div className="w-px h-3 bg-current" /><div className="w-px h-2 bg-current" /></div> },
          { id: "nature_none", label: "没有花草", description: "光秃秃的地面", shape: <div className="w-10 h-4 bg-current/20 rounded flex items-center justify-center text-[8px] opacity-50">无</div> },
        ],
      },
      {
        id: "animal", label: "动物",
        options: [
          { id: "animal_bird", label: "鸟", description: "天上飞的鸟", shape: <div className="text-xs">∨ ∨</div> },
          { id: "animal_pet", label: "宠物", description: "猫或狗等", shape: <div className="flex flex-col items-center"><div className="w-3 h-2 bg-current rounded-full" /><div className="w-4 h-3 bg-current rounded" /></div> },
          { id: "animal_none", label: "没有动物", description: "画面中没有动物", shape: <div className="w-10 h-4 bg-current/20 rounded flex items-center justify-center text-[8px] opacity-50">无</div> },
        ],
      },
    ],
  },
];

export default function HtpPage() {
  const [stage, setStage] = useState<"landing" | "selection" | "result">("landing");
  const [activeTab, setActiveTab] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async (data: { selections: Record<string, string> }) => {
      const res = await apiRequest("POST", "/api/metaphysics/htp", data);
      return res.json();
    },
    onSuccess: (data) => setResult(data.result),
  });

  function handleSelect(categoryId: string, optionId: string) {
    setSelections((prev) => ({ ...prev, [categoryId]: optionId }));
  }

  function getTotalSelected() {
    return Object.keys(selections).length;
  }

  function getTotalCategories() {
    return HTP_TABS.reduce((sum, tab) => sum + tab.categories.length, 0);
  }

  // ─── Landing ──────────────────────────────────────────────
  if (stage === "landing") {
    return (
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/discover">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-lg font-bold">房树人测试</h1>
        </div>

        <div className="text-center space-y-4 py-4">
          <div className="mx-auto flex items-end justify-center gap-4 py-4">
            <div className="flex flex-col items-center">
              <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-b-[12px] border-l-transparent border-r-transparent border-b-amber-600/60" />
              <div className="w-8 h-10 bg-amber-700/40 rounded-b-sm" />
              <span className="text-xs text-muted-foreground mt-1">房</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-8 bg-green-600/40 rounded-full" />
              <div className="w-2 h-6 bg-amber-800/40 rounded" />
              <span className="text-xs text-muted-foreground mt-1">树</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 bg-blue-400/40 rounded-full" />
              <div className="w-3 h-6 bg-blue-400/30 rounded" />
              <div className="flex gap-1">
                <div className="w-1.5 h-3 bg-blue-400/30 rounded" />
                <div className="w-1.5 h-3 bg-blue-400/30 rounded" />
              </div>
              <span className="text-xs text-muted-foreground mt-1">人</span>
            </div>
          </div>

          <h2 className="text-xl font-bold">房树人心理测试</h2>
          <p className="text-sm text-muted-foreground px-4">
            房树人测试(HTP)是经典的投射性心理测验。通过你选择画出的房子、树和人的特征，揭示你内心深处的性格、情感和潜意识状态。
          </p>
        </div>

        <Button className="w-full" onClick={() => setStage("selection")}>
          开始选择
        </Button>
      </div>
    );
  }

  // ─── Selection ─────────────────────────────────────────────
  if (stage === "selection") {
    const tab = HTP_TABS[activeTab];

    return (
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => activeTab > 0 ? setActiveTab(activeTab - 1) : setStage("landing")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-bold">房树人测试</h1>
          <span className="text-xs text-muted-foreground ml-auto">
            {getTotalSelected()}/{getTotalCategories()} 已选
          </span>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2">
          {HTP_TABS.map((t, i) => {
            const tabSelected = t.categories.filter((c) => selections[c.id]).length;
            const isActive = i === activeTab;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(i)}
                className={`flex-1 py-2.5 rounded-xl text-center transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-card/50 border border-border/50 hover:bg-accent/30"
                }`}
              >
                <div className="text-lg">{t.emoji}</div>
                <div className="text-xs font-medium">{t.label}</div>
                {tabSelected > 0 && (
                  <div className="text-[10px] opacity-70">{tabSelected}/{t.categories.length}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Categories & options */}
        <div className="space-y-4">
          {tab.categories.map((category) => (
            <Card key={category.id} className="bg-card/50 border-border/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{category.label}</h3>
                {selections[category.id] && (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {category.options.map((option) => {
                  const isSelected = selections[category.id] === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(category.id, option.id)}
                      className={`p-3 rounded-xl border text-center transition-all space-y-2 ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border/50 bg-background/50 hover:bg-accent/30"
                      }`}
                    >
                      <div className="flex justify-center items-center h-8 text-muted-foreground">
                        {option.shape}
                      </div>
                      <div className="text-xs font-medium">{option.label}</div>
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {activeTab < HTP_TABS.length - 1 ? (
            <Button className="w-full" onClick={() => setActiveTab(activeTab + 1)}>
              下一步: {HTP_TABS[activeTab + 1].emoji} {HTP_TABS[activeTab + 1].label}
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={getTotalSelected() < 5 || mutation.isPending}
              onClick={() => mutation.mutate({ selections })}
            >
              {mutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />正在分析...</>
              ) : (
                `提交分析 (${getTotalSelected()}/${getTotalCategories()} 项)`
              )}
            </Button>
          )}
        </div>
        {mutation.isError && (
          <p className="text-sm text-red-400 text-center">{(mutation.error as Error).message}</p>
        )}
      </div>
    );
  }

  // ─── Result ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/discover">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-lg font-bold">房树人 · 结果</h1>
      </div>

      {/* Header */}
      <Card className="bg-gradient-to-br from-green-500/15 to-amber-500/15 border-0 p-6 text-center space-y-3">
        <div className="text-4xl">🏠🌳🧑</div>
        <h2 className="text-xl font-bold">你的房树人心理画像</h2>
      </Card>

      {/* Selection Summary */}
      <Card className="bg-card/50 border-border/50 p-4 space-y-3">
        <h3 className="font-semibold">你的选择</h3>
        <div className="grid grid-cols-2 gap-2">
          {HTP_TABS.map((tab) => (
            <div key={tab.id} className="space-y-1">
              <span className="text-xs font-semibold">{tab.emoji} {tab.label}</span>
              {tab.categories.map((cat) => {
                const selected = cat.options.find((o) => o.id === selections[cat.id]);
                return selected ? (
                  <div key={cat.id} className="text-[10px] text-muted-foreground">
                    {cat.label}: {selected.label}
                  </div>
                ) : null;
              })}
            </div>
          ))}
        </div>
      </Card>

      {/* AI Analysis */}
      {result && (
        <>
          {result.personality && (
            <Card className="bg-card/50 border-border/50 p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" /> 性格特质
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.personality}</p>
              {result.traits && (
                <div className="flex flex-wrap gap-1">
                  {result.traits.map((t: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              )}
            </Card>
          )}

          {result.emotional && (
            <Card className="bg-card/50 border-border/50 p-4 space-y-3">
              <h3 className="font-semibold">情感状态</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.emotional}</p>
            </Card>
          )}

          {result.relationships && (
            <Card className="bg-card/50 border-border/50 p-4 space-y-3">
              <h3 className="font-semibold">人际关系</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.relationships}</p>
            </Card>
          )}

          {result.innerWorld && (
            <Card className="bg-card/50 border-border/50 p-4 space-y-3">
              <h3 className="font-semibold">内心世界</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.innerWorld}</p>
            </Card>
          )}

          {result.suggestion && (
            <Card className="bg-card/50 border-border/50 p-4 space-y-3">
              <div className="bg-accent/30 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">💡 建议</p>
                <p className="text-sm">{result.suggestion}</p>
              </div>
            </Card>
          )}
        </>
      )}

      <p className="text-xs text-center text-muted-foreground">
        仅供娱乐参考，不代替专业心理评估
      </p>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setStage("landing");
          setSelections({});
          setResult(null);
        }}
      >
        重新测试
      </Button>
    </div>
  );
}
