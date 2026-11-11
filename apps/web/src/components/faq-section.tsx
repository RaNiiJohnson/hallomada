import { getTranslations } from "next-intl/server";
import { FAQAccordion } from "./faq-accordion";

export async function FAQSection() {
  const t = await getTranslations("faq");
  const items = t.raw("items") as { question: string; answer: string }[];

  return (
    <section className="py-20">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:gap-16">
          <div className="md:w-1/3">
            <div className="sticky top-20">
              <h2 className="mt-4 text-3xl font-bold">{t("title")}</h2>
              <p className="text-muted-foreground mt-4">
                {t("description")} {t("support")} {" "}
                {t("descriptionEnd")}
              </p>
            </div>
          </div>
          <div className="md:w-2/3">
            <FAQAccordion items={items} />
          </div>
        </div>
      </div>
    </section>
  );
}
