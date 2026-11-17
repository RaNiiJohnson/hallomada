import { Link } from "@/i18n/navigation";
import { ArrowRightIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { FAQAccordion } from "./faq-accordion";

/**
 * The FAQ. Pass `limit` to show only the first questions (the home page),
 * followed by a link to the full /faq page.
 */
export async function FAQSection({ limit }: { limit?: number } = {}) {
  const t = await getTranslations("faq");
  const allItems = t.raw("items") as { question: string; answer: string }[];
  const items = limit ? allItems.slice(0, limit) : allItems;
  const hasMore = items.length < allItems.length;

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
            {hasMore && (
              <Link
                href="/faq"
                className="group mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {t("seeAll")}
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
