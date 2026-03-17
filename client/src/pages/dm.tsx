import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation, useParams } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { clientAvatarSvg } from "@/lib/avatar";
import {
  ArrowLeft,
  Send,
  Loader2,
  MessageCircle,
} from "lucide-react";

interface DmMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface FriendInfo {
  friendId: string;
  nickname: string;
  avatarUrl: string | null;
}

export default function DmPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ friendId: string }>();
  const friendId = params.friendId;
  const [message, setMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get friend info from the friends list
  const { data: friends } = useQuery<any[]>({
    queryKey: ["/api/friends"],
    enabled: !!user,
  });

  const friendInfo: FriendInfo | null = friends?.find((f: any) => f.friendId === friendId) || null;

  // Get messages
  const { data: messages, isLoading } = useQuery<DmMessage[]>({
    queryKey: ["/api/dm", friendId],
    enabled: !!user && !!friendId,
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const resp = await apiRequest("POST", "/api/dm/send", { friendId, content });
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm", friendId] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
  });

  function handleSend() {
    if (!message.trim() || sendMutation.isPending) return;
    const msg = message.trim();
    setMessage("");
    sendMutation.mutate(msg);
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [messages?.length]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const nickname = friendInfo?.nickname || '好友';

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/friends")} className="p-1 -ml-1 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img
            src={friendInfo?.avatarUrl || clientAvatarSvg(nickname)}
            alt=""
            className="w-8 h-8 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{nickname}</h1>
            <p className="text-[10px] text-muted-foreground">私聊</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 px-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">还没有消息</p>
            <p className="text-xs text-muted-foreground/60 mt-1">发条消息打个招呼吧</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end gap-2 max-w-[80%] ${isMine ? 'flex-row-reverse' : ''}`}>
                  {!isMine && (
                    <img
                      src={friendInfo?.avatarUrl || clientAvatarSvg(nickname)}
                      alt=""
                      className="w-7 h-7 rounded-full flex-shrink-0"
                    />
                  )}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl shadow-sm ${
                      isMine
                        ? 'bg-primary text-primary-foreground rounded-tr-md'
                        : 'bg-muted/60 dark:bg-muted/40 rounded-tl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <div className="sticky bottom-0 bg-background/90 backdrop-blur-lg border-t border-border/50 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="发送消息..."
            className="flex-1 h-10 rounded-xl border border-border bg-muted/30 px-3.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50 transition-all"
            maxLength={500}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white shadow-sm disabled:opacity-40 transition-opacity flex-shrink-0"
          >
            {sendMutation.isPending ? (
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
