import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";

// ─── Type Definitions ────────────────────────────────────────

interface TypeInfo {
  name: string;
  title: string;
  color: string;
  emoji: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  growth: string;
  stress: string;
  compatible: number[];
}

const TYPE_INFO: Record<number, TypeInfo> = {
  1: {
    name: "完美型", title: "改革者", color: "from-slate-500/20 to-blue-500/20", emoji: "⚖️",
    description: "你是一个有原则、有目标的人。你内心有一把清晰的标尺，知道什么是对的、什么是错的。你追求卓越，做事认真负责，希望一切都能达到最高标准。你的正义感和使命感驱动着你不断改善自己和周围的世界。",
    strengths: ["正直", "自律", "负责", "追求完美"],
    weaknesses: ["过于苛刻", "容易焦虑", "难以放松"],
    growth: "向7号活跃型方向成长，学会放松和享受",
    stress: "压力下可能像4号自我型，变得情绪化",
    compatible: [2, 7, 9],
  },
  2: {
    name: "助人型", title: "给予者", color: "from-rose-500/20 to-pink-500/20", emoji: "💝",
    description: "你天生温暖、体贴、善解人意。你能敏锐地感知他人的需求，并乐于伸出援手。你的爱是无条件的付出，在帮助他人的过程中获得满足感和存在感。你善于建立亲密关系，是朋友和家人的温暖港湾。",
    strengths: ["温暖", "善解人意", "慷慨", "有同理心"],
    weaknesses: ["忽视自我需求", "讨好型人格", "过度付出"],
    growth: "向4号自我型方向成长，学会关注自己的感受",
    stress: "压力下可能像8号领袖型，变得控制欲强",
    compatible: [1, 4, 8],
  },
  3: {
    name: "成就型", title: "实干家", color: "from-amber-500/20 to-yellow-500/20", emoji: "🏆",
    description: "你充满活力、自信、高效。你天生就是赢家，总能在竞争中脱颖而出。你善于设定目标并全力以赴地实现它们。你注重形象和成就，希望成为他人眼中成功的榜样。你的适应力和执行力令人钦佩。",
    strengths: ["高效", "自信", "适应力强", "有魅力"],
    weaknesses: ["过于在意形象", "忽略情感", "工作狂"],
    growth: "向6号疑惑型方向成长，学会信任和忠诚",
    stress: "压力下可能像9号和平型，变得懒散消极",
    compatible: [6, 7, 9],
  },
  4: {
    name: "自我型", title: "浪漫主义者", color: "from-purple-500/20 to-violet-500/20", emoji: "🎭",
    description: "你是一个富有创造力和深度情感的人。你对美和意义有着独特的感悟，总能在平凡中发现不平凡。你渴望被理解，追求真实的自我表达。你的敏感和直觉让你在艺术和人际关系中展现出独特的魅力。",
    strengths: ["有创造力", "富有激情", "直觉敏锐", "有深度"],
    weaknesses: ["情绪波动大", "过于自我关注", "容易忧郁"],
    growth: "向1号完美型方向成长，学会自律和客观",
    stress: "压力下可能像2号助人型，变得讨好他人",
    compatible: [1, 2, 5],
  },
  5: {
    name: "思想型", title: "调查者", color: "from-cyan-500/20 to-teal-500/20", emoji: "🔬",
    description: "你是一个求知欲极强的思考者。你喜欢深入研究事物的本质，用知识和理性来理解世界。你独立、冷静，享受独处时光。你的洞察力和分析能力是你最大的财富，能够看到别人忽略的细节和规律。",
    strengths: ["博学", "洞察力强", "客观理性", "独立"],
    weaknesses: ["过于封闭", "社交困难", "缺乏行动力"],
    growth: "向8号领袖型方向成长，学会果断和行动",
    stress: "压力下可能像7号活跃型，变得分散注意力",
    compatible: [1, 4, 8],
  },
  6: {
    name: "疑惑型", title: "忠诚者", color: "from-blue-500/20 to-indigo-500/20", emoji: "🛡️",
    description: "你是一个忠诚、可靠、有责任心的人。你善于预见风险和问题，总是为最坏的情况做好准备。你重视安全感和归属感，对朋友和团队忠心耿耿。你的谨慎和周全是团队不可或缺的稳定力量。",
    strengths: ["忠诚", "可靠", "有责任心", "善于规划"],
    weaknesses: ["过度焦虑", "缺乏自信", "优柔寡断"],
    growth: "向9号和平型方向成长，学会信任和放松",
    stress: "压力下可能像3号成就型，变得争强好胜",
    compatible: [3, 8, 9],
  },
  7: {
    name: "活跃型", title: "热情者", color: "from-orange-500/20 to-red-500/20", emoji: "🎉",
    description: "你是一个乐观、充满活力的冒险家。你热爱生活，追求新鲜感和刺激。你思维敏捷，点子丰富，总能给身边的人带来欢乐和灵感。你渴望自由，讨厌被束缚，喜欢不断尝试新事物。",
    strengths: ["乐观", "有创意", "精力充沛", "多才多艺"],
    weaknesses: ["缺乏持久力", "逃避痛苦", "过于分散"],
    growth: "向5号思想型方向成长，学会专注和深入",
    stress: "压力下可能像1号完美型，变得挑剔苛刻",
    compatible: [1, 3, 5],
  },
  8: {
    name: "领袖型", title: "挑战者", color: "from-red-500/20 to-rose-500/20", emoji: "👑",
    description: "你是一个强大、自信、有魄力的领导者。你天生具有掌控局面的能力，不惧挑战，勇于担当。你直率、果断，说到做到。你用你的力量保护身边的人，是值得信赖的靠山。",
    strengths: ["果断", "有魄力", "保护他人", "直率"],
    weaknesses: ["控制欲强", "过于强势", "不善示弱"],
    growth: "向2号助人型方向成长，学会柔软和关怀",
    stress: "压力下可能像5号思想型，变得退缩封闭",
    compatible: [2, 5, 6],
  },
  9: {
    name: "和平型", title: "调停者", color: "from-emerald-500/20 to-green-500/20", emoji: "🕊️",
    description: "你是一个平和、随和、包容的人。你天生具有调和矛盾的能力，能理解不同人的立场和感受。你追求内心的平静和外在的和谐，不喜欢冲突和紧张。你的温和与稳定让身边的人感到舒适和安心。",
    strengths: ["包容", "善解人意", "稳定", "有耐心"],
    weaknesses: ["回避冲突", "缺乏主见", "容易拖延"],
    growth: "向3号成就型方向成长，学会设定目标和行动",
    stress: "压力下可能像6号疑惑型，变得焦虑多疑",
    compatible: [1, 3, 6],
  },
};

