import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Globe,
  Flame,
  Users,
} from "lucide-react";

// ── Avatar config ─────────────────────────────────────────────
const AVATARS: Record<string, { name: string; specialty: string; color: string; bgGradient: string; emoji: string }> = {
  'cfd2636b-fcb0-498b-891d-a576fead3139': { name: '玄机子', specialty: '八字/易经', color: '#b8863e', bgGradient: 'from-amber-600 to-yellow-700', emoji: '📜' },
  'a35dd36d-163a-407c-b472-f5b2546727ba': { name: '星河散人', specialty: '星象/占星', color: '#6366f1', bgGradient: 'from-indigo-500 to-violet-600', emoji: '🌌' },
  'a1a00269-8e33-41c2-a917-f3207fc9e235': { name: '云山道人', specialty: '道家智慧', color: '#10b981', bgGradient: 'from-emerald-500 to-teal-600', emoji: '🏔️' },
  '8cf95845-88f4-4bd1-bef3-7f6a58294600': { name: '观星小助手', specialty: '综合分析', color: '#f59e0b', bgGradient: 'from-amber-400 to-orange-500', emoji: '⭐' },
  // Phase 3 new masters
  'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e': { name: '风水先生·陈半仙', specialty: '风水/堪舆', color: '#d97706', bgGradient: 'from-yellow-600 to-amber-700', emoji: '🧭' },
  'c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f': { name: '紫微真人', specialty: '紫微斗数', color: '#7c3aed', bgGradient: 'from-violet-600 to-purple-700', emoji: '🔮' },
  'd3e4f5a6-b7c8-4d9e-0f1a-2b3c4d5e6f7a': { name: '星语姐姐', specialty: '星座/塔罗', color: '#ec4899', bgGradient: 'from-pink-500 to-rose-500', emoji: '💫' },
  'e4f5a6b7-c8d9-4e0f-1a2b-3c4d5e6f7a8b': { name: '机器猫', specialty: 'AI数据分析', color: '#06b6d4', bgGradient: 'from-cyan-500 to-blue-500', emoji: '🤖' },
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
  const [isPublic, setIsPublic] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [displayedMessages, setDisplayedMessages] = useState<ChatMessage[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [typingAvatar, setTypingAvatar] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAvatars, setActiveAvatars] = useState<Array<{id: string; name: string}>>([]);
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

  // Public sessions
  const { data: publicSessions } = useQuery<any[]>({
    queryKey: ["/api/group-chat/public"],
    staleTime: 30_000,
  });

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (topicText: string) => {
      const resp = await apiRequest("POST", "/api/group-chat/create", { topic: topicText, isPublic });
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
    setTypingAvatar("大师们");

    try {
      const result = await generateMutation.mutateAsync(sid);

      // Server returns which avatars participated this round
      const roundAvatars = result.avatars || [];
      if (roundAvatars.length > 0) {
        setActiveAvatars(roundAvatars);
        setTypingAvatar(roundAvatars[0]?.name || "大师");
      }

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
          const nextAvatar = roundAvatars[i + 1] || newMessages[i + 1];
          setTypingAvatar(nextAvatar?.name || nextAvatar?.avatarName || null);
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
    setIsPublic(false);
    setFollowUp("");
    setIsGenerating(false);
    setTypingAvatar(null);
    setActiveAvatars([]);
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
          {/* Hot Public Sessions */}
          {publicSessions && publicSessions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold">热门论道</span>
              </div>
              <div className="space-y-2">
                {publicSessions.slice(0, 3).map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    className="w-full text-left px-3.5 py-3 rounded-xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 dark:from-orange-900/15 dark:to-amber-900/15 border border-orange-500/10 hover:border-orange-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium truncate">{s.topic}</p>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5 flex-shrink-0 bg-orange-500/10 text-orange-600 border-0">
                        <Flame className="w-2.5 h-2.5 mr-0.5" /> 热
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {s.participantCount || 1}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" /> {s.messageCount || 0}</span>
                      <span>{s.creatorNickname}</span>
                      <span>{new Date(s.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hero */}
          <div className="text-center py-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg mb-4">
              <MessagesSquare className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">向大师们提问</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              八位AI大师从不同角度为你解答，每次随机4-5位参与讨论
            </p>
          </div>

          {/* Avatar lineup — scrollable */}
          <div className="overflow-x-auto -mx-4 px-4 pb-1">
            <div className="flex gap-3 w-max">
              {Object.entries(AVATARS).map(([id, av]) => (
                <div key={id} className="flex flex-col items-center gap-1 w-14">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${av.bgGradient} flex items-center justify-center shadow-sm text-base`}>
                    {av.emoji}
                  </div>
                  <span className="text-[9px] text-muted-foreground font-medium text-center leading-tight">{av.name}</span>
                </div>
              ))}
            </div>
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

            {/* Public toggle */}
            <label className="flex items-center gap-2.5 px-1 cursor-pointer select-none">
              <div
                onClick={() => setIsPublic(!isPublic)}
                className={`relative w-9 h-5 rounded-full transition-colors ${isPublic ? 'bg-indigo-500' : 'bg-muted'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublic ? 'translate-x-4' : ''}`} />
              </div>
              <div className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs text-muted-foreground">公开论道（其他用户可加入讨论）</span>
              </div>
            </label>

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
