import type { ReactElement } from "react";
import { render } from "react-email";
import { type ActionCtx } from "./_generated/server";
import { EMAIL_FROM } from "./emails/layout";
import {
  localeFromAuthUrl,
  resetPasswordStrings,
  verifyEmailStrings,
} from "./emails/strings";
import { ResetPasswordEmail, VerifyEmail } from "./emails/templates";
import { resend } from "./sendEmails";

/** Renders a React Email template (HTML + plain text) and queues it. */
export async function sendTemplateEmail(
  ctx: ActionCtx,
  {
    to,
    subject,
    email,
    replyTo,
  }: {
    to: string;
    subject: string;
    email: ReactElement;
    replyTo?: string[];
  },
) {
  const [html, text] = await Promise.all([
    render(email),
    render(email, { plainText: true }),
  ]);
  return await resend.sendEmail(ctx, {
    from: EMAIL_FROM,
    to,
    subject,
    html,
    text,
    replyTo,
  });
}

type AuthEmailArgs = { to: string; url: string; name?: string | null };

export const sendEmailVerification = async (
  ctx: ActionCtx,
  { to, url, name }: AuthEmailArgs,
) => {
  const locale = localeFromAuthUrl(url);
  await sendTemplateEmail(ctx, {
    to,
    subject: verifyEmailStrings[locale].subject,
    email: <VerifyEmail locale={locale} name={name || to} url={url} />,
  });
};

export const sendResetPasswordEmail = async (
  ctx: ActionCtx,
  { to, url, name }: AuthEmailArgs,
) => {
  const locale = localeFromAuthUrl(url);
  await sendTemplateEmail(ctx, {
    to,
    subject: resetPasswordStrings[locale].subject,
    email: <ResetPasswordEmail locale={locale} name={name || to} url={url} />,
  });
};
