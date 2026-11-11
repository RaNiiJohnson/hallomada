"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
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
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreatePostFormProps {
  communityId?: Id<"communities">;
  communityName?: string;
  onSuccess?: () => void;
}

export function CreatePostForm({
  communityId,
  communityName,
  onSuccess,
}: CreatePostFormProps) {
  const createPost = useMutation(api.posts.mutations.createPost);
  const myCommunities = useQuery(
    api.communities.queries.getMyCommunitiesForPosting,
  );
  const t = useTranslations("communities.forms.createPost");

  const formSchema = z.object({
    title: z.string().min(3, t("errorTitleMin")).max(100, t("errorTitleMax")),
    content: z.string().min(10, t("errorContentMin")),
    destination: z.string(),
  });

  type FormSchema = z.infer<typeof formSchema>;

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      destination: communityId ?? "public",
    },
  });

  const onSubmit = async (data: FormSchema) => {
    try {
      const result = await createPost({
        title: data.title,
        content: data.content,
        communityId:
          data.destination === "public"
            ? undefined
            : (data.destination as Id<"communities">),
      });

      if (
        typeof result === "object" &&
        result !== null &&
        "retryAfter" in result
      ) {
        const seconds = Math.ceil(result.retryAfter / 1000);
        toast.error(t("errorRateLimit", { seconds }));
        return;
      }

      toast.success(t("successToast"));
      form.reset();
      onSuccess?.();
    } catch {
      toast.error(t("errorToast"));
    }
  };

  return (
    <div className="space-y-6">
      <form
        id="create-post-form"
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
            e.preventDefault();
          }
        }}
      >
        <FieldGroup className="space-y-4">
          {communityId ? (
            <Field>
              <FieldLabel>{t("destinationLabel")}</FieldLabel>
              <p className="text-sm text-muted-foreground">
                {communityName ?? t("communityDestination")}
              </p>
            </Field>
          ) : (
            <Controller
              name="destination"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="post-destination">
                    {t("destinationLabel")}
                  </FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="post-destination">
                      <SelectValue placeholder={t("destinationPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        {t("publicDestination")}
                      </SelectItem>
                      {myCommunities?.map((community) => (
                        <SelectItem key={community._id} value={community._id}>
                          {community.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("destinationHelp")}
                  </p>
                </Field>
              )}
            />
          )}

          {/* Titre */}
          <Controller
            name="title"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="post-title">{t("titleLabel")}</FieldLabel>
                <Input
                  {...field}
                  id="post-title"
                  aria-invalid={fieldState.invalid}
                  placeholder={t("titlePlaceholder")}
                  autoComplete="off"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Contenu */}
          <Controller
            name="content"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="post-content">
                  {t("contentLabel")}
                </FieldLabel>
                <InputGroup>
                  <InputGroupTextarea
                    {...field}
                    id="post-content"
                    placeholder={t("contentPlaceholder")}
                    rows={5}
                    className="min-h-32 resize-none"
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
        </FieldGroup>
      </form>

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
