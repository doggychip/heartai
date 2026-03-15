import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Send,
  Plus,
  Heart,
  MessageCircle,
  Sparkles,
  BookOpen,
  Menu,
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Activity,
  Shield,
  AlertTriangle,
} from "lucide-react";
import type { Message, Conversation, ChatResponse, DeepEmotionAnalysis, EmotionDimension } from "@shared/schema";

// ─── Radar Chart Component ─────────────────────────────────
function EmotionRadar({ dimensions }: { dimensions: EmotionDimension[] }) {
  const size = 180;
  const center = size / 2;
  const maxRadius = 65;
  const items = dimensions.slice(0, 6); // Show top 6 in radar

  if (items.length < 3) return null;

  const angleStep = (2 * Math.PI) / items.length;

  // Generate polygon points for each ring
  const ringPoints = (radius: number) =>
    items.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return `${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`;
    }).join(" ");

  // Data polygon
  const dataPoints = items.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = d.score * maxRadius;
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  }).join(" ");

  // Label positions
  const labels = items.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const lr = maxRadius + 20;
    return {
      x: center + lr * Math.cos(angle),
      y: center + lr * Math.sin(angle),
      text: `${d.emoji}${d.nameZh}`,
      score: d.score,
    };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      {/* Background rings */}
      {[0.25, 0.5, 0.75, 1].map((scale) => (
        <polygon
          key={scale}
          points={ringPoints(maxRadius * scale)}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth="0.5"
          opacity={0.4}
        />
      ))}
      {/* Axis lines */}
      {items.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + maxRadius * Math.cos(angle)}
            y2={center + maxRadius * Math.sin(angle)}
            stroke="currentColor"
            className="text-border"
            strokeWidth="0.5"
            opacity={0.3}
          />
        );
      })}
      {/* Data polygon */}
      <polygon
        points={dataPoints}
        fill="hsl(var(--primary))"
        fillOpacity={0.15}
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
      />
      {/* Data points */}
      {items.map((d, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const r = d.score * maxRadius;
        return (
          <circle
            key={i}
            cx={center + r * Math.cos(angle)}
            cy={center + r * Math.sin(angle)}
            r="3"
            fill="hsl(var(--primary))"
          />
        );
      })}
      {/* Labels */}
      {labels.map((l, i) => (
        <text
          key={i}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground"
          fontSize="8"
          fontWeight={l.score > 0.5 ? "600" : "400"}
        >
          {l.text}
        </text>
      ))}
    </svg>
  );
}

// ─── VAD Indicator ──────────────────────────────────────────
function VADBar({ label, value, min, max, color }: { label: string; value: number; min: string; max: string; color: string }) {
  const pct = ((value - (min === "负面" ? -1 : 0)) / (min === "负面" ? 2 : 1)) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}</span>
        <span className="font-medium text-foreground">{label}</span>
        <span>{max}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

