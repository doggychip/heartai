import { useState, useRef, useCallback, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Share2, X, Loader2 } from "lucide-react";
import { captureCard, captureCardBlob, downloadImage } from "./share-utils";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  shareText?: string;
  children: ReactNode;
}

export function ShareModal({ isOpen, onClose, filename, shareText, children }: ShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!cardRef.current || saving) return;
    setSaving(true);
    try {
      const dataUrl = await captureCard(cardRef.current);
      downloadImage(dataUrl, `${filename}.png`);
      toast({ title: "\u5df2\u4fdd\u5b58", description: "\u56fe\u7247\u5df2\u4e0b\u8f7d\u5230\u672c\u5730" });
    } catch {
      toast({ title: "\u4fdd\u5b58\u5931\u8d25", description: "\u8bf7\u91cd\u8bd5", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [filename, saving, toast]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const blob = await captureCardBlob(cardRef.current);
      if (blob && navigator.share) {
        const file = new File([blob], `${filename}.png`, { type: "image/png" });
        await navigator.share({
          title: shareText || "\u89c2\u661f GuanXing",
          text: shareText,
          files: [file],
        });
      } else {
        // Fallback to download
        const dataUrl = await captureCard(cardRef.current);
        downloadImage(dataUrl, `${filename}.png`);
        toast({ title: "\u5df2\u4fdd\u5b58", description: "\u56fe\u7247\u5df2\u4e0b\u8f7d\u5230\u672c\u5730" });
      }
    } catch {
      // User cancelled share or error — try download
      try {
        const dataUrl = await captureCard(cardRef.current!);
        downloadImage(dataUrl, `${filename}.png`);
        toast({ title: "\u5df2\u4fdd\u5b58", description: "\u56fe\u7247\u5df2\u4e0b\u8f7d\u5230\u672c\u5730" });
      } catch {
        toast({ title: "\u5206\u4eab\u5931\u8d25", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }, [filename, shareText, toast]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="relative max-w-sm w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Card preview - scrollable */}
        <div className="overflow-y-auto rounded-xl" style={{ maxHeight: "72vh" }}>
          <div ref={cardRef}>
            {children}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-1.5" />
            )}
            {"\u4fdd\u5b58\u56fe\u7247"}
          </Button>
          <Button
            variant="outline"
            className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={handleShare}
            disabled={saving}
          >
            <Share2 className="w-4 h-4 mr-1.5" />
            {"\u5206\u4eab"}
          </Button>
        </div>
      </div>
    </div>
  );
}
