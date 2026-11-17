"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
// Privacy controls are intentionally paused while every community is public.
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
import { api } from "@convex/_generated/api";
import { ConvexError } from "convex/values";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// const privacyValues = ["public", "private", "secret"] as const;

interface CreateCommunityFormProps {
  onSuccess?: () => void;
}

export function CreateCommunityForm({ onSuccess }: CreateCommunityFormProps) {
  const router = useRouter();
  const createCommunity = useMutation(
    api.communities.mutations.createCommunity,
  );
  const t = useTranslations("communities.forms.createCommunity");

  const formSchema = z.object({
    name: z.string().min(3, t("errorNameMin")).max(60, t("errorNameMax")),
    description: z
      .string()
      .min(10, t("errorDescMin"))
      .max(200, t("errorDescMax")),
    kind: z.enum(["city", "theme"]),
    focus: z.string().trim().min(2, t("errorFocusMin")).max(60, t("errorFocusMax")),
    rules: z.string().max(1000, t("errorRulesMax")),
    // privacy: z.enum(privacyValues),
  });

  type FormSchema = z.infer<typeof formSchema>;

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      kind: "theme",
      focus: "",
      rules: "",
      // privacy: "public",
    },
  });

  const kind = useWatch({ control: form.control, name: "kind" });

  const onSubmit = async (data: FormSchema) => {
    try {
      const { slug } = await createCommunity({
        name: data.name,
        description: data.description,
        ...(data.kind === "city"
          ? { city: data.focus }
          : { theme: data.focus }),
        ...(data.rules.trim() ? { rules: data.rules } : {}),
      });
      toast.success(t("successToast"));
      form.reset();
      onSuccess?.();
      router.push(`/communities/${slug}`);
    } catch (error) {
      const code =
        error instanceof ConvexError && typeof error.data === "object"
          ? (error.data as { code?: string }).code
          : undefined;
      toast.error(code === "LIMIT_REACHED" ? t("errorQuota") : t("errorToast"));
    }
  };

  return (
    <div className="space-y-6">
      <form
        id="create-community-form"
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
            e.preventDefault();
          }
        }}
      >
        <FieldGroup className="space-y-4">
          {/* Nom */}
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="community-name">
                  {t("nameLabel")}
                </FieldLabel>
                <Input
                  {...field}
                  id="community-name"
                  aria-invalid={fieldState.invalid}
                  placeholder={t("namePlaceholder")}
                  autoComplete="off"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Description */}
          <Controller
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="community-description">
                  {t("descLabel")}
                </FieldLabel>
                <InputGroup>
                  <InputGroupTextarea
                    {...field}
                    id="community-description"
                    placeholder={t("descPlaceholder")}
                    rows={4}
                    className="min-h-24 resize-none"
                    aria-invalid={fieldState.invalid}
                  />
                  <InputGroupAddon align="block-end">
                    <InputGroupText className="tabular-nums">
                      {field.value.length} {t("characters")}
                    </InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Ville ou thème */}
          <div className="grid grid-cols-[9rem_1fr] gap-3">
            <Controller
              name="kind"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="community-kind">
                    {t("kindLabel")}
                  </FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="community-kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="theme">{t("kindTheme")}</SelectItem>
                      <SelectItem value="city">{t("kindCity")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              name="focus"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="community-focus">
                    {kind === "city"
                      ? t("cityLabel")
                      : t("themeLabel")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="community-focus"
                    aria-invalid={fieldState.invalid}
                    placeholder={
                      kind === "city"
                        ? t("cityPlaceholder")
                        : t("themePlaceholder")
                    }
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          {/* Règles */}
          <Controller
            name="rules"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="community-rules">
                  {t("rulesLabel")}
                </FieldLabel>
                <InputGroup>
                  <InputGroupTextarea
                    {...field}
                    id="community-rules"
                    placeholder={t("rulesPlaceholder")}
                    rows={3}
                    className="min-h-20 resize-none"
                    aria-invalid={fieldState.invalid}
                  />
                </InputGroup>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/*
            Privacy controls are paused until private and secret communities
            receive complete server-side access rules.
          */}
        </FieldGroup>
      </form>

      {/* Submit */}
      <Button
        type="button"
        onClick={form.handleSubmit(onSubmit)}
        disabled={form.formState.isSubmitting}
        className="w-full"
      >
        {form.formState.isSubmitting ? t("submiting") : t("submit")}
      </Button>
    </div>
  );
}
