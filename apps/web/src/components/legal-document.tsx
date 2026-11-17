import { SUPPORT_EMAIL } from "@/lib/site-config";
import { getTranslations } from "next-intl/server";

type Page = "privacy" | "terms" | "notice" | "contact";

type LegalSection = { h: string; p?: string | string[]; items?: string[] };

export async function LegalDocument({ page }: { page: Page }) {
  const t = await getTranslations("legal");
  const sections =
    page === "contact" ? [] : (t.raw(`${page}.sections`) as LegalSection[]);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-bold">{t(`${page}.title`)}</h1>
      <p
        role="note"
        className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
      >
        {t("provisional")}
      </p>
      {page === "contact" ? (
        <section className="space-y-3">
          <p>{t("contact.intro")}</p>
          <p>
            <span className="font-semibold">{t("contact.emailLabel")} : </span>
            <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p className="text-sm text-muted-foreground">
            {t("contact.responseTime")}
          </p>
        </section>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t("updated")}</p>
          {sections.map((section, i) => (
            <section key={i} className="space-y-2">
              <h2 className="text-xl font-semibold">{section.h}</h2>
              {(Array.isArray(section.p) ? section.p : section.p ? [section.p] : []).map(
                (paragraph, j) => (
                  <p key={j}>{paragraph}</p>
                ),
              )}
              {section.items && (
                <ul className="list-disc space-y-1 pl-6">
                  {section.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </>
      )}
    </article>
  );
}
