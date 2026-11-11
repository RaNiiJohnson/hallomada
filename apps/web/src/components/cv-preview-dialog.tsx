"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface CvPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cvUrl?: string | null;
}

export function CvPreviewDialog({
  isOpen,
  onOpenChange,
  cvUrl,
}: CvPreviewDialogProps) {
  const t = useTranslations("profile.cv");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {t.has("previewTitle") ? t("previewTitle") : "Aperçu du CV"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Aperçu du CV dans une fenêtre de dialogue.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 w-full bg-muted rounded-md overflow-hidden relative mt-2">
          {cvUrl ? (
            <iframe
              src={cvUrl}
              className="w-full h-full border-0"
              title="CV Preview"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
