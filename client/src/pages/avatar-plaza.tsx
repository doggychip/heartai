import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, MessageCircle, Send, X, Flame, Droplets, Mountain, Star, Leaf, Loader2,
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

export default function AvatarPlazaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatTarget, setChatTarget] = useState<AvatarInfo | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");

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
    onError: () => {
      toast({ title: "对话失败", description: "请稍后重试", variant: "destructive" });
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
          <div className={`w-9 h-9 rounded-full ${elStyle?.color ? 'bg-' + chatTarget.element : 'bg-primary/10'} flex items-center justify-center`}
               style={{ background: `var(--${chatTarget.element === '火' ? 'destructive' : 'primary'}-foreground, hsl(var(--primary) / 0.1))` }}>
            <ElIcon className={`w-4 h-4 ${elStyle?.color || 'text-primary'}`} />
          </div>
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
              <p>向 {chatTarget.name} 打个招呼吧</p>
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
                    <div className={`w-11 h-11 rounded-xl ${elStyle ? '' : 'bg-primary/10'} flex items-center justify-center flex-shrink-0`}
                         style={elStyle ? { background: `hsl(var(--primary) / 0.1)` } : {}}>
                      <ElIcon className={`w-5 h-5 ${elStyle?.color || 'text-primary'}`} />
                    </div>

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
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
