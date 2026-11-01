"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, useRouter } from "@/i18n/navigation";
import {
  getAdminIdentity,
  getAdminNavigation,
} from "@/lib/admin-navigation";
import { authClient } from "@/lib/auth-client";
import { righteous } from "@/web/fonts";
import { Logo } from "@/web/logo";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import {
  ChartNoAxesCombined,
  ChevronsUpDown,
  ExternalLink,
  House,
  LayoutDashboard,
  LogOut,
  Flag,
  Gauge,
  ShieldCheck,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

const navigationIcons = {
  dashboard: LayoutDashboard,
  users: Users,
  moderation: Flag,
  audit: ShieldCheck,
  quotas: Gauge,
  analytics: ChartNoAxesCombined,
} as const;

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const user = useQuery(api.auth.auth.getCurrentUser);
  const pendingPublicationCount = useQuery(
    api.publicationModeration.getPendingCount,
    {},
  );
  const identity = getAdminIdentity(user, t("sidebar.loadingUser"));
  const navigation = getAdminNavigation(
    process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_URL,
  );

  const handleLogOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        },
      },
    });
  };

  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r-0" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link
                href="/admin"
                onClick={closeMobileSidebar}
                className="transition hover:opacity-80"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo className="size-6 text-primary-foreground" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span
                    className={`${righteous.className} text-lg leading-none text-primary`}
                  >
                    Hallomada
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("panel")}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t("sidebar.navigation")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const Icon = navigationIcons[item.key];
                const title = t(`sidebar.${item.key}`);
                const isActive =
                  !item.external &&
                  (pathname.endsWith(item.href) ||
                    (item.href === "/admin" && pathname.endsWith("/admin")));
                const content = (
                  <>
                    <Icon className="size-4" />
                    <span>{title}</span>
                    {item.external ? (
                      <ExternalLink className="ml-auto size-3.5" />
                    ) : item.key === "moderation" &&
                      pendingPublicationCount !== undefined &&
                      pendingPublicationCount > 0 ? (
                      <span className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                        {pendingPublicationCount > 99
                          ? "99+"
                          : pendingPublicationCount}
                      </span>
                    ) : null}
                  </>
                );

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={title}
                      className={
                        isActive
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }
                    >
                      {item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          onClick={closeMobileSidebar}
                        >
                          {content}
                        </a>
                      ) : (
                        <Link href={item.href} onClick={closeMobileSidebar}>
                          {content}
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t("sidebar.returnSite")}>
              <Link href="/" onClick={closeMobileSidebar}>
                <House className="size-4" />
                <span>{t("sidebar.returnSite")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg bg-primary/20">
                    <AvatarImage src={identity.image} alt={identity.name} />
                    <AvatarFallback className="rounded-lg font-semibold text-primary">
                      {identity.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{identity.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {identity.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isMobile ? "bottom" : "right"}
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem disabled>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{identity.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {identity.email}
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogOut}
                  className="cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground focus:opacity-90"
                >
                  <LogOut className="mr-2 size-4" />
                  <span>{t("sidebar.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
