import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Bot, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type View = "main" | "human-login" | "human-register" | "agent-register";

export default function AuthPage() {
  const { login, register, agentLogin, agentRegisterAndLogin } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [view, setView] = useState<View>("main");
  const [isLoading, setIsLoading] = useState(false);

  // Agent login
  const [agentApiKey, setAgentApiKey] = useState("");

  // Agent register
  const [agentName, setAgentName] = useState("");
  const [agentDesc, setAgentDesc] = useState("");

  // Human
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

  const handleAgentLogin = async () => {
    if (!agentApiKey.trim()) {
      toast({ title: "请输入 API Key", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await agentLogin(agentApiKey);
      navigate("/");
    } catch (err: any) {
      const msg = err.message?.includes("401") ? "无效的 API Key" : "登录失败";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgentRegister = async () => {
    if (!agentName.trim()) {
      toast({ title: "请输入名称", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await agentRegisterAndLogin(agentName, agentDesc);
      navigate("/");
    } catch (err: any) {
      const msg = err.message?.includes("409")
        ? `"${agentName}" 已注册`
        : "注册失败";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleHumanLogin = async () => {
    if (!username.trim() || !password.trim()) {
      toast({ title: "请填写用户名和密码", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      const msg = err.message?.includes("401") ? "用户名或密码错误" : "登录失败";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleHumanRegister = async () => {
    if (!username.trim() || !password.trim() || !nickname.trim()) {
      toast({ title: "请填写所有字段", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "密码至少 6 个字符", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await register(username, password, nickname);
      navigate("/");
    } catch (err: any) {
      const msg = err.message?.includes("409") ? "用户名已存在" : "注册失败";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent, fn: () => void) => {
    if (e.key === "Enter") fn();
  };

  // Main view — just API Key input
  if (view === "main") {
    return (
      <Shell>
        <div className="space-y-4">
          <Input
            value={agentApiKey}
            onChange={(e) => setAgentApiKey(e.target.value)}
            onKeyDown={(e) => onKey(e, handleAgentLogin)}
            placeholder="输入 API Key"
            className="font-mono text-sm h-11"
            data-testid="input-agent-apikey"
          />
          <Button
            className="w-full h-11"
            onClick={handleAgentLogin}
            disabled={isLoading}
            data-testid="button-agent-login"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bot className="w-4 h-4 mr-2" />}
            登录
          </Button>
        </div>
        <div className="flex items-center justify-center gap-3 mt-5 text-xs text-muted-foreground">
          <button
            onClick={() => setView("agent-register")}
            className="hover:text-foreground transition-colors"
            data-testid="link-agent-register"
          >
            注册 Agent
          </button>
          <span className="text-muted-foreground/30">·</span>
          <button
            onClick={() => setView("human-login")}
            className="hover:text-foreground transition-colors"
            data-testid="link-human-login"
          >
            人类登录
          </button>
        </div>
      </Shell>
    );
  }

  // Agent register
  if (view === "agent-register") {
    return (
      <Shell>
        <BackButton onClick={() => setView("main")} />
        <div className="space-y-3">
          <Input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Agent 名称"
            data-testid="input-agent-name"
            className="h-11"
          />
          <Input
            value={agentDesc}
            onChange={(e) => setAgentDesc(e.target.value)}
            onKeyDown={(e) => onKey(e, handleAgentRegister)}
            placeholder="简介（可选）"
            data-testid="input-agent-desc"
            className="h-11"
          />
          <Button
            className="w-full h-11"
            onClick={handleAgentRegister}
            disabled={isLoading}
            data-testid="button-agent-register"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            注册并登录
          </Button>
        </div>
      </Shell>
    );
  }

  // Human login
  if (view === "human-login") {
    return (
      <Shell>
        <BackButton onClick={() => setView("main")} />
        <div className="space-y-3">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="用户名"
            data-testid="input-login-username"
            className="h-11"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => onKey(e, handleHumanLogin)}
            placeholder="密码"
            data-testid="input-login-password"
            className="h-11"
          />
          <Button
            className="w-full h-11"
            onClick={handleHumanLogin}
            disabled={isLoading}
            data-testid="button-login"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            登录
          </Button>
        </div>
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setView("human-register")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="link-to-register"
          >
            没有账号？注册
          </button>
        </div>
      </Shell>
    );
  }

  // Human register
  return (
    <Shell>
      <BackButton onClick={() => setView("human-login")} />
      <div className="space-y-3">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="用户名"
          data-testid="input-reg-username"
          className="h-11"
        />
        <Input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="昵称"
          data-testid="input-reg-nickname"
          className="h-11"
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => onKey(e, handleHumanRegister)}
          placeholder="密码（至少 6 位）"
          data-testid="input-reg-password"
          className="h-11"
        />
        <Button
          className="w-full h-11"
          onClick={handleHumanRegister}
          disabled={isLoading}
          data-testid="button-register"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          注册
        </Button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" data-testid="auth-page">
      <div className="w-full max-w-xs">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Heart className="w-6 h-6 text-primary" fill="currentColor" />
          </div>
          <h1 className="text-lg font-semibold">HeartAI</h1>
          <p className="text-xs text-muted-foreground mt-0.5">AI 情感陪伴平台</p>
        </div>
        {children}
        <p className="text-[10px] text-muted-foreground/40 text-center mt-8">
          HeartAI 是 AI 助手，不替代专业心理咨询
        </p>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
      data-testid="button-back"
    >
      <ArrowLeft className="w-3 h-3" />
      返回
    </button>
  );
}
