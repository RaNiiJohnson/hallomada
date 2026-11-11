"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import {
  getAuthHref,
  getLocalizedCallbackUrl,
} from "@/lib/auth-return-to";
import { Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

function generateStrongPassword(length = 16) {
  const sets = [
    "abcdefghijkmnopqrstuvwxyz",
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "23456789",
    "!@#$%^&*-_",
  ];
  const all = sets.join("");
  const rand = (max: number) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  };

  const chars = sets.map((s) => s[rand(s.length)]);
  while (chars.length < length) chars.push(all[rand(all.length)]);

  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function SignupForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("auth.register.form");
  const tToast = useTranslations("auth.register.toast");

  const SignupFormSchema = z
    .object({
      name: z.string().min(2, {
        message: t("nameError"),
      }),
      email: z.email({
        message: t("emailError"),
      }),
      password: z.string().min(8, {
        message: t("passwordError"),
      }),
      passwordConfirmation: z
        .string()
        .min(1, { message: t("confirmPasswordError") }),
    })
    .refine((data) => data.password === data.passwordConfirmation, {
      message: t("passwordMismatch"),
      path: ["passwordConfirmation"],
    });

  const form = useForm<z.infer<typeof SignupFormSchema>>({
    resolver: zodResolver(SignupFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirmation: "",
    },
  });
  const {
    formState: { isSubmitting },
  } = form;

  async function handleGeneratePassword() {
    const password = generateStrongPassword();
    form.setValue("password", password, { shouldValidate: true });
    form.setValue("passwordConfirmation", password, { shouldValidate: true });
    try {
      await navigator.clipboard.writeText(password);
      toast.success(t("passwordGenerated"));
    } catch {
      toast.success(t("passwordGeneratedNoCopy"));
    }
  }

  async function onSubmit(values: z.infer<typeof SignupFormSchema>) {
    await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
      callbackURL: getLocalizedCallbackUrl(locale, returnTo),
      fetchOptions: {
        onSuccess: () => {
          router.push(getAuthHref("/verify-email", returnTo));
        },
        onError: (error) => {
          toast.error(error ? error.error.message : tToast("error"));
        },
      },
    });
  }

  return (
    <div className="space-y-6">
      <GoogleButton label={t("googleSignUp")} returnTo={returnTo} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {t("orSeparator")}
          </span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("name")}</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    autoComplete="name"
                    placeholder={t("namePlaceholder")}
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("email")}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder={t("emailPlaceholder")}
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("password")}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      placeholder="••••••••••••••••"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="passwordConfirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("confirmPassword")}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      placeholder="••••••••••••••••"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <FormDescription>{t("passwordHint")}</FormDescription>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={handleGeneratePassword}
            >
              <Sparkles className="mr-1 h-4 w-4" />
              {t("generatePassword")}
            </Button>
          </div>

          <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {t("terms")}
          </p>
        </form>
      </Form>
    </div>
  );
}
