import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Lock, UserPlus, LogIn, Sparkles } from "lucide-react";

interface FeatureGateProps {
  featureName: string;
  featureDescription: string;
  icon?: React.ReactNode;
}

/**
 * Interstitial shown to guests when they visit a gated feature page.
 * Instead of redirecting to login, this shows a nice "unlock this feature" screen.
 */
export default function FeatureGate({ featureName, featureDescription, icon }: FeatureGateProps) {
  const { logout } = useAuth();

  return (
    <div className="flex-1 flex items-center justify-center p-6" data-testid="feature-gate">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center mx-auto">
          {icon || <Lock className="w-8 h-8 text-indigo-400" />}
        </div>

        {/* Title */}
        <div>
          <h1 className="text-xl font-bold mb-2">解锁「{featureName}」</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{featureDescription}</p>
        </div>

        {/* Feature highlight */}
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-3">
          <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">免费注册即可使用</span>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3">
          <Link href="/auth">
            <Button
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              size="lg"
              onClick={() => logout()}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              免费注册
            </Button>
          </Link>
          <Link href="/auth">
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => logout()}>
              <LogIn className="w-4 h-4 mr-2" />
              已有账号？登录
            </Button>
          </Link>
        </div>

        {/* Back to home */}
        <Link href="/">
          <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            ← 返回首页
          </span>
        </Link>
      </div>
    </div>
  );
}
