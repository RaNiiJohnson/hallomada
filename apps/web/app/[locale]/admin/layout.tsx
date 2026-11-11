import { AdminSidebar } from "@/components/admin-sidebar";
import LocaleSwitcher from "@/components/locale-switcher";
import { NotificationWidget } from "@/components/notificationBell";
import { ThemeToggle } from "@/components/theme-toggle";
import { WidgetProvider } from "@/components/WidgetContext";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Locale } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminGuard } from "./AdminGuard";

export default async function AdminLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("admin");

  return (
    <AdminGuard>
      <WidgetProvider>
        <SidebarProvider>
          <AdminSidebar />
          <SidebarInset
            className="min-w-0 w-0 bg-background text-foreground"
            style={{ overflowX: "clip" }}
          >
            {/* Sticky top bar */}
            <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 bg-background/80 backdrop-blur-md px-4 justify-between border-b border-border/40">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <h1 className="text-sm font-semibold tracking-wide ml-2 hidden sm:block">
                  {t("panel")}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <NotificationWidget placement="navbar" />
                <LocaleSwitcher />
                <ThemeToggle />
              </div>
            </header>

            <main className="min-h-screen min-w-0 w-full flex-1 p-4 md:p-6">
              <TooltipProvider>{children}</TooltipProvider>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </WidgetProvider>
    </AdminGuard>
  );
}
