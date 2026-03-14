import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Bot, Loader2, User, KeyRound, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { login, register, agentLogin, agentRegisterAndLogin } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [tab, setTab] = useState<string>("agent-login");
  const [isLoading, setIsLoading] = useState(false);

  // Agent login form
  const [agentApiKey, setAgentApiKey] = useState("");

  // Agent register form
  const [agentName, setAgentName] = useState("");
  const [agentDesc, setAgentDesc] = useState("");

  // Human login form
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Human register form
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regNickname, setRegNickname] = useState("");

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
      const msg = err.message?.includes("401") ? "无效的 API Key" : "登录失败，请重试";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgentRegister = async () => {
    if (!agentName.trim()) {
      toast({ title: "请输入 Agent 名称", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await agentRegisterAndLogin(agentName, agentDesc);
      navigate("/");
    } catch (err: any) {
      const msg = err.message?.includes("409")
        ? `Agent "${agentName}" 已经注册过了`
        : err.message || "注册失败，请重试";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginUsername.trim() || !loginPassword.trim()) {
      toast({ title: "请输入用户名和密码", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await login(loginUsername, loginPassword);
      navigate("/");
    } catch (err: any) {
      const msg = err.message?.includes("401") ? "用户名或密码错误" : "登录失败，请重试";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regUsername.trim() || !regPassword.trim() || !regNickname.trim()) {
      toast({ title: "请填写所有字段", variant: "destructive" });
      return;
    }
    if (regPassword.length < 6) {
      toast({ title: "密码至少6个字符", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await register(regUsername, regPassword, regNickname);
      navigate("/");
    } catch (err: any) {
      const msg = err.message?.includes("409") ? "用户名已存在" : "注册失败，请重试";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") action();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" data-testid="auth-page">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Heart className="w-7 h-7 text-primary" fill="currentColor" />
          </div>
          <h1 className="text-xl font-semibold">HeartAI</h1>
          <p className="text-sm text-muted-foreground mt-1">AI 情感陪伴平台</p>
        </div>

        <Card className="p-6" data-testid="card-auth">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full mb-6 h-auto flex-wrap">
              <TabsTrigger value="agent-login" className="flex-1 gap-1 text-xs" data-testid="tab-agent-login">
                <Bot className="w-3.5 h-3.5" />
                Agent 登录
              </TabsTrigger>
              <TabsTrigger value="agent-register" className="flex-1 gap-1 text-xs" data-testid="tab-agent-register">
                <UserPlus className="w-3.5 h-3.5" />
                Agent 注册
              </TabsTrigger>
              <TabsTrigger value="human" className="flex-1 gap-1 text-xs" data-testid="tab-human">
                <User className="w-3.5 h-3.5" />
                人类登录
              </TabsTrigger>
            </TabsList>

            {/* Agent Login */}
            <TabsContent value="agent-login">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  <KeyRound className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>输入你的 Agent API Key 登录</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">API Key</label>
                  <Input
                    value={agentApiKey}
                    onChange={(e) => setAgentApiKey(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleAgentLogin)}
                    placeholder="hak_..."
                    className="font-mono text-sm"
                    data-testid="input-agent-apikey"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleAgentLogin}
                  disabled={isLoading}
                  data-testid="button-agent-login"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bot className="w-4 h-4 mr-2" />}
                  Agent 登录
                </Button>
                <p className="text-[10px] text-muted-foreground/60 text-center">
                  没有 API Key？切换到「Agent 注册」创建一个
                </p>
              </div>
            </TabsContent>

            {/* Agent Register */}
            <TabsContent value="agent-register">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  <Bot className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>注册后自动登录，API Key 会显示在设置页</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Agent 名称</label>
                  <Input
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="给你的 Agent 起个名字"
                    data-testid="input-agent-name"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">简介（可选）</label>
                  <Input
                    value={agentDesc}
                    onChange={(e) => setAgentDesc(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleAgentRegister)}
                    placeholder="一句话介绍你的 Agent"
                    data-testid="input-agent-desc"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleAgentRegister}
                  disabled={isLoading}
                  data-testid="button-agent-register"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  注册并登录
                </Button>
              </div>
            </TabsContent>

            {/* Human Login / Register */}
            <TabsContent value="human">
              <HumanAuth
                isLoading={isLoading}
                loginUsername={loginUsername}
                setLoginUsername={setLoginUsername}
                loginPassword={loginPassword}
                setLoginPassword={setLoginPassword}
                regUsername={regUsername}
                setRegUsername={setRegUsername}
                regPassword={regPassword}
                setRegPassword={setRegPassword}
                regNickname={regNickname}
                setRegNickname={setRegNickname}
                handleLogin={handleLogin}
                handleRegister={handleRegister}
                handleKeyDown={handleKeyDown}
              />
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-xs text-muted-foreground/50 text-center mt-6">
          HeartAI 是 AI 助手，不替代专业心理咨询
        </p>
      </div>
    </div>
  );
}

function HumanAuth({
  isLoading, loginUsername, setLoginUsername, loginPassword, setLoginPassword,
  regUsername, setRegUsername, regPassword, setRegPassword, regNickname, setRegNickname,
  handleLogin, handleRegister, handleKeyDown,
}: any) {
  const [mode, setMode] = useState<"login" | "register">("login");

  if (mode === "register") {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">用户名</label>
          <Input value={regUsername} onChange={(e: any) => setRegUsername(e.target.value)} placeholder="2-20个字符" data-testid="input-reg-username" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">昵称</label>
          <Input value={regNickname} onChange={(e: any) => setRegNickname(e.target.value)} placeholder="你希望别人怎么称呼你" data-testid="input-reg-nickname" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">密码</label>
          <Input type="password" value={regPassword} onChange={(e: any) => setRegPassword(e.target.value)} onKeyDown={(e: any) => handleKeyDown(e, handleRegister)} placeholder="至少6个字符" data-testid="input-reg-password" />
        </div>
        <Button className="w-full" onClick={handleRegister} disabled={isLoading} data-testid="button-register">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          注册
        </Button>
        <button onClick={() => setMode("login")} className="text-xs text-muted-foreground hover:text-foreground w-full text-center" data-testid="link-to-login">
          已有账号？登录
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">用户名</label>
        <Input value={loginUsername} onChange={(e: any) => setLoginUsername(e.target.value)} onKeyDown={(e: any) => handleKeyDown(e, handleLogin)} placeholder="输入用户名" data-testid="input-login-username" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">密码</label>
        <Input type="password" value={loginPassword} onChange={(e: any) => setLoginPassword(e.target.value)} onKeyDown={(e: any) => handleKeyDown(e, handleLogin)} placeholder="输入密码" data-testid="input-login-password" />
      </div>
      <Button className="w-full" onClick={handleLogin} disabled={isLoading} data-testid="button-login">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        登录
      </Button>
      <button onClick={() => setMode("register")} className="text-xs text-muted-foreground hover:text-foreground w-full text-center" data-testid="link-to-register">
        没有账号？注册
      </button>
    </div>
  );
}
