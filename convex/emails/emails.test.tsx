import { render } from "react-email";
import { describe, expect, it } from "vitest";
import { localeFromAuthUrl, toEmailLocale } from "./strings";
import {
  ApplicationFailedEmail,
  ApplicationSentEmail,
  NewApplicationEmail,
  RentalFileReceivedEmail,
  SearchAlertEmail,
  ResetPasswordEmail,
  VerifyEmail,
} from "./templates";

describe("email locale", () => {
  it("reads the locale from the auth callbackURL", () => {
    expect(
      localeFromAuthUrl(
        "https://x.convex.site/api/auth/verify?token=a&callbackURL=%2Fde%2Fme",
      ),
    ).toBe("de");
    expect(
      localeFromAuthUrl("https://x.convex.site/api/auth/verify?token=a"),
    ).toBe("en");
    expect(
      localeFromAuthUrl(
        "https://x.convex.site/verify?callbackURL=%2Ffrance",
      ),
    ).toBe("en");
  });

  it("falls back to English for unknown locales", () => {
    expect(toEmailLocale("fr")).toBe("fr");
    expect(toEmailLocale("es")).toBe("en");
    expect(toEmailLocale(undefined)).toBe("en");
  });
});

describe("auth emails", () => {
  it("renders the password reset email in the requested language", async () => {
    const html = await render(
      <ResetPasswordEmail
        locale="de"
        name="Ada"
        url="https://hallomada.de/reset?token=t"
      />,
    );
    expect(html).toContain('lang="de"');
    expect(html).toContain("Neues Passwort festlegen");
    expect(html).toContain("https://hallomada.de/email-logo.png");
  });

  it("escapes user-controlled names and link attributes", async () => {
    const html = await render(
      <VerifyEmail
        locale="fr"
        name={'<img src=x onerror="alert(1)">'}
        url={'https://hallomada.de/verify?next="profile"&source=email'}
      />,
    );
    expect(html).toContain('lang="fr"');
    expect(html).not.toContain('<img src=x onerror="alert(1)">');
    expect(html).toContain("&lt;img src=x");
    expect(html).not.toContain('next="profile"');
  });
});

describe("job application emails", () => {
  it("renders the recruiter notification in German", async () => {
    const html = await render(
      <NewApplicationEmail
        candidateName="Ada Lovelace"
        candidateEmail="ada@example.com"
        jobTitle="Softwareentwicklerin"
        coverLetter="Guten Tag"
        cvUrl="https://files.example.com/cv.pdf"
      />,
    );
    expect(html).toContain('lang="de"');
    expect(html).toContain("Neue Bewerbung");
    expect(html).toContain("Lebenslauf öffnen");
    expect(html).toContain("https://files.example.com/cv.pdf");
    expect(html).toContain("Guten Tag");
    expect(html).not.toContain("Hervorgehobene Bewerbung");
  });

  it("marks a Premium candidate's application as highlighted", async () => {
    const html = await render(
      <NewApplicationEmail
        candidateName="Ada Lovelace"
        candidateEmail="ada@example.com"
        jobTitle="Softwareentwicklerin"
        cvUrl="https://files.example.com/cv.pdf"
        highlight={{
          city: "Berlin",
          profileUrl: "https://hallomada.de/de/hl/ada",
          isFounder: true,
        }}
      />,
    );
    expect(html).toContain("Hervorgehobene Bewerbung");
    expect(html).toContain("Gründungsmitglied");
    expect(html).toContain("Berlin");
    expect(html).toContain("https://hallomada.de/de/hl/ada");
  });

  it("sends the landlord a private link to the rental dossier", async () => {
    const html = await render(
      <RentalFileReceivedEmail
        candidateName="Rova"
        candidateEmail="rova@example.com"
        listingTitle="Zimmer in Berlin"
        message="Guten Tag"
        dossierUrl="https://hallomada.de/de/dossier/abc"
        highlighted
      />,
    );
    expect(html).toContain("Neue Mieterbewerbung");
    expect(html).toContain("Hervorgehobene Bewerbung");
    expect(html).toContain("https://hallomada.de/de/dossier/abc");
    expect(html).toContain("Guten Tag");
  });

  it("renders the alert email for a new listing", async () => {
    const html = await render(
      <SearchAlertEmail
        locale="fr"
        name="Ada"
        kind="listing"
        title="Chambre à Berlin"
        details="Berlin · 450 €"
        url="https://hallomada.de/fr/listing/chambre"
        manageUrl="https://hallomada.de/fr/me?tab=alerts"
      />,
    );
    expect(html).toContain("Nouvelle annonce pour vous");
    expect(html).toContain("Chambre à Berlin");
    expect(html).toContain("Gérer mes alertes");
  });

  it("confirms a sent application to the candidate in their language", async () => {
    const html = await render(
      <ApplicationSentEmail
        locale="fr"
        name="Ada"
        jobTitle="Développeuse"
        company="Acme"
        jobUrl="https://hallomada.de/fr/jobs/developpeuse"
      />,
    );
    expect(html).toContain('lang="fr"');
    expect(html).toContain("Candidature envoyée");
    expect(html).toContain("Acme");
    expect(html).toContain("https://hallomada.de/fr/jobs/developpeuse");
  });

  it("tells the candidate when an application could not be sent", async () => {
    const html = await render(
      <ApplicationFailedEmail
        locale="en"
        name="Ada"
        jobTitle="Developer"
        jobUrl="https://hallomada.de/en/jobs/developer"
        reason="technical"
      />,
    );
    expect(html).toContain("Resend my application");
    expect(html).toContain("https://hallomada.de/en/jobs/developer");
  });

  it("explains a bounced recruiter address to the candidate", async () => {
    const html = await render(
      <ApplicationFailedEmail
        locale="de"
        name="Ada"
        jobTitle="Entwicklerin"
        jobUrl="https://hallomada.de/de/jobs/entwicklerin"
        reason="bounced"
      />,
    );
    expect(html).toContain("Kontaktadresse");
    expect(html).toContain("Arbeitgeber informiert");
  });
});