// ─── Deep Emotion Panel ─────────────────────────────────────
function DeepEmotionPanel({ deep, collapsed, onToggle }: { deep: DeepEmotionAnalysis; collapsed: boolean; onToggle: () => void }) {
  const riskColors = {
    safe: "text-green-500",
    mild: "text-yellow-500",
    moderate: "text-orange-500",
    high: "text-red-500",
  };
  const riskLabels = {
    safe: "安全",
    mild: "轻微关注",
    moderate: "需要关注",
    high: "需要帮助",
  };

  return (
    <div className="bg-card/60 border border-border/60 rounded-xl overflow-hidden transition-all" data-testid="deep-emotion-panel">
      {/* Collapsed header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent/30 transition-colors"
        data-testid="button-toggle-emotion"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">情感深度分析</span>
          <span className="text-xs text-muted-foreground">
            {deep.primary.emoji} {deep.primary.nameZh}
            {deep.secondary ? ` · ${deep.secondary.emoji} ${deep.secondary.nameZh}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {deep.riskLevel !== "safe" && (
            <span className={`text-[10px] ${riskColors[deep.riskLevel]}`}>
              <AlertTriangle className="w-3 h-3 inline" /> {riskLabels[deep.riskLevel]}
            </span>
          )}
          {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded content */}
      {!collapsed && (
        <div className="px-3 pb-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Insight */}
          <div className="bg-primary/5 rounded-lg px-3 py-2 text-xs text-muted-foreground" data-testid="text-emotion-insight">
            <Activity className="w-3 h-3 inline text-primary mr-1" />
            {deep.insight}
          </div>

          {/* Radar + Dimensions */}
          <div className="grid grid-cols-2 gap-3">
            {/* Radar chart */}
            <div className="flex items-center justify-center" data-testid="emotion-radar">
              <div className="w-[180px] h-[180px]">
                <EmotionRadar dimensions={deep.dimensions} />
              </div>
            </div>

            {/* Dimension bars */}
            <div className="space-y-1.5">
              {deep.dimensions.slice(0, 6).map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="text-xs w-16 truncate">{d.emoji}{d.nameZh}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full transition-all duration-500"
                      style={{ width: `${d.score * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{Math.round(d.score * 100)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* VAD Model */}
          <div className="space-y-2 pt-1">
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              VAD 情感模型
            </div>
            <VADBar label="情感效价" value={deep.valence} min="负面" max="正面" color="bg-blue-500" />
            <VADBar label="激活程度" value={deep.arousal} min="平静" max="激动" color="bg-amber-500" />
            <VADBar label="掌控感" value={deep.dominance} min="低" max="高" color="bg-emerald-500" />
          </div>

          {/* Risk badge */}
          <div className="flex items-center gap-2 pt-1">
            <Shield className={`w-3 h-3 ${riskColors[deep.riskLevel]}`} />
            <span className={`text-[10px] ${riskColors[deep.riskLevel]}`}>{riskLabels[deep.riskLevel]}</span>
            {deep.valence > 0 ? (
              <span className="text-[10px] text-green-500 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> 正面情绪
              </span>
            ) : deep.valence < -0.3 ? (
              <span className="text-[10px] text-orange-500 flex items-center gap-0.5">
                <TrendingDown className="w-3 h-3" /> 负面情绪
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Minus className="w-3 h-3" /> 中性情绪
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Emotion Badge (enhanced) ───────────────────────────────
function EmotionBadge({ emotion, score, deepEmotion }: { emotion: string; score: number; deepEmotion?: DeepEmotionAnalysis }) {
  if (deepEmotion) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs font-normal" data-testid="emotion-badge-deep">
        <span>{deepEmotion.primary.emoji}</span>
        <span>{deepEmotion.primary.nameZh}</span>
        <span className="opacity-50">·</span>
        <span className="opacity-60">{Math.round(deepEmotion.primary.score * 100)}%</span>
      </Badge>
    );
  }

  const EMOTION_LABELS: Record<string, { label: string; emoji: string }> = {
    joy: { label: "开心", emoji: "😊" },
    sadness: { label: "难过", emoji: "😢" },
    anger: { label: "生气", emoji: "😤" },
    fear: { label: "害怕", emoji: "😨" },
    anxiety: { label: "焦虑", emoji: "😰" },
    surprise: { label: "惊讶", emoji: "😮" },
    calm: { label: "平静", emoji: "🍃" },
    neutral: { label: "平和", emoji: "😌" },
  };
  const info = EMOTION_LABELS[emotion] || EMOTION_LABELS.neutral;
  return (
    <Badge variant="secondary" className="gap-1 text-xs font-normal" data-testid={`emotion-badge-${emotion}`}>
      <span>{info.emoji}</span>
      <span>{info.label}</span>
      <span className="opacity-50">·</span>
      <span className="opacity-60">{score}/10</span>
    </Badge>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3" data-testid="typing-indicator">
      <div className="w-2 h-2 rounded-full bg-primary/60 typing-dot" />
      <div className="w-2 h-2 rounded-full bg-primary/60 typing-dot" />
      <div className="w-2 h-2 rounded-full bg-primary/60 typing-dot" />
    </div>
  );
}

function ConversationList({
  conversations,
  conversationId,
  onSelect,
  onNewChat,
}: {
  conversations: Conversation[];
  conversationId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}) {
  return (
    <>
      <div className="p-3">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
          size="sm"
          data-testid="button-new-chat"
        >
          <Plus className="w-4 h-4" />
          新对话
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 pb-3">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors truncate ${
                conversationId === conv.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
              data-testid={`button-conversation-${conv.id}`}
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-3 h-3 flex-shrink-0 opacity-50" />
                <span className="truncate">{conv.title}</span>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </>
  );
}

export default function ChatPage() {
  const isMobile = useIsMobile();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [lastEmotion, setLastEmotion] = useState<{ emotion: string; score: number; suggestion: string } | null>(null);
  const [deepEmotion, setDeepEmotion] = useState<DeepEmotionAnalysis | null>(null);
  const [emotionCollapsed, setEmotionCollapsed] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversations
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  // Fetch messages when conversation changes
  const { data: serverMessages = [] } = useQuery<Message[]>({
    queryKey: ["/api/conversations", conversationId, "messages"],
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (serverMessages.length > 0) {
      setLocalMessages(serverMessages);
      // Restore last deep emotion from server messages
      const lastAiMsg = [...serverMessages].reverse().find(m => m.role === "assistant" && m.emotionData);
      if (lastAiMsg?.emotionData) {
        try {
          setDeepEmotion(JSON.parse(lastAiMsg.emotionData));
        } catch {}
      }
    }
  }, [serverMessages]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages]);

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/chat", {
        conversationId,
        message,
      });
      return (await res.json()) as ChatResponse;
    },
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setLocalMessages((prev) => [...prev, data.message, data.aiMessage]);
      setLastEmotion(data.emotionAnalysis);
      if (data.deepEmotion) {
        setDeepEmotion(data.deepEmotion);
        setEmotionCollapsed(false); // Auto-expand on new analysis
      }
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const handleSend = () => {
    const msg = inputValue.trim();
    if (!msg || chatMutation.isPending) return;
    setInputValue("");

    // Optimistic: show user message immediately
    const tempUserMsg: Message = {
      id: "temp-" + Date.now(),
      conversationId: conversationId || "temp",
      role: "user",
      content: msg,
      emotionTag: null,
      emotionScore: null,
      emotionData: null,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, tempUserMsg]);

    chatMutation.mutate(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startNewChat = () => {
    setConversationId(null);
    setLocalMessages([]);
    setLastEmotion(null);
    setDeepEmotion(null);
    setInputValue("");
    setSheetOpen(false);
    setEmotionCollapsed(true);
  };

  const selectConversation = (id: string) => {
    setConversationId(id);
    setLocalMessages([]);
    setLastEmotion(null);
    setDeepEmotion(null);
    setSheetOpen(false);
    setEmotionCollapsed(true);
  };

  return (
    <div className="flex h-full" data-testid="chat-page">
      {/* Desktop conversation sidebar */}
      {!isMobile && (
        <aside className="w-56 border-r border-border flex flex-col bg-card/30" data-testid="chat-sidebar">
          <ConversationList
            conversations={conversations}
            conversationId={conversationId}
            onSelect={selectConversation}
            onNewChat={startNewChat}
          />
        </aside>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0" data-testid="chat-main">
        {/* Header */}
        <header className="h-12 border-b border-border flex items-center justify-between px-4 sm:px-5 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Mobile: show sheet trigger for conversations */}
            {isMobile && (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1" data-testid="button-open-conversations">
                    <Menu className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 flex flex-col">
                  <div className="p-4 border-b border-border">
                    <span className="font-semibold text-sm">对话列表</span>
                  </div>
                  <ConversationList
                    conversations={conversations}
                    conversationId={conversationId}
                    onSelect={selectConversation}
                    onNewChat={startNewChat}
                  />
                </SheetContent>
              </Sheet>
            )}
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">AI 情感陪伴</span>
            {deepEmotion && (
              <Badge variant="outline" className="text-[10px] gap-0.5 ml-1 opacity-70">
                <Brain className="w-2.5 h-2.5" />
                深度分析
              </Badge>
            )}
          </div>
          {lastEmotion && (
            <EmotionBadge emotion={lastEmotion.emotion} score={lastEmotion.score} deepEmotion={deepEmotion || undefined} />
          )}
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {localMessages.length === 0 ? (
            <WelcomeScreen isMobile={isMobile} onQuickAction={(msg) => {
              setInputValue(msg);
              setTimeout(() => textareaRef.current?.focus(), 50);
            }} />
          ) : (
            <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
              {localMessages
                .filter((m) => !m.id.startsWith("temp-") || !localMessages.some(
                  (other) => other.role === "user" && other.content === m.content && !other.id.startsWith("temp-")
                ))
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex animate-message-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3.5 sm:px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card border border-border rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md">
                    <TypingIndicator />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Deep emotion panel */}
        {deepEmotion && (
          <div className="mx-auto max-w-2xl w-full px-3 sm:px-4 pb-1">
            <DeepEmotionPanel
              deep={deepEmotion}
              collapsed={emotionCollapsed}
              onToggle={() => setEmotionCollapsed(!emotionCollapsed)}
            />
          </div>
        )}

        {/* Emotion suggestion bar (only if no deep emotion or collapsed) */}
        {lastEmotion && lastEmotion.suggestion && (!deepEmotion || emotionCollapsed) && (
          <div className="mx-auto max-w-2xl w-full px-3 sm:px-4">
            <div
              className="bg-primary/5 border border-primary/10 rounded-xl px-3 sm:px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-2"
              data-testid="text-emotion-suggestion"
            >
              <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{deepEmotion?.suggestion || lastEmotion.suggestion}</span>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="p-3 sm:p-4 max-w-2xl mx-auto w-full" data-testid="chat-input-area">
          <div className="relative flex items-end gap-2 bg-card border border-border rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="说说你的感受..."
              className="flex-1 min-h-[24px] max-h-[120px] resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
              rows={1}
              data-testid="input-chat-message"
            />
            <Button
              size="icon"
              className="h-8 w-8 rounded-xl flex-shrink-0"
              onClick={handleSend}
              disabled={!inputValue.trim() || chatMutation.isPending}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground/50 text-center mt-2 hidden sm:block">
            观星是 AI 助手，不替代专业心理咨询。如遇紧急情况请拨打 400-161-9995
          </p>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ isMobile, onQuickAction }: { isMobile: boolean; onQuickAction: (msg: string) => void }) {
  const quickActions = [
    { emoji: "😊", label: "分享开心的事", prompt: "今天有一件很开心的事情想和你分享" },
    { emoji: "😔", label: "心情有些低落", prompt: "我最近心情不太好，想找人聊聊" },
    { emoji: "😰", label: "感到焦虑不安", prompt: "我最近总是感到焦虑，不知道该怎么办" },
    { emoji: "🤔", label: "需要一些建议", prompt: "我遇到了一些困惑，想听听你的建议" },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12" data-testid="welcome-screen">
      <div className={`${isMobile ? "w-12 h-12" : "w-16 h-16"} rounded-2xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6`}>
        <Heart className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} text-primary`} />
      </div>
      <h1 className="text-lg sm:text-xl font-semibold mb-2">欢迎来到 观星</h1>
      <p className="text-sm text-muted-foreground mb-2 text-center max-w-md">
        我是你的 AI 情感陪伴助手，在这里倾听你的心声。
      </p>
      <div className="flex items-center gap-1.5 mb-6 sm:mb-8">
        <Brain className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs text-primary font-medium">现已升级 30 维度深度情感分析引擎</span>
      </div>
      <div className={`grid ${isMobile ? "grid-cols-1 gap-2" : "grid-cols-2 gap-3"} max-w-md w-full`}>
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => onQuickAction(action.prompt)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card text-left text-sm transition-colors hover:bg-accent hover:border-primary/20"
            data-testid={`button-quick-${action.label}`}
          >
            <span className="text-lg">{action.emoji}</span>
            <span className="text-muted-foreground">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
