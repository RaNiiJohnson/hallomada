"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { runMutationWorkflow } from "@hallomada/shared/mutation-workflow";

function DeleteJobDialog({ jobId }: { jobId: Id<"JobOffer"> }) {
  const deleteJob = useMutation(api.jobs.mutations.deleteJob);
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const deleteInFlight = useRef(false);
  const t = useTranslations("jobs.dialogs.delete");

  const router = useRouter();
  async function handleDelete() {
    if (deleteInFlight.current) return;
    deleteInFlight.current = true;
    setIsPending(true);

    await runMutationWorkflow({
      mutation: () => deleteJob({ id: jobId }),
      onSuccess: () => {
        toast.success(t("successToast"));
        setOpen(false);
        router.push("/jobs");
      },
      onError: (error) => {
        toast.error(t("errorToast"), {
          description: error instanceof Error ? error.message : undefined,
        });
      },
    });

    deleteInFlight.current = false;
    setIsPending(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !isPending && setOpen(nextOpen)}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          <Trash className="size-4" />
          {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                {t("submiting")}
              </>
            ) : (
              <>
                <Trash className="size-4" /> {t("trigger")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteJobDialog;
