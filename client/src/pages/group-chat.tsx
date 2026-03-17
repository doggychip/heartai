import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import {
  Send,
  ArrowLeft,
  Sparkles,
  MessagesSquare,
  Plus,
  Loader2,
  ChevronRight,
  Clock,
  MessageCircle,
} from "lucide-react";

// ── Avatar config ─────────────────────────────────────────────
const AVATARS: Record<string, { name: string; specialty: string; color: string; bgGradient: string; emoji: string }> = {
  'cfd2636b-fcb0-498b-891d-a576fead3139': { name: '玄机子', specialty: '八字/易经', color: '#b8863e', bgGradient: 'from-amber-600 to-yellow-700', emoji: '📜' },
  'a35dd36d-163a-407c-b472-f5b2546727ba': { name: '星河散人', specialty: '星象/占星', color: '#6366f1', bgGradient: 'from-indigo-500 to-violet-600', emoji: '🌌' },
  'a1a00269-8e33-41c2-a917-f3207fc9e235': { name: '云山道人', specialty: '道家智慧', color: '#10b981', bgGradient: 'from-emerald-500 to-teal-600', emoji: '🏔️' },
  '8cf95845-88f4-4bd1-bef3-7f6a58294600': { name: '观星小助手', specialty: '综合分析', color: '#f59e0b', bgGradient: 'from-amber-400 to-orange-500', emoji: '⭐' },
};

const SUGGESTED_TOPICS = [
  "2026下半年事业运怎么把握？",
  "感情什么时候会有好的转机？",
  "最近总是失眠焦虑怎么办？",
  "今年适合换工作吗？",
  "怎样提升自己的财运？",
];

interface ChatMessage {
  id: string;
  avatarId?: string | null;
  userId?: string | null;
  content: string;
  avatarName?: string | null;
  specialty?: string | null;
  messageOrder?: number | null;
  round?: number | null;
  isUser?: boolean;
  createdAt: string;
}

interface SessionInfo {
  id: string;
  topic: string;
  createdAt: string;
}

// ── Typing Indicator ──────────────────────────────────────────
function TypingIndicator({ avatarName }: { avatarName: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-xs text-muted-foreground">{avatarName}正在思考...</span>
    </div>
  );
}

