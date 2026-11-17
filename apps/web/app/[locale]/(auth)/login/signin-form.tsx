"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { getLocalizedCallbackUrl } from "@/lib/auth-return-to";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

export function SigninForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("auth.login.form");
  const tToast = useTranslations("auth.login.toast");

  const SignInFormSchema = z.object({
    email: z.email({
      message: t("emailError"),
    }),
    password: z.string().min(8, {
      message: t("passwordError"),
    }),
    rememberMe: z.boolean().optional(),
  });

  const form = useForm<z.infer<typeof SignInFormSchema>>({
    resolver: zodResolver(SignInFormSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });
  const {
    formState: { isSubmitting },
  } = form;

  async function onSubmit(values: z.infer<typeof SignInFormSchema>) {
    await authClient.signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: values.rememberMe,
      callbackURL: getLocalizedCallbackUrl(locale, returnTo),
      fetchOptions: {
        onSuccess: () => {
          toast.success(tToast("success"));
          router.replace(returnTo);
        },
        onError: (error) => {
          toast.error(error ? error.error.message : tToast("error"));
        },
      },
    });
  }

  return (
    <div className="space-y-6">
      <GoogleButton label={t("googleSignIn")} returnTo={returnTo} />

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
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>{t("password")}</FormLabel>
                  <Link
                    className="text-sm text-primary hover:underline"
                    href="/forgot-password"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput
                    autoComplete="current-password"
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
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>{t("rememberMe")}</FormLabel>
              </FormItem>
            )}
          />

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
        </form>
      </Form>
    </div>
  );
}
