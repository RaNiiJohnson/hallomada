"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, Loader2, MailIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

function ForgotPasswordContent() {
  const t = useTranslations("auth.forgotPassword");
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const locale = useLocale();

  const ForgotPasswordSchema = z.object({
    email: z.email({ message: t("form.emailError") }),
  });

  const form = useForm<z.infer<typeof ForgotPasswordSchema>>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const {
    formState: { isSubmitting },
  } = form;

  async function onSubmit(values: z.infer<typeof ForgotPasswordSchema>) {
    await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: `/${locale}/reset-password`,
      fetchOptions: {
        onSuccess: () => {
          setSentEmail(values.email);
          setSent(true);
        },
        onError: (error) => {
          toast.error(error?.error?.message ?? t("toast.error"));
        },
      },
    });
  }

  if (sent) {
    return (
      <div>
        <Button variant="outline" className="absolute top-4 left-4">
          <Link href="/login" className="flex items-center">
            <ArrowLeftIcon className="mr-2 h-4 w-4" /> {t("back")}
          </Link>
        </Button>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl border-0">
            <CardHeader className="space-y-4 pb-6 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <MailIcon className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl font-bold">
                  {t("sent.title")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("sent.subtitle")}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="rounded-lg bg-muted p-4 text-sm font-medium">
                {sentEmail}
              </div>
              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                <p>{t("sent.spamNote")}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("sent.noEmail")}{" "}
                <button
                  onClick={() => setSent(false)}
                  className="font-medium text-primary hover:underline"
                >
                  {t("sent.retry")}
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Button variant="outline" className="absolute top-4 left-4">
        <Link href="/login" className="flex items-center">
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> {t("back")}
        </Link>
      </Button>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="space-y-4 pb-8 text-center">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.email")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t("form.emailPlaceholder")}
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t("form.submitting")}
                    </>
                  ) : (
                    t("form.submit")
                  )}
                </Button>
              </form>
            </Form>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t("rememberPassword")}{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:underline"
                >
                  {t("login")}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordContent />;
}
