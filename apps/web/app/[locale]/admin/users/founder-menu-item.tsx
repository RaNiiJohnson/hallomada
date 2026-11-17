"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { useMutation } from "convex/react";
import { Award } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

/** Give or remove the "Membre fondateur" badge by hand. */
export function FounderMenuItem({ userId, name }: { userId: string; name: string }) {
  const t = useTranslations("admin.users.founder");
  const founder = useQuery(api.founders.getFounder, { userId });
  const grant = useMutation(api.founders.grantFounder);
  const revoke = useMutation(api.founders.revokeFounder);

  const toggle = async () => {
    try {
      if (founder) {
        await revoke({ userId });
        toast.success(t("revoked", { name }));
      } else {
        await grant({ userId });
        toast.success(t("granted", { name }));
      }
    } catch {
      toast.error(t("error"));
    }
  };

  return (
    <DropdownMenuItem disabled={founder === undefined} onClick={() => void toggle()}>
      <Award className="size-4" />
      {founder ? t("revoke") : t("grant")}
    </DropdownMenuItem>
  );
}
