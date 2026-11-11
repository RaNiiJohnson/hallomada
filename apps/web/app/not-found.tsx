import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Link from "next/link";
import "./globals.css";
export default function NotFoundPage() {
  const t = useTranslations("notFound");

  return (
    <div className="flex min-h-[70vh] items-center px-6 md:px-12">
      <div className="mx-auto w-full max-w-xl">
        <p
          aria-hidden
          className="font-bold leading-none tracking-tight text-foreground [font-variant-numeric:tabular-nums]"
          style={{ fontSize: "clamp(4.5rem, 12vw, 7.5rem)" }}
        >
          404
        </p>

        <svg
          viewBox="0 0 320 24"
          className="mt-2 h-4 w-full max-w-[240px] text-muted-foreground/60"
          aria-hidden
        >
          <line
            x1="0"
            y1="12"
            x2="140"
            y2="12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            className="notfound-draw"
            style={{ animationDelay: "0ms" }}
          />
          <circle
            cx="160"
            cy="12"
            r="4"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
          <line
            x1="180"
            y1="12"
            x2="320"
            y2="12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            className="notfound-draw"
            style={{ animationDelay: "150ms" }}
          />
        </svg>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-md text-base text-muted-foreground">
          {t("description")}
        </p>

        <Button asChild size="lg" className="mt-8">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>

      <style>{`
        .notfound-draw {
          stroke-dasharray: 6 6;
          stroke-dashoffset: 140;
          animation: notfound-path-draw 700ms ease-out forwards;
        }
        @keyframes notfound-path-draw {
          to { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .notfound-draw {
            animation: none;
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}