// 36 questions, 4 per type
const QUESTIONS: { text: string; type: number }[] = [
  // Type 1 - 完美型
  { text: "我经常觉得事情应该有一个正确的做法", type: 1 },
  { text: "看到别人不守规矩时我会感到不舒服", type: 1 },
  { text: "我对自己的要求很高，总觉得还可以更好", type: 1 },
  { text: "我很难容忍工作中的粗心和敷衍", type: 1 },
  // Type 2 - 助人型
  { text: "我总能感觉到别人的需求并主动帮忙", type: 2 },
  { text: "在人际关系中，我更多是付出的那一方", type: 2 },
  { text: "被人需要让我感到很有价值", type: 2 },
  { text: "我经常把别人的需求放在自己之前", type: 2 },
  // Type 3 - 成就型
  { text: "我非常在意自己在别人眼中的形象", type: 3 },
  { text: "我做事讲求效率，不喜欢浪费时间", type: 3 },
  { text: "取得成就和获得认可对我非常重要", type: 3 },
  { text: "我总是在心中设定目标并努力实现", type: 3 },
  // Type 4 - 自我型
  { text: "我觉得自己和大多数人都不一样", type: 4 },
  { text: "我很容易被深层的情感和美的事物触动", type: 4 },
  { text: "我经常渴望被真正理解和看见", type: 4 },
  { text: "我有时候会沉浸在忧伤或怀旧的情绪中", type: 4 },
  // Type 5 - 思想型
  { text: "我需要大量独处的时间来思考和充电", type: 5 },
  { text: "我喜欢深入研究一个主题直到完全理解", type: 5 },
  { text: "在做决定前我需要收集足够的信息", type: 5 },
  { text: "我更喜欢观察而不是参与社交活动", type: 5 },
  // Type 6 - 疑惑型
  { text: "我经常会想到事情可能出错的各种情况", type: 6 },
  { text: "安全感和稳定性对我来说非常重要", type: 6 },
  { text: "我在做重要决定时会犹豫不决", type: 6 },
  { text: "我对权威既尊重又质疑", type: 6 },
  // Type 7 - 活跃型
  { text: "我总是对新事物和新体验充满兴趣", type: 7 },
  { text: "我不喜欢被束缚和限制", type: 7 },
  { text: "我善于从困难中看到积极的一面", type: 7 },
  { text: "我经常同时进行好几件事情", type: 7 },
  // Type 8 - 领袖型
  { text: "我天生就有掌控局面的倾向", type: 8 },
  { text: "我不怕与人对抗和表达不满", type: 8 },
  { text: "我讨厌被别人控制或操纵", type: 8 },
  { text: "看到弱者被欺负时我会挺身而出", type: 8 },
  // Type 9 - 和平型
  { text: "我更喜欢和平相处而不是争论", type: 9 },
  { text: "我常常顺从别人的意见以避免冲突", type: 9 },
  { text: "我觉得每个人的观点都有道理", type: 9 },
  { text: "有时候我会为了维持和平而忽略自己的想法", type: 9 },
];

