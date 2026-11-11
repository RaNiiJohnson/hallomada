"use client";

import { api } from "@convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { UserType } from "@convex/betterAuth/users";

export const profileStatusValues = [
  "active",
  "looking_for_job",
  "on_sabbatical",
  "inactive",
] as const;

function toStringArray(value?: string): string[] | undefined {
  const arr = (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return arr.length > 0 ? arr : undefined;
}

function buildDefaultValues(user: UserType) {
  return {
    name: user.name ?? "",
    headline: user.headline ?? "",
    city: user.city ?? "",
    country: user.country ?? "",
    // industry: user.industry ?? "",
    // company: user.company ?? "",
    field: user.field ?? "",
    bio: user.bio ?? "",
    skills: (user.skills ?? []).join(", "),
    roles: (user.roles ?? []).join(", "),
    journey: (user.journey ?? []).join(", "),
    experienceYears:
      user.experienceYears !== null && user.experienceYears !== undefined
        ? String(user.experienceYears)
        : "",
    status: (user.status ?? "active") as (typeof profileStatusValues)[number],
    isServiceProvider: !!user.isServiceProvider,
    isPublic: user.isPublic ?? true,
  };
}

interface ProfileEditFormProps {
  user: UserType;
  onSaved: () => void;
}

export function ProfileEditForm({ user, onSaved }: ProfileEditFormProps) {
  const t = useTranslations("profile");
  const updateUser = useMutation(api.auth.users.updateUser);

  const formSchema = z.object({
    name: z.string().min(1, t("editForm.validation.nameReq")),
    headline: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    // industry: z.string().optional(),
    // company: z.string().optional(),
    field: z.string().optional(),
    bio: z.string().max(500, t("editForm.validation.bioMax")).optional(),
    skills: z.string().optional(),
    roles: z.string().optional(),
    journey: z.string().optional(),
    experienceYears: z.string().optional(),
    status: z.enum(profileStatusValues),
    isServiceProvider: z.boolean(),
    isPublic: z.boolean(),
  });

  type FormSchema = z.infer<typeof formSchema>;

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(user),
  });

  const bioValue = useWatch({ control: form.control, name: "bio" }) ?? "";

  const onSubmit = async (data: FormSchema) => {
    try {
      await updateUser({
        patch: {
          name: data.name.trim(),
          headline: data.headline?.trim() || undefined,
          city: data.city?.trim() || undefined,
          country: data.country?.trim() || undefined,
          // industry: data.industry?.trim() || undefined,
          // company: data.company?.trim() || undefined,
          field: data.field?.trim() || undefined,
          bio: data.bio?.trim() || undefined,
          skills: toStringArray(data.skills),
          roles: toStringArray(data.roles),
          journey: toStringArray(data.journey),
          experienceYears: data.experienceYears
            ? Number(data.experienceYears)
            : undefined,
          status: data.status,
          isServiceProvider: data.isServiceProvider,
          isPublic: data.isPublic,
        },
      });
      toast.success(t("saveSuccess"));
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error(t("saveError"));
    }
  };

  const handleReset = () => {
    form.reset(buildDefaultValues(user));
  };

  return (
    <section className="bg-card lg:rounded-lg p-6 mt-4 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t("editForm.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("editForm.description")}
        </p>
      </div>

      <form
        id="profile-edit-form"
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
            e.preventDefault();
          }
        }}
      >
        <FieldGroup className="gap-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-name">
                    {t("editForm.name")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-name"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Field>
              <FieldLabel htmlFor="profile-email">
                {t("editForm.email")}
              </FieldLabel>
              <Input id="profile-email" value={user.email ?? ""} disabled />
            </Field>

            <Controller
              name="headline"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-headline">
                    {t("editForm.headline")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-headline"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="city"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-city">
                    {t("editForm.city")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-city"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="country"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-country">
                    {t("editForm.country")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-country"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* <Controller
              name="industry"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-industry">
                    {t("editForm.industry")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-industry"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="company"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-company">
                    {t("editForm.company")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-company"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            /> */}

            <Controller
              name="field"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-field">
                    {t("editForm.field")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-field"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="experienceYears"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-experience">
                    {t("editForm.experienceYears")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-experience"
                    type="number"
                    min={0}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="status"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-status">
                    {t("editForm.status")}
                  </FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="profile-status"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {t("status.active")}
                      </SelectItem>
                      <SelectItem value="looking_for_job">
                        {t("status.lookingForJob")}
                      </SelectItem>
                      <SelectItem value="on_sabbatical">
                        {t("status.onSabbatical")}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {t("status.inactive")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          <Controller
            name="bio"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="profile-bio">
                  {t("editForm.bio")}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({t("editForm.bioMaxHint")})
                  </span>
                </FieldLabel>
                <Textarea
                  {...field}
                  id="profile-bio"
                  maxLength={500}
                  rows={4}
                  aria-invalid={fieldState.invalid}
                  placeholder={t("editForm.bioPlaceholder")}
                />
                <FieldDescription className="text-right">
                  {bioValue.length}/500
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <Controller
              name="skills"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-skills">
                    {t("editForm.skills")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-skills"
                    aria-invalid={fieldState.invalid}
                    placeholder="Mixage, Composition, Piano"
                    autoComplete="off"
                  />
                  <FieldDescription>
                    {t("editForm.separatedByComma")}
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="roles"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="profile-roles">
                    {t("editForm.roles")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-roles"
                    aria-invalid={fieldState.invalid}
                    placeholder="Producteur, Ingénieur du son"
                    autoComplete="off"
                  />
                  <FieldDescription>
                    {t("editForm.separatedByComma")}
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="journey"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  className="sm:col-span-2"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel htmlFor="profile-journey">
                    {t("editForm.journey")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="profile-journey"
                    aria-invalid={fieldState.invalid}
                    placeholder="Débutant, Studio local, Label indépendant"
                    autoComplete="off"
                  />
                  <FieldDescription>
                    {t("editForm.stepsSeparatedByComma")}
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          <FieldGroup className="gap-3 pt-2 border-t">
            <Controller
              name="isServiceProvider"
              control={form.control}
              render={({ field }) => (
                <Field orientation="horizontal" className="py-2">
                  <div>
                    <p className="font-medium text-sm">
                      {t("editForm.isServiceProvider")}
                    </p>
                    <FieldDescription>
                      {t("editForm.isServiceProviderHint")}
                    </FieldDescription>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </Field>
              )}
            />

            <Controller
              name="isPublic"
              control={form.control}
              render={({ field }) => (
                <Field orientation="horizontal" className="py-2">
                  <div>
                    <p className="font-medium text-sm">
                      {t("editForm.isPublic")}
                    </p>
                    <FieldDescription>
                      {t("editForm.isPublicHint")}
                    </FieldDescription>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </Field>
              )}
            />

          </FieldGroup>
        </FieldGroup>
      </form>

      <Field orientation="horizontal" className="justify-end pt-4 border-t">
        <Button
          type="button"
          variant="ghost"
          onClick={handleReset}
          disabled={form.formState.isSubmitting}
        >
          <X className="size-4 mr-1.5" />
          {t("editForm.reset")}
        </Button>
        <Button
          type="submit"
          form="profile-edit-form"
          disabled={form.formState.isSubmitting}
        >
          <Check className="size-4 mr-1.5" />
          {form.formState.isSubmitting
            ? t("editForm.saving")
            : t("editForm.save")}
        </Button>
      </Field>
    </section>
  );
}
