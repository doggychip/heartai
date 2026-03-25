import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";

type PageWidth = "narrow" | "default" | "wide" | "full";
type PagePadding = "default" | "tight" | "none";

const widthClasses: Record<PageWidth, string> = {
  narrow: "max-w-xl mx-auto",
  default: "max-w-2xl mx-auto",
  wide: "max-w-4xl mx-auto",
  full: "w-full",
};

const paddingClasses: Record<PagePadding, string> = {
  default: "px-4 sm:px-6 py-6 sm:py-8",
  tight: "px-4 sm:px-6 py-3 sm:py-4",
  none: "",
};

interface PageContainerProps {
  children: React.ReactNode;
  width?: PageWidth;
  padding?: PagePadding;
  /** Sticky header rendered above the scrollable content */
  header?: React.ReactNode;
  className?: string;
}

export function PageContainer({
  children,
  width = "default",
  padding = "default",
  header,
  className,
}: PageContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollRestoration(scrollRef);

  if (header) {
    return (
      <div className="flex-1 flex flex-col min-h-0" ref={scrollRef}>
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className={cn(widthClasses[width], "px-4 sm:px-6 py-3")}>
            {header}
          </div>
        </div>
        {/* Scrollable content */}
        <div
          className={cn(
            widthClasses[width],
            paddingClasses[padding],
            className,
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        widthClasses[width],
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
