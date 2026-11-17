"use client";

import { useConvexAuth } from "convex/react";
import { Users } from "lucide-react";

export function EmptyCommunities() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card/50 dark:bg-card/20 border border-dashed border-border rounded-2xl w-full max-w-4xl animate-in fade-in zoom-in duration-500 mx-auto">
      <div className="relative mb-6">
        <div className="absolute -inset-1 bg-linear-to-r from-primary/20 to-blue-500/20 rounded-full blur-xl opacity-50" />
        <div className="relative bg-background p-5 rounded-full border border-border shadow-sm">
          <Users className="w-10 h-10 text-primary" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-3">
        Aucune communauté pour le moment
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto leading-relaxed mb-8">
        Créez votre première communauté dès maintenant et commencez à rassembler
        des personnes partageant vos intérêts.{" "}
        {!isLoading && !isAuthenticated && "Connectez-vous dès maintenant."}
      </p>
    </div>
  );
}
