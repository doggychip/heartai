import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { clientAvatarSvg } from "@/lib/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, MessageCircle, Send, X, Flame, Droplets, Mountain, Star, Leaf, Loader2,
  Sparkles, TrendingUp, Coffee,
} from "lucide-react";

const ELEMENT_STYLE: Record<string, { icon: any; color: string; gradient: string }> = {
  '金': { icon: Star, color: 'text-amber-500', gradient: 'from-amber-500/10 to-amber-500/5' },
  '木': { icon: Leaf, color: 'text-emerald-500', gradient: 'from-emerald-500/10 to-emerald-500/5' },
  '水': { icon: Droplets, color: 'text-blue-500', gradient: 'from-blue-500/10 to-blue-500/5' },
  '火': { icon: Flame, color: 'text-red-500', gradient: 'from-red-500/10 to-red-500/5' },
  '土': { icon: Mountain, color: 'text-orange-700', gradient: 'from-orange-700/10 to-orange-700/5' },
};

function SliderLabel({ value, lowLabel, highLabel }: { value: number; lowLabel: string; highLabel: string }) {
  if (value > 65) return <span className="text-[10px]">{highLabel}</span>;
  if (value < 35) return <span className="text-[10px]">{lowLabel}</span>;
  return <span className="text-[10px]">中立</span>;
}

interface AvatarInfo {
  id: string;
  userId: string;
  name: string;
  bio: string | null;
  element: string | null;
  sliderPraise: number;
  sliderSerious: number;
  sliderWarm: number;
  ownerNickname: string;
  isActive: boolean;
}

// ── 预交互 Recommendation Hints ────────────────────────────────
const ICEBREAKER_MAP: Record<string, string[]> = {
  '金': ['聊聊最近的目标？', '你对效率有什么心得？', '分享一个果断的决定'],
  '木': ['最近有什么开心的事？', '你在学什么新东西？', '聊聊让你成长的经历'],
  '水': ['你最近在思考什么？', '推荐一本好书？', '分享一个深刻的感悟'],
  '火': ['最近有什么让你兴奋的事？', '聊聊你的热情所在？', '分享一个有趣的经历'],
  '土': ['你的周末怎么过？', '聊聊日常小确幸？', '分享一个暖心的故事'],
};
const DEFAULT_ICEBREAKERS = ['你好呀～', '最近怎么样？', '聊聊天吧'];

function getIcebreakers(element: string | null): string[] {
  return element && ICEBREAKER_MAP[element] ? ICEBREAKER_MAP[element] : DEFAULT_ICEBREAKERS;
}

function getCompatibilityHint(myElement: string | null, targetElement: string | null): { text: string; level: 'high' | 'medium' | 'low' } | null {
  if (!myElement || !targetElement) return null;
  const COMPAT: Record<string, Record<string, 'high' | 'medium' | 'low'>> = {
    '金': { '金': 'medium', '木': 'low', '水': 'high', '火': 'low', '土': 'high' },
    '木': { '金': 'low', '木': 'medium', '水': 'high', '火': 'high', '土': 'low' },
    '水': { '金': 'high', '木': 'high', '水': 'medium', '火': 'low', '土': 'low' },
    '火': { '金': 'low', '木': 'high', '水': 'low', '火': 'medium', '土': 'high' },
    '土': { '金': 'high', '木': 'low', '水': 'low', '火': 'high', '土': 'medium' },
  };
  const level = COMPAT[myElement]?.[targetElement] || 'medium';
  const texts = { high: '契合度高', medium: '契合度中', low: '契合度低' };
  return { text: texts[level], level };
}

const COMPAT_COLORS = {
  high: 'text-emerald-500',
  medium: 'text-amber-500',
  low: 'text-muted-foreground/60',
};

