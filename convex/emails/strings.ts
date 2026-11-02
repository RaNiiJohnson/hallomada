export type EmailLocale = "fr" | "en" | "de";

export const EMAIL_LOCALES: readonly EmailLocale[] = ["fr", "en", "de"];

export function toEmailLocale(value: string | null | undefined): EmailLocale {
  return EMAIL_LOCALES.includes(value as EmailLocale)
    ? (value as EmailLocale)
    : "en";
}

/** Reads the locale prefix (`/fr/...`) of the callbackURL in an auth link. */
export function localeFromAuthUrl(url: string): EmailLocale {
  const callbackURL = new URL(url).searchParams.get("callbackURL") ?? "/";
  return toEmailLocale(callbackURL.match(/^\/(fr|en|de)(?:\/|$)/)?.[1]);
}

type Shared = {
  hello: (name: string) => string;
  fallbackLink: string;
  footer: string;
};

export const shared: Record<EmailLocale, Shared> = {
  fr: {
    hello: (name) => `Bonjour ${name},`,
    fallbackLink: "Le bouton ne fonctionne pas ? Copiez ce lien :",
    footer: "Hallomada, la communauté malgache en Allemagne.",
  },
  en: {
    hello: (name) => `Hi ${name},`,
    fallbackLink: "Button not working? Copy this link:",
    footer: "Hallomada, the Malagasy community in Germany.",
  },
  de: {
    hello: (name) => `Hallo ${name},`,
    fallbackLink: "Der Button funktioniert nicht? Kopieren Sie diesen Link:",
    footer: "Hallomada, die madagassische Community in Deutschland.",
  },
};

export const verifyEmailStrings = {
  fr: {
    subject: "Confirmez votre adresse e-mail",
    preview: "Un clic et votre compte Hallomada est actif.",
    title: "Confirmez votre adresse e-mail",
    body: "Il ne reste qu'une étape pour activer votre compte.",
    button: "Confirmer mon adresse",
    note: "Le lien expire dans 24 heures. Vous n'avez pas créé de compte ? Ignorez cet e-mail.",
  },
  en: {
    subject: "Confirm your email address",
    preview: "One click and your Hallomada account is ready.",
    title: "Confirm your email address",
    body: "One last step to activate your account.",
    button: "Confirm my email",
    note: "This link expires in 24 hours. Didn't sign up? Just ignore this email.",
  },
  de: {
    subject: "Bestätigen Sie Ihre E-Mail-Adresse",
    preview: "Ein Klick und Ihr Hallomada-Konto ist aktiv.",
    title: "E-Mail-Adresse bestätigen",
    body: "Nur noch ein Schritt, dann ist Ihr Konto aktiv.",
    button: "E-Mail bestätigen",
    note: "Der Link ist 24 Stunden gültig. Sie haben sich nicht registriert? Dann ignorieren Sie diese E-Mail.",
  },
} satisfies Record<EmailLocale, Record<string, string>>;

export const resetPasswordStrings = {
  fr: {
    subject: "Réinitialisez votre mot de passe",
    preview: "Choisissez un nouveau mot de passe pour votre compte.",
    title: "Nouveau mot de passe",
    body: "Vous avez demandé à changer le mot de passe de votre compte Hallomada.",
    button: "Choisir un nouveau mot de passe",
    note: "Le lien expire dans 1 heure. Si la demande ne vient pas de vous, ignorez cet e-mail : votre mot de passe ne change pas.",
  },
  en: {
    subject: "Reset your password",
    preview: "Choose a new password for your account.",
    title: "New password",
    body: "You asked to change the password of your Hallomada account.",
    button: "Choose a new password",
    note: "This link expires in 1 hour. If you didn't ask for this, ignore this email: your password stays the same.",
  },
  de: {
    subject: "Passwort zurücksetzen",
    preview: "Legen Sie ein neues Passwort für Ihr Konto fest.",
    title: "Neues Passwort",
    body: "Sie möchten das Passwort Ihres Hallomada-Kontos ändern.",
    button: "Neues Passwort festlegen",
    note: "Der Link ist 1 Stunde gültig. Falls Sie das nicht angefordert haben, ignorieren Sie diese E-Mail. Ihr Passwort bleibt unverändert.",
  },
} satisfies Record<EmailLocale, Record<string, string>>;

