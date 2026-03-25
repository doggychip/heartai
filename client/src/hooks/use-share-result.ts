import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type ResultType = "fortune" | "tarot" | "bazi" | "compatibility";

/**
 * Hook to create shareable links for results.
 * Returns a function that posts the result to the server and copies
 * the share URL to the clipboard.
 */
export function useShareResult() {
  const { toast } = useToast();
  const [sharing, setSharing] = useState(false);

  const createShareLink = useCallback(
    async (resultType: ResultType, resultData: unknown): Promise<string | null> => {
      if (sharing) return null;
      setSharing(true);
      try {
        const res = await apiRequest("POST", "/api/share", {
          resultType,
          resultData,
        });
        const { id } = await res.json();
        const url = `${window.location.origin}${window.location.pathname}#/share/${id}`;

        // Copy to clipboard
        try {
          await navigator.clipboard.writeText(url);
          toast({ title: "链接已复制", description: "分享链接已复制到剪贴板" });
        } catch {
          // Fallback: show the URL
          toast({ title: "分享链接", description: url });
        }

        return url;
      } catch {
        toast({ title: "创建分享链接失败", variant: "destructive" });
        return null;
      } finally {
        setSharing(false);
      }
    },
    [sharing, toast],
  );

  return { createShareLink, sharing };
}
