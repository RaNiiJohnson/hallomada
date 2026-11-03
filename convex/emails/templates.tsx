import { Link } from "react-email";
import {
  CtaButton,
  EmailLayout,
  FallbackLink,
  Note,
  Paragraph,
  Quote,
  Strong,
  Title,
} from "./layout";
import {
  applicationFailedStrings,
  applicationSentStrings,
  resetPasswordStrings,
  searchAlertStrings,
  shared,
  verifyEmailStrings,
  type EmailLocale,
} from "./strings";

type AuthLinkEmailProps = { locale: EmailLocale; name: string; url: string };

export function VerifyEmail({ locale, name, url }: AuthLinkEmailProps) {
  const t = verifyEmailStrings[locale];
  const s = shared[locale];
  return (
    <EmailLayout lang={locale} preview={t.preview} footer={s.footer}>
      <Title>{t.title}</Title>
      <Paragraph>
        {s.hello(name)}
        <br />
        {t.body}
      </Paragraph>
      <CtaButton href={url}>{t.button}</CtaButton>
      <Note>{t.note}</Note>
      <FallbackLink label={s.fallbackLink} href={url} />
    </EmailLayout>
  );
}

export function ResetPasswordEmail({ locale, name, url }: AuthLinkEmailProps) {
  const t = resetPasswordStrings[locale];
  const s = shared[locale];
  return (
    <EmailLayout lang={locale} preview={t.preview} footer={s.footer}>
      <Title>{t.title}</Title>
      <Paragraph>
        {s.hello(name)}
        <br />
        {t.body}
      </Paragraph>
      <CtaButton href={url}>{t.button}</CtaButton>
      <Note>{t.note}</Note>
      <FallbackLink label={s.fallbackLink} href={url} />
    </EmailLayout>
  );
}

/** Sent to the recruiter. Recruiters are in Germany, so this one is German. */
export function NewApplicationEmail({
  candidateName,
  candidateEmail,
  jobTitle,
  coverLetter,
  cvUrl,
}: {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  coverLetter?: string;
  cvUrl: string;
}) {
  return (
    <EmailLayout
      lang="de"
      preview={`${candidateName} hat sich auf ${jobTitle} beworben.`}
      footer={shared.de.footer}
    >
      <Title>Neue Bewerbung</Title>
      <Paragraph>
        <Strong>{candidateName}</Strong> hat sich auf Ihre Stelle{" "}
        <Strong>{jobTitle}</Strong> beworben.
      </Paragraph>
      <CtaButton href={cvUrl}>Lebenslauf öffnen</CtaButton>
      <Paragraph>
        <Strong>Anschreiben</Strong>
      </Paragraph>
      {coverLetter ? (
        <Quote>{coverLetter}</Quote>
      ) : (
        <Paragraph>Kein Anschreiben beigefügt.</Paragraph>
      )}
      <Note>
        Antworten Sie einfach auf diese E-Mail, um{" "}
        {candidateName} unter{" "}
        <Link href={`mailto:${candidateEmail}`}>{candidateEmail}</Link> zu
        kontaktieren.
      </Note>
    </EmailLayout>
  );
}

type CandidateEmailProps = {
  locale: EmailLocale;
  name: string;
  jobTitle: string;
  jobUrl: string;
};

/** Sent to the candidate once the recruiter email has been handed off. */
export function ApplicationSentEmail({
  locale,
  name,
  jobTitle,
  company,
  jobUrl,
}: CandidateEmailProps & { company: string }) {
  const t = applicationSentStrings[locale];
  const s = shared[locale];
  const [before, job, at, after] = t.body(jobTitle, company);
  return (
    <EmailLayout lang={locale} preview={t.preview(jobTitle)} footer={s.footer}>
      <Title>{t.title}</Title>
      <Paragraph>
        {s.hello(name)}
        <br />
        {before}
        <Strong>{job}</Strong>
        {at}
        {after}
      </Paragraph>
      <Paragraph>{t.next}</Paragraph>
      <CtaButton href={jobUrl}>{t.button}</CtaButton>
    </EmailLayout>
  );
}

/**
 * Sent to the candidate when the recruiter email could not be sent
 * (`technical`) or was rejected by the recruiter's address (`bounced`).
 */
export function ApplicationFailedEmail({
  locale,
  name,
  jobTitle,
  jobUrl,
  reason,
}: CandidateEmailProps & { reason: "technical" | "bounced" }) {
  const t = applicationFailedStrings[locale];
  const s = shared[locale];
  const bounced = reason === "bounced";
  const [before, job, after] = (bounced ? t.bouncedBody : t.body)(jobTitle);
  return (
    <EmailLayout lang={locale} preview={t.preview} footer={s.footer}>
      <Title>{t.title}</Title>
      <Paragraph>
        {s.hello(name)}
        <br />
        {before}
        <Strong>{job}</Strong>
        {after}
      </Paragraph>
      <Paragraph>{bounced ? t.bouncedRetry : t.retry}</Paragraph>
      <CtaButton href={jobUrl}>{t.button}</CtaButton>
    </EmailLayout>
  );
}

/** Sent when a new publication matches one of the member's search alerts. */
export function SearchAlertEmail({
  locale,
  name,
  kind,
  title,
  details,
  url,
  manageUrl,
}: {
  locale: EmailLocale;
  name: string;
  kind: "listing" | "job";
  title: string;
  details: string;
  url: string;
  manageUrl: string;
}) {
  const t = searchAlertStrings[locale];
  const s = shared[locale];
  return (
    <EmailLayout lang={locale} preview={t.preview(kind)} footer={s.footer}>
      <Title>{t.title(kind)}</Title>
      <Paragraph>
        {s.hello(name)}
        <br />
        {t.intro(kind)}
      </Paragraph>
      <Paragraph>
        <Strong>{title}</Strong>
        <br />
        {details}
      </Paragraph>
      <CtaButton href={url}>{t.button(kind)}</CtaButton>
      <Note>
        {t.manage} <Link href={manageUrl}>{t.manageLink}</Link>
      </Note>
    </EmailLayout>
  );
}
