import { CookieSettingsButton } from "@/components/analytics-consent";
import { Link } from "@/i18n/navigation";
import { SUPPORT_EMAIL } from "@/lib/site-config";
import { Mail, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";

async function getCurrentYear() {
  return new Date().getFullYear();
}

export default async function Footer() {
  const t = await getTranslations("footer");
  const currentYear = await getCurrentYear();
  return (
    <footer className="bg-muted/30 border-t mt-16">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo et description */}
          <div className="md:col-span-2">
            <Link
              href="/"
              className="text-2xl font-bold text-primary mb-4 block"
            >
              Hallomada
            </Link>
            <p className="text-muted-foreground mb-4 max-w-md">
              {t("description")}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t("tagline")}</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold mb-4">{t("nav.title")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/communities"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("nav.community")}
                </Link>
              </li>
              <li>
                <Link
                  href="/jobs"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("nav.opportunities")}
                </Link>
              </li>
              <li>
                <Link
                  href="/listing"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("nav.housing")}
                </Link>
              </li>
              <li>
                <Link
                  href="/providers"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("nav.providers")}
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("nav.pricing")}
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("nav.faq")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">{t("contact.title")}</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="hover:text-primary transition-colors"
                >
                  {SUPPORT_EMAIL}
                </a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{t("contact.location")}</span>
              </li>
            </ul>
          </div>
        </div>

        <nav
          aria-label={t("legal.legalTitle")}
          className="border-t mt-8 pt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
        >
            <Link href="/privacy" className="hover:text-primary transition-colors">
              {t("legal.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              {t("legal.terms")}
            </Link>
            <Link href="/legal-notice" className="hover:text-primary transition-colors">
              {t("legal.notice")}
            </Link>
            <Link href="/contact" className="hover:text-primary transition-colors">
              {t("legal.contact")}
            </Link>
          <CookieSettingsButton className="hover:text-primary transition-colors" />
        </nav>

        <div className="pt-6 text-center text-sm text-muted-foreground">
          <p>
            © {currentYear} Hallomada. {t("copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
