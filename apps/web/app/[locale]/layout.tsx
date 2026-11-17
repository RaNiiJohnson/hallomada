import { OfflineIndicator } from "@/components/offline-indicator";
import { ThemeProvider } from "@/components/theme-provider";
import { Locale, routing } from "@/i18n/routing";
import { getToken } from "@/lib/auth-server";
import { ConvexClientProvider } from "@/web/ConvexClientProvider";
import "flag-icons/css/flag-icons.min.css";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });

  return {
    metadataBase: new URL("https://hallomada.de"),
    title: {
      default: t("metaTitle"),
      template: "%s | Hallomada",
    },
    description: t("metaDescription"),
    openGraph: {
      siteName: "Hallomada",
    },
  };
}
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const messages = await getMessages();
  const token = await getToken();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ConvexClientProvider initialToken={token}>
              <OfflineIndicator />
              <NuqsAdapter>{children}</NuqsAdapter>
            </ConvexClientProvider>
            <Toaster closeButton richColors />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
