import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [tab, setTab] = useState<string>("login");
  const [isLoading, setIsLoading] = useState(false);

  // Login form
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regNickname, setRegNickname] = useState("");

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
            <TabsList className="w-full mb-6">
              <TabsTrigger value="login" className="flex-1" data-testid="tab-login">
                登录
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1" data-testid="tab-register">
                注册
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">用户名</label>
                  <Input
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleLogin)}
                    placeholder="输入用户名"
                    autoComplete="username"
                    data-testid="input-login-username"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">密码</label>
                  <Input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleLogin)}
                    placeholder="输入密码"
                    autoComplete="current-password"
                    data-testid="input-login-password"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleLogin}
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  登录
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="register">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">用户名</label>
                  <Input
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="2-20个字符"
                    autoComplete="username"
                    data-testid="input-reg-username"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">昵称</label>
                  <Input
                    value={regNickname}
                    onChange={(e) => setRegNickname(e.target.value)}
                    placeholder="你希望别人怎么称呼你"
                    data-testid="input-reg-nickname"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">密码</label>
                  <Input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleRegister)}
                    placeholder="至少6个字符"
                    autoComplete="new-password"
                    data-testid="input-reg-password"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleRegister}
                  disabled={isLoading}
                  data-testid="button-register"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  注册
                </Button>
              </div>
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