type ApplicationSentStrings = {
  subject: (job: string) => string;
  preview: (job: string) => string;
  title: string;
  body: (job: string, company: string) => [string, string, string, string];
  next: string;
  button: string;
};

export const applicationSentStrings: Record<EmailLocale, ApplicationSentStrings> = {
  fr: {
    subject: (job) => `Candidature envoyée : ${job}`,
    preview: (job) => `Le recruteur a bien reçu votre candidature pour ${job}.`,
    title: "Candidature envoyée",
    body: (job, company) => [
      "Votre candidature pour ",
      job,
      ` chez ${company}`,
      " a bien été transmise au recruteur.",
    ],
    next: "Si votre profil l'intéresse, le recruteur vous contactera directement à cette adresse e-mail.",
    button: "Voir l'offre",
  },
  en: {
    subject: (job) => `Application sent: ${job}`,
    preview: (job) => `The recruiter has received your application for ${job}.`,
    title: "Application sent",
    body: (job, company) => [
      "Your application for ",
      job,
      ` at ${company}`,
      " has been forwarded to the recruiter.",
    ],
    next: "If they're interested, they'll contact you directly at this email address.",
    button: "View the job",
  },
  de: {
    subject: (job) => `Bewerbung gesendet: ${job}`,
    preview: (job) => `Ihre Bewerbung für ${job} ist beim Arbeitgeber angekommen.`,
    title: "Bewerbung gesendet",
    body: (job, company) => [
      "Ihre Bewerbung für ",
      job,
      ` bei ${company}`,
      " wurde an den Arbeitgeber weitergeleitet.",
    ],
    next: "Bei Interesse meldet sich der Arbeitgeber direkt unter dieser E-Mail-Adresse bei Ihnen.",
    button: "Stelle ansehen",
  },
};

type ApplicationFailedStrings = {
  subject: (job: string) => string;
  preview: string;
  title: string;
  body: (job: string) => [string, string, string];
  retry: string;
  button: string;
};

export const applicationFailedStrings: Record<EmailLocale, ApplicationFailedStrings> = {
  fr: {
    subject: (job) => `Candidature non envoyée : ${job}`,
    preview: "Le recruteur n'a pas reçu votre candidature. Vous pouvez la renvoyer.",
    title: "Votre candidature n'est pas partie",
    body: (job) => [
      "Un problème technique a bloqué l'envoi de votre candidature pour ",
      job,
      ". Le recruteur ne l'a pas reçue.",
    ],
    retry: "Vous pouvez la renvoyer depuis la page de l'offre, sans tout remplir à nouveau.",
    button: "Renvoyer ma candidature",
  },
  en: {
    subject: (job) => `Application not sent: ${job}`,
    preview: "The recruiter didn't receive your application. You can send it again.",
    title: "Your application didn't go through",
    body: (job) => [
      "A technical problem stopped your application for ",
      job,
      " from being sent. The recruiter hasn't received it.",
    ],
    retry: "You can resend it from the job page without filling everything in again.",
    button: "Resend my application",
  },
  de: {
    subject: (job) => `Bewerbung nicht gesendet: ${job}`,
    preview: "Ihre Bewerbung ist nicht angekommen. Sie können sie erneut senden.",
    title: "Ihre Bewerbung wurde nicht gesendet",
    body: (job) => [
      "Wegen eines technischen Problems konnte Ihre Bewerbung für ",
      job,
      " nicht gesendet werden. Der Arbeitgeber hat sie nicht erhalten.",
    ],
    retry: "Sie können sie auf der Stellenseite erneut senden, ohne alles neu auszufüllen.",
    button: "Bewerbung erneut senden",
  },
};
