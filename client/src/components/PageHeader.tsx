import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  icon?: LucideIcon;
  /** Override default icon classes (default: "w-5 h-5 text-primary") */
  iconClassName?: string;
  title: string;
  description?: string;
  /** Action buttons rendered on the right side */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  iconClassName,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 mb-6", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {Icon && <Icon className={cn("w-5 h-5 text-primary flex-shrink-0", iconClassName)} />}
          <h1 className="text-lg sm:text-xl font-semibold">{title}</h1>
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex-shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}
