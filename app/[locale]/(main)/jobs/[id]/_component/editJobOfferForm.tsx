"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { JobOfferDetails } from "@/lib/convexTypes";
import { runMutationWorkflow } from "@/lib/mutation-workflow";
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { JobFormFields } from "../../_component/forms/job-form/job-form-fields";
import {
  createJobFormSchema,
  toJobMutationInput,
  type JobFormValues,
} from "../../_component/forms/job-form/job-form-schema";

interface EditJobOfferFormProps {
  jobOffer: JobOfferDetails;
  onSuccess?: () => void;
}

export function EditJobOfferForm({ jobOffer, onSuccess }: EditJobOfferFormProps) {
  const t = useTranslations("jobs");
  const updateJob = useMutation(api.jobs.mutations.updateJob);
  const contact = useQuery(api.jobs.queries.getJobContactForEdit, {
    id: jobOffer._id,
  });
  const privateLocation = useQuery(api.jobs.queries.getJobLocationForEdit, {
    id: jobOffer._id,
  });
  const schema = useMemo(
    () => createJobFormSchema((key) => t(key as Parameters<typeof t>[0])),
    [t],
  );

  const form = useForm<JobFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: jobOffer.title,
      type: jobOffer.type as JobFormValues["type"],
      location: undefined,
      showMap: false,
      // Legacy offers may hold other values; the poster re-picks CDI or CDD.
      contractType:
        jobOffer.contractType === "CDI" || jobOffer.contractType === "CDD"
          ? jobOffer.contractType
          : undefined,
      workTime:
        jobOffer.workTime ??
        (jobOffer.contractType === "fullTime" ||
        jobOffer.contractType === "partTime"
          ? jobOffer.contractType
          : undefined),
      city: jobOffer.city,
      workMode: jobOffer.workMode ?? "onSite",
      remoteLocation: jobOffer.remoteLocation ?? "",
      duration: jobOffer.duration ?? "",
      startDate: jobOffer.startDate ?? "",
      applicationDeadline: jobOffer.applicationDeadline ?? "",
      company: jobOffer.company,
      description: jobOffer.description,
      certificates: (jobOffer.certificates ?? []).map((certificate) => ({
        certificate,
      })),
      salary: jobOffer.salary?.toString() ?? "",
      salaryPeriod: jobOffer.salaryPeriod,
      sector: jobOffer.sector ?? "",
      benefits: jobOffer.benefits ?? "",
      externalApplicationUrl: jobOffer.externalApplicationUrl ?? "",
      weeklyHours: jobOffer.weeklyHours?.toString() ?? "",
      trainingRequirements: jobOffer.trainingRequirements ?? "",
      contactEmail: "",
    },
  });

  useEffect(() => {
    if (contact) form.setValue("contactEmail", contact.email);
  }, [contact, form]);

  useEffect(() => {
    if (!privateLocation) return;
    const location = privateLocation.location ?? undefined;
    form.setValue("location", location);
    form.setValue("showMap", Boolean(location));
  }, [form, privateLocation]);

  async function onSubmit(data: JobFormValues) {
    const input = toJobMutationInput(data);
    await runMutationWorkflow({
      // `null` clears a previously stored location on update.
      mutation: () =>
        updateJob({ id: jobOffer._id, ...input, location: input.location ?? null }),
      onSuccess: () => {
        toast.success(t("form.messages.success"));
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(t("form.messages.error"), {
          description: error instanceof Error ? error.message : undefined,
        });
      },
    });
  }

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <JobFormFields form={form} />
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting
          ? t("form.actions.publishing")
          : t("form.actions.publish")}
      </Button>
    </form>
  );
}
