import { cn } from "@/lib/utils";

type PageWidth = "narrow" | "default" | "wide" | "full";

const widthClasses: Record<PageWidth, string> = {
  narrow: "max-w-xl mx-auto",
  default: "max-w-2xl mx-auto",
  wide: "max-w-4xl mx-auto",
  full: "w-full",
};

interface PageContainerProps {
  children: React.ReactNode;
  width?: PageWidth;
  className?: string;
}

export function PageContainer({
  children,
  width = "default",
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        widthClasses[width],
        "px-4 sm:px-6 py-6 sm:py-8",
        className
      )}
    >
      {children}
    </div>
  );
}