// ── Chat Bubble Component ─────────────────────────────────────
function ChatBubble({ message, isVisible }: { message: ChatMessage; isVisible: boolean }) {
  const isUser = message.isUser || !!message.userId;
  const avatar = message.avatarId ? AVATARS[message.avatarId] : null;

  if (isUser) {
    return (
      <div className={`flex justify-end px-4 py-1.5 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="max-w-[80%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-3.5 py-2.5 shadow-sm">
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2.5 px-4 py-1.5 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Avatar circle */}
      <div
        className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatar?.bgGradient || 'from-gray-400 to-gray-500'} flex items-center justify-center text-white flex-shrink-0 shadow-sm text-sm`}
      >
        {avatar?.emoji || '🤖'}
      </div>
      {/* Message */}
      <div className="max-w-[80%] min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs font-medium" style={{ color: avatar?.color || '#888' }}>
            {message.avatarName || avatar?.name || '大师'}
          </span>
          <span className="text-[9px] text-muted-foreground/60 px-1.5 py-0.5 rounded-full bg-muted/50">
            {message.specialty || avatar?.specialty || ''}
          </span>
        </div>
        <div className="bg-muted/60 dark:bg-muted/40 rounded-2xl rounded-tl-md px-3.5 py-2.5 shadow-sm">
          <p className="text-sm leading-relaxed text-foreground/90">{message.content}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Group Chat Page ──────────────────────────────────────
export default function GroupChatPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [displayedMessages, setDisplayedMessages] = useState<ChatMessage[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [typingAvatar, setTypingAvatar] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // Session history
  const { data: sessions } = useQuery<SessionInfo[]>({
    queryKey: ["/api/group-chat/sessions"],
    staleTime: 30_000,
  });

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (topicText: string) => {
      const resp = await apiRequest("POST", "/api/group-chat/create", { topic: topicText });
      return resp.json();
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setDisplayedMessages([{
        id: 'user-0',
        userId: user?.id,
        content: topic.trim(),
        isUser: true,
        createdAt: new Date().toISOString(),
      }]);
      setVisibleCount(1);
      // Auto-generate
      setTimeout(() => generateResponses(data.sessionId), 300);
    },
  });

  // Generate responses
  const generateMutation = useMutation({
    mutationFn: async (sid: string) => {
      const resp = await apiRequest("POST", `/api/group-chat/${sid}/generate`);
      return resp.json();
    },
  });

  async function generateResponses(sid: string) {
    setIsGenerating(true);

    // Show typing indicator for first avatar
    const avatarOrder = [
      { id: 'cfd2636b-fcb0-498b-891d-a576fead3139', name: '玄机子' },
      { id: 'a35dd36d-163a-407c-b472-f5b2546727ba', name: '星河散人' },
      { id: 'a1a00269-8e33-41c2-a917-f3207fc9e235', name: '云山道人' },
      { id: '8cf95845-88f4-4bd1-bef3-7f6a58294600', name: '观星小助手' },
    ];
    setTypingAvatar(avatarOrder[0].name);

    try {
      const result = await generateMutation.mutateAsync(sid);
      const newMessages: ChatMessage[] = result.messages.map((m: any) => ({
        id: m.id,
        avatarId: m.avatarId,
        avatarName: m.avatarName,
        specialty: m.specialty,
        content: m.content,
        isUser: false,
        createdAt: m.createdAt,
      }));

      // Stagger message appearance
      for (let i = 0; i < newMessages.length; i++) {
        if (i < newMessages.length - 1) {
          setTypingAvatar(avatarOrder[i + 1]?.name || null);
        } else {
          setTypingAvatar(null);
        }

        await new Promise(resolve => setTimeout(resolve, i === 0 ? 500 : 1200));

        setDisplayedMessages(prev => [...prev, newMessages[i]]);
        setVisibleCount(prev => prev + 1);
        scrollToBottom();
      }
    } catch (err) {
      console.error("Generate error:", err);
    } finally {
      setIsGenerating(false);
      setTypingAvatar(null);
      scrollToBottom();
    }
  }

  // Send follow-up
  const replyMutation = useMutation({
    mutationFn: async ({ sid, message }: { sid: string; message: string }) => {
      const resp = await apiRequest("POST", `/api/group-chat/${sid}/reply`, { message });
      return resp.json();
    },
  });

  async function handleFollowUp() {
    if (!followUp.trim() || !sessionId || isGenerating) return;

    const msg = followUp.trim();
    setFollowUp("");

    // Add user message to display
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      userId: user?.id,
      content: msg,
      isUser: true,
      createdAt: new Date().toISOString(),
    };
    setDisplayedMessages(prev => [...prev, userMsg]);
    setVisibleCount(prev => prev + 1);
    scrollToBottom();

    try {
      await replyMutation.mutateAsync({ sid: sessionId, message: msg });
      // Generate new round
      await generateResponses(sessionId);
    } catch (err) {
      console.error("Follow-up error:", err);
    }
  }

  // Load existing session
  async function loadSession(sid: string) {
    try {
      const resp = await apiRequest("GET", `/api/group-chat/${sid}`);
      const data = await resp.json();
      setSessionId(sid);
      setDisplayedMessages(data.messages.map((m: any) => ({
        ...m,
        isUser: !!m.userId,
      })));
      setVisibleCount(data.messages.length);
      scrollToBottom();
    } catch (err) {
      console.error("Load session error:", err);
    }
  }

  // Start new topic
  function startNewTopic() {
    setSessionId(null);
    setDisplayedMessages([]);
    setVisibleCount(0);
    setTopic("");
    setFollowUp("");
    setIsGenerating(false);
    setTypingAvatar(null);
  }

  function handleSubmitTopic() {
    if (!topic.trim() || createSession.isPending) return;
    createSession.mutate(topic.trim());
  }

  // Auto-scroll when visible count changes
  useEffect(() => {
    scrollToBottom();
  }, [visibleCount]);

  // ── Entry View (no active session) ──────────────────────────
  if (!sessionId) {
    return (
      <div className="flex-1 overflow-y-auto bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate("/")} className="p-1 -ml-1 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold flex items-center gap-2">
              <MessagesSquare className="w-5 h-5 text-indigo-500" />
              AI群聊「论道」
            </h1>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Hero */}
          <div className="text-center py-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg mb-4">
              <MessagesSquare className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">向大师们提问</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              四位AI大师从不同角度为你解答，观点碰撞更有启发
            </p>
          </div>

          {/* Avatar lineup */}
          <div className="flex justify-center gap-3">
            {Object.entries(AVATARS).map(([id, av]) => (
              <div key={id} className="flex flex-col items-center gap-1">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${av.bgGradient} flex items-center justify-center shadow-sm text-lg`}>
                  {av.emoji}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{av.name}</span>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="space-y-3">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmitTopic()}
                placeholder="输入你想问的问题..."
                className="w-full h-12 rounded-2xl border border-border bg-muted/30 px-4 pr-12 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all"
                maxLength={200}
              />
              <button
                onClick={handleSubmitTopic}
                disabled={!topic.trim() || createSession.isPending}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-sm disabled:opacity-40 transition-opacity"
              >
                {createSession.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Suggested topics */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium px-1">热门话题</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_TOPICS.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => { setTopic(t); inputRef.current?.focus(); }}
                    className="text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted text-foreground/70 hover:text-foreground transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Previous sessions */}
          {sessions && sessions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium px-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                历史论道
              </p>
              <div className="space-y-2">
                {sessions.slice(0, 5).map(s => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
                  >
                    <p className="text-sm truncate text-foreground/80">{s.topic}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(s.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Chat View (active session) ──────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={startNewTopic} className="p-1 -ml-1 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">论道</h1>
            <p className="text-[10px] text-muted-foreground truncate">
              {displayedMessages.find(m => m.isUser)?.content || '群聊中'}
            </p>
          </div>
          <button
            onClick={startNewTopic}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            title="新话题"
          >
            <Plus className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-3 space-y-1">
        {displayedMessages.map((msg, i) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            isVisible={i < visibleCount}
          />
        ))}

        {/* Typing indicator */}
        {typingAvatar && <TypingIndicator avatarName={typingAvatar} />}

        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <div className="sticky bottom-0 bg-background/90 backdrop-blur-lg border-t border-border/50 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={followUp}
            onChange={e => setFollowUp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFollowUp()}
            placeholder={isGenerating ? "大师们正在讨论中..." : "追问大师们..."}
            disabled={isGenerating}
            className="flex-1 h-10 rounded-xl border border-border bg-muted/30 px-3.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all disabled:opacity-50"
            maxLength={200}
          />
          <button
            onClick={handleFollowUp}
            disabled={!followUp.trim() || isGenerating}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-sm disabled:opacity-40 transition-opacity flex-shrink-0"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
