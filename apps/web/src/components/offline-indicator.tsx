"use client";

import { useConvexConnectionState } from "convex/react";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";

export function OfflineIndicator() {
  const { isWebSocketConnected } = useConvexConnectionState();
  const [showIndicator, setShowIndicator] = useState(false);
  const t = useTranslations("common");

  // Hide instantly when connected, rather than waiting for an effect
  // to avoid the "cascading renders" error.
  if (isWebSocketConnected && showIndicator) {
    setShowIndicator(false);
  }

  useEffect(() => {
    // Add a small delay before showing the offline indicator to avoid flickering
    // during fast reconnects
    let timeoutId: NodeJS.Timeout;

    if (!isWebSocketConnected) {
      timeoutId = setTimeout(() => {
        setShowIndicator(true);
      }, 1500); // 1.5 seconds delay
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isWebSocketConnected]);

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-100 flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-full shadow-lg text-sm font-medium border border-destructive-foreground/20 backdrop-blur-md"
        >
          <WifiOff className="h-4 w-4" />
          <span>{t("checkConnection")}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