const LIKERT_OPTIONS = [
  { value: 1, label: "完全不符合" },
  { value: 2, label: "不太符合" },
  { value: 3, label: "一般" },
  { value: 4, label: "比较符合" },
  { value: 5, label: "完全符合" },
];

export default function EnneagramPage() {
  const [stage, setStage] = useState<"landing" | "quiz" | "result">("landing");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(36).fill(0));
  const [scores, setScores] = useState<Record<number, number>>({});
  const [dominantType, setDominantType] = useState(1);
  const [wingType, setWingType] = useState(2);

  const saveMutation = useMutation({
    mutationFn: async (data: { scores: Record<number, number>; dominantType: number; wingType: number }) => {
      const res = await apiRequest("POST", "/api/metaphysics/enneagram", data);
      return res.json();
    },
  });

  function calculateResults() {
    const typeScores: Record<number, number> = {};
    for (let t = 1; t <= 9; t++) typeScores[t] = 0;

    QUESTIONS.forEach((q, i) => {
      typeScores[q.type] += answers[i];
    });

    setScores(typeScores);

    // Find dominant
    let maxScore = 0;
    let maxType = 1;
    for (let t = 1; t <= 9; t++) {
      if (typeScores[t] > maxScore) {
        maxScore = typeScores[t];
        maxType = t;
      }
    }
    setDominantType(maxType);

    // Wing type: adjacent type with higher score
    const left = maxType === 1 ? 9 : maxType - 1;
    const right = maxType === 9 ? 1 : maxType + 1;
    const wing = (typeScores[left] || 0) >= (typeScores[right] || 0) ? left : right;
    setWingType(wing);

    saveMutation.mutate({ scores: typeScores, dominantType: maxType, wingType: wing });
    setStage("result");
  }

  // ─── Landing Page ──────────────────────────────────────────
  if (stage === "landing") {
    return (
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/discover">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-lg font-bold">九型人格</h1>
        </div>

        <div className="text-center space-y-4 py-4">
          {/* 9-type circle */}
          <div className="relative mx-auto w-52 h-52">
            <div className="absolute inset-0 rounded-full border border-border/50" />
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((type) => {
              const angle = ((type - 1) / 9) * Math.PI * 2 - Math.PI / 2;
              const x = 50 + 42 * Math.cos(angle);
              const y = 50 + 42 * Math.sin(angle);
              const info = TYPE_INFO[type];
              return (
                <div
                  key={type}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
                >
                  <span className="text-lg">{info.emoji}</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5">{info.name}</span>
                </div>
              );
            })}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-muted-foreground">九型人格</span>
            </div>
          </div>

          <h2 className="text-xl font-bold">发现你的人格类型</h2>
          <p className="text-sm text-muted-foreground px-4">
            九型人格是一个深刻的人格分析系统，帮助你了解自己的核心动机、恐惧和渴望。通过36道问题，发现你独特的人格类型。
          </p>
        </div>

        <Button className="w-full" onClick={() => { setStage("quiz"); setCurrentQ(0); }}>
          开始测试
        </Button>
      </div>
    );
  }

  // ─── Quiz ──────────────────────────────────────────────────
  if (stage === "quiz") {
    const q = QUESTIONS[currentQ];
    const progress = ((currentQ + 1) / QUESTIONS.length) * 100;

    return (
      <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => currentQ > 0 ? setCurrentQ(currentQ - 1) : setStage("landing")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground flex-1 text-center">
            {currentQ + 1} / {QUESTIONS.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-accent/30 rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="py-8 text-center">
          <p className="text-lg font-medium leading-relaxed px-2">{q.text}</p>
        </div>

        <div className="space-y-3">
          {LIKERT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                const newAnswers = [...answers];
                newAnswers[currentQ] = opt.value;
                setAnswers(newAnswers);

                if (currentQ < QUESTIONS.length - 1) {
                  setTimeout(() => setCurrentQ(currentQ + 1), 200);
                } else {
                  // Calculate immediately with updated answers
                  const typeScores: Record<number, number> = {};
                  for (let t = 1; t <= 9; t++) typeScores[t] = 0;
                  QUESTIONS.forEach((question, i) => {
                    typeScores[question.type] += i === currentQ ? opt.value : newAnswers[i];
                  });
                  setScores(typeScores);
                  let maxScore = 0, maxType = 1;
                  for (let t = 1; t <= 9; t++) {
                    if (typeScores[t] > maxScore) { maxScore = typeScores[t]; maxType = t; }
                  }
                  setDominantType(maxType);
                  const left = maxType === 1 ? 9 : maxType - 1;
                  const right = maxType === 9 ? 1 : maxType + 1;
                  setWingType((typeScores[left] || 0) >= (typeScores[right] || 0) ? left : right);
                  saveMutation.mutate({ scores: typeScores, dominantType: maxType, wingType: maxType === 1 ? 9 : maxType - 1 });
                  setStage("result");
                }
              }}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                answers[currentQ] === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 bg-card/50 hover:bg-accent/30"
              }`}
            >
              <span className="text-sm">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentQ > 0 && (
            <Button variant="outline" size="sm" onClick={() => setCurrentQ(currentQ - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> 上一题
            </Button>
          )}
          {answers[currentQ] > 0 && currentQ < QUESTIONS.length - 1 && (
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setCurrentQ(currentQ + 1)}>
              下一题 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── Result Page ───────────────────────────────────────────
  const info = TYPE_INFO[dominantType];
  const wingInfo = TYPE_INFO[wingType];
  const maxPossible = 20; // 4 questions * 5 max score

  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/discover">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-lg font-bold">九型人格 · 结果</h1>
      </div>

      {/* Main type */}
      <Card className={`bg-gradient-to-br ${info.color} border-0 p-6 text-center space-y-3`}>
        <div className="text-5xl">{info.emoji}</div>
        <div className="space-y-1">
          <h2 className="text-3xl font-bold">{dominantType}号</h2>
          <h3 className="text-lg font-semibold">{info.name} · {info.title}</h3>
        </div>
        <Badge variant="secondary">翼型: {wingType}号 {wingInfo.name}</Badge>
      </Card>

      {/* Description */}
      <Card className="bg-card/50 border-border/50 p-4 space-y-3">
        <h3 className="font-semibold">人格描述</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{info.description}</p>
      </Card>

      {/* Traits */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-emerald-500/5 border-emerald-500/20 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-emerald-400">✨ 优势</h3>
          <div className="flex flex-wrap gap-1">
            {info.strengths.map((s, i) => (
              <Badge key={i} className="bg-emerald-500/10 text-emerald-400 border-0 text-xs">{s}</Badge>
            ))}
          </div>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/20 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-orange-400">⚡ 盲区</h3>
          <div className="flex flex-wrap gap-1">
            {info.weaknesses.map((w, i) => (
              <Badge key={i} className="bg-orange-500/10 text-orange-400 border-0 text-xs">{w}</Badge>
            ))}
          </div>
        </Card>
      </div>

      {/* Growth & Stress */}
      <Card className="bg-card/50 border-border/50 p-4 space-y-3">
        <h3 className="font-semibold">成长与压力方向</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">📈</span>
            <p className="text-muted-foreground">{info.growth}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-orange-400 mt-0.5">📉</span>
            <p className="text-muted-foreground">{info.stress}</p>
          </div>
        </div>
      </Card>

      {/* Compatible types */}
      <Card className="bg-card/50 border-border/50 p-4 space-y-3">
        <h3 className="font-semibold">最佳搭配</h3>
        <div className="flex gap-2">
          {info.compatible.map((t) => {
            const ci = TYPE_INFO[t];
            return (
              <div key={t} className="flex-1 bg-accent/30 rounded-xl p-3 text-center">
                <span className="text-xl">{ci.emoji}</span>
                <p className="text-xs mt-1">{t}号 {ci.name}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Score chart */}
      <Card className="bg-card/50 border-border/50 p-4 space-y-3">
        <h3 className="font-semibold">得分分布</h3>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => {
            const score = scores[t] || 0;
            const pct = (score / maxPossible) * 100;
            const isMax = t === dominantType;
            return (
              <div key={t} className="flex items-center gap-2">
                <span className="text-xs w-16 text-muted-foreground">{t}. {TYPE_INFO[t].name}</span>
                <div className="flex-1 bg-accent/30 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${isMax ? "bg-primary" : "bg-muted-foreground/40"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs w-6 text-right text-muted-foreground">{score}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setStage("landing");
          setAnswers(new Array(36).fill(0));
          setCurrentQ(0);
        }}
      >
        重新测试
      </Button>
    </div>
  );
}