export default function AvatarPlazaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatTarget, setChatTarget] = useState<AvatarInfo | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");

  // Fetch user's own avatar for compatibility hints
  const { data: myAvatar } = useQuery<AvatarInfo | null>({
    queryKey: ["/api/avatar/mine"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/avatar");
        const data = await res.json();
        return data.avatar || null;
      } catch { return null; }
    },
    enabled: !!user,
  });

  const { data: avatars, isLoading } = useQuery<AvatarInfo[]>({
    queryKey: ["/api/avatar/plaza"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/avatar/plaza");
      return res.json();
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", `/api/avatar/${chatTarget!.userId}/chat`, { message });
      return res.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "avatar", content: data.reply }]);
    },
    onError: (err: any) => {
      console.error("Avatar chat error:", err);
      // Show a fallback reply in the chat instead of just a toast
      const fallbackReplies = [
        `${chatTarget?.name || '分身'}现在有点忙，等会儿再来找我聊吧～`,
        `网络好像不太稳定，${chatTarget?.name || '分身'}稍后回复你～`,
        `${chatTarget?.name || '分身'}打了个盹，再发一次试试？`,
      ];
      const fallback = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
      setMessages(prev => [...prev, { role: "avatar", content: fallback }]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;
    const msg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "visitor", content: msg }]);
    chatMutation.mutate(msg);
  };

  const openChat = (avatar: AvatarInfo) => {
    setChatTarget(avatar);
    setMessages([]);
    setInput("");
  };

  const closeChat = () => {
    setChatTarget(null);
    setMessages([]);
  };

  // ─── Chat View ─────────────────────────────────
  if (chatTarget) {
    const elStyle = chatTarget.element ? ELEMENT_STYLE[chatTarget.element] : null;
    const ElIcon = elStyle?.icon || Zap;
    return (
      <div className="flex-1 flex flex-col h-full" data-testid="avatar-chat-view">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeChat}>
            <X className="w-4 h-4" />
          </Button>
          <img
            src={clientAvatarSvg(chatTarget.name, chatTarget.element)}
            alt={chatTarget.name}
            className="w-9 h-9 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{chatTarget.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {chatTarget.ownerNickname} 的分身
              {chatTarget.element && ` · ${chatTarget.element}系`}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="mb-4">向 {chatTarget.name} 打个招呼吧</p>
              {/* 预交互 icebreaker suggestions */}
              <div className="flex flex-wrap justify-center gap-2 max-w-xs mx-auto">
                {getIcebreakers(chatTarget.element).map((hint, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(hint);
                    }}
                    className="px-3 py-1.5 rounded-full text-xs bg-primary/5 hover:bg-primary/10 border border-primary/10 text-foreground transition-colors"
                    data-testid={`icebreaker-${i}`}
                  >
                    <Coffee className="w-3 h-3 inline mr-1 opacity-60" />
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "visitor" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                  msg.role === "visitor"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 flex gap-2 bg-card/50 flex-shrink-0">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder={`和 ${chatTarget.name} 说点什么...`}
            className="resize-none min-h-[40px] max-h-24 text-sm"
            rows={1}
            data-testid="input-chat-message"
          />
          <Button
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            data-testid="button-send-chat"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── Plaza List View ───────────────────────────
  return (
    <div className="flex-1 overflow-y-auto" data-testid="avatar-plaza-page">
      <div className="px-4 py-5">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          分身对话广场
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          与其他用户的 AI 分身聊天互动
        </p>
      </div>

      <div className="px-4 pb-6 space-y-3">
        {isLoading && (
          <>
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </>
        )}

        {!isLoading && (!avatars || avatars.length === 0) && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <Zap className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>暂时没有活跃的分身</p>
            <p className="text-xs mt-1">去创建你的 AI 分身吧</p>
          </div>
        )}

        {avatars?.map((av) => {
          const elStyle = av.element ? ELEMENT_STYLE[av.element] : null;
          const ElIcon = elStyle?.icon || Zap;
          const isOwnAvatar = user?.id === av.userId;

          return (
            <Card
              key={av.id}
              className="border-border overflow-hidden"
              data-testid={`avatar-card-${av.id}`}
            >
              <CardContent className="p-0">
                <div className={`bg-gradient-to-r ${elStyle?.gradient || 'from-primary/5 to-primary/[0.02]'} px-4 py-3`}>
                  <div className="flex items-start gap-3">
                    {/* Avatar icon */}
                    <img
                      src={clientAvatarSvg(av.name, av.element)}
                      alt={av.name}
                      className="w-11 h-11 rounded-xl flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{av.name}</span>
                        {av.element && (
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {av.element}系
                          </Badge>
                        )}
                        {isOwnAvatar && (
                          <Badge variant="outline" className="text-[10px] h-5">我的</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {av.ownerNickname} 的分身
                      </p>
                      {av.bio && (
                        <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{av.bio}</p>
                      )}

                      {/* Personality tags */}
                      <div className="flex gap-2 mt-2 text-muted-foreground">
                        <SliderLabel value={av.sliderPraise} lowLabel="锐评" highLabel="夸夸" />
                        <SliderLabel value={av.sliderSerious} lowLabel="抽象" highLabel="正经" />
                        <SliderLabel value={av.sliderWarm} lowLabel="高冷" highLabel="显眼" />
                      </div>
                    </div>

                    {/* Chat button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0 gap-1.5 h-8 text-xs"
                      onClick={() => openChat(av)}
                      data-testid={`button-chat-${av.id}`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      聊天
                    </Button>
                  </div>

                  {/* 预交互 hints row */}
                  {(() => {
                    const compat = getCompatibilityHint(myAvatar?.element || null, av.element);
                    const hints = getIcebreakers(av.element);
                    return (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                        {compat && (
                          <span className={`text-[10px] flex items-center gap-0.5 ${COMPAT_COLORS[compat.level]}`}>
                            <TrendingUp className="w-3 h-3" />
                            {compat.text}
                          </span>
                        )}
                        <div className="flex-1 flex gap-1.5 overflow-x-auto">
                          {hints.slice(0, 2).map((h, i) => (
                            <button
                              key={i}
                              onClick={(e) => { e.stopPropagation(); openChat(av); setTimeout(() => setInput(h), 50); }}
                              className="px-2 py-0.5 rounded-full text-[10px] bg-muted/50 hover:bg-muted text-muted-foreground whitespace-nowrap transition-colors"
                              data-testid={`hint-${av.id}-${i}`}
                            >
                              <Sparkles className="w-2.5 h-2.5 inline mr-0.5 opacity-50" />
                              {h}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
