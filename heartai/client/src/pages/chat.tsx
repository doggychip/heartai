import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import type { Message, Conversation, ChatResponse } from "@shared/schema";

const EMOTION_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  joy: { label: "开心", emoji: "😊", color: "text-yellow-500" },
  sadness: { label: "难过", emoji: "😢", color: "text-blue-400" },
  anger: { label: "生气", emoji: "😤", color: "text-red-400" },
  fear: { label: "害怕", emoji: "😨", color: "text-purple-400" },
  anxiety: { label: "焦虑", emoji: "😰", color: "text-orange-400" },
  surprise: { label: "惊讶", emoji: "😮", color: "text-pink-400" },
  calm: { label: "平静", emoji: "🍃", color: "text-green-400" },
  neutral: { label: "平和", emoji: "😌", color: "text-gray-400" },
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3" data-testid="typing-indicator">
      <div className="w-2 h-2 rounded-full bg-primary/60 typing-dot" />
      <div className="w-2 h-2 rounded-full bg-primary/60 typing-dot" />
      <div className="w-2 h-2 rounded-full bg-primary/60 typing-dot" />
    </div>
  );
}

function EmotionBadge({ emotion, score }: { emotion: string; score: number }) {
  const info = EMOTION_LABELS[emotion] || EMOTION_LABELS.neutral;
  return (
    <Badge
      variant="secondary"
      className="gap-1 text-xs font-normal"
      data-testid={`emotion-badge-${emotion}`}
    >
      <span>{info.emoji}</span>
      <span>{info.label}</span>
      <span className="opacity-50">·</span>
      <span className="opacity-60">{score}/10</span>
    </Badge>
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
    setInputValue("");
    setSheetOpen(false);
  };

  const selectConversation = (id: string) => {
    setConversationId(id);
    setLocalMessages([]);
    setLastEmotion(null);
    setSheetOpen(false);
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
          </div>
          {lastEmotion && (
            <EmotionBadge emotion={lastEmotion.emotion} score={lastEmotion.score} />
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

        {/* Emotion suggestion bar */}
        {lastEmotion && lastEmotion.suggestion && (
          <div className="mx-auto max-w-2xl w-full px-3 sm:px-4">
            <div
              className="bg-primary/5 border border-primary/10 rounded-xl px-3 sm:px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-2"
              data-testid="text-emotion-suggestion"
            >
              <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{lastEmotion.suggestion}</span>
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
            HeartAI 是 AI 助手，不替代专业心理咨询。如遇紧急情况请拨打 400-161-9995
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
      <h1 className="text-lg sm:text-xl font-semibold mb-2">欢迎来到 HeartAI</h1>
      <p className="text-sm text-muted-foreground mb-6 sm:mb-8 text-center max-w-md">
        我是你的 AI 情感陪伴助手，在这里倾听你的心声。
      </p>
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
