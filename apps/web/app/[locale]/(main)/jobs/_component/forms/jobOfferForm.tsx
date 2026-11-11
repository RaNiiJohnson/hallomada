"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getConvexErrorCode } from "@/lib/convex-error";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { JobFormFields } from "./job-form/job-form-fields";
import {
  createJobFormSchema,
  emptyJobFormValues,
  toJobMutationInput,
  type JobFormValues,
} from "./job-form/job-form-schema";

export {
  jobTypeValues,
  selectableContractTypes,
} from "@hallomada/shared/job-offer-options";
export { salaryPeriodValues } from "./job-form/job-form-schema";

export function JobOfferForm({ onSuccess }: { onSuccess?: () => void }) {
  const t = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const createJob = useMutation(api.jobs.mutations.createJob);
  const schema = useMemo(
    () => createJobFormSchema((key) => t(key as Parameters<typeof t>[0])),
    [t],
  );
  const form = useForm<JobFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyJobFormValues,
  });

  const onSubmit = async (data: JobFormValues) => {
    try {
      await createJob(toJobMutationInput(data));
      toast.success(t("form.messages.success"));
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error(
        getConvexErrorCode(error) === "LIMIT_REACHED"
          ? tCommon("limitReached")
          : t("form.messages.error"),
      );
    }
  };

  return (
    <form
      id="job-offer-form"
      className="space-y-6"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <JobFormFields form={form} />
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting
          ? t("form.actions.publishing")
          : t("form.actions.publish")}
      </Button>
    </form>
  );
}
