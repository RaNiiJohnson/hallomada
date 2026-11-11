"use client";

import LocaleSwitcher from "@/components/locale-switcher";
import { NotificationWidget } from "@/components/notificationBell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { getAccountNavigation } from "@/lib/navigation-routes";
import { righteous } from "@/web/fonts";
import { Logo } from "@/web/logo";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import {
  ArrowRight,
  Briefcase,
  Building,
  ChevronDown,
  Home,
  LogOut,
  Menu,
  PanelsTopLeft,
  Shield,
  Store,
  User,
  Users,
} from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useTranslations } from "next-intl";
import * as React from "react";

const navItems = [
  { key: "home" as const, url: "/", icon: Home },
  { key: "communities" as const, url: "/communities", icon: Users },
  { key: "opportunities" as const, url: "/jobs", icon: Briefcase },
  { key: "housing" as const, url: "/listing", icon: Building },
  { key: "providers" as const, url: "/providers", icon: Store },
];

function isActivePath(pathname: string, url: string) {
  if (url === "/") return pathname === "/";
  return pathname === url || pathname.startsWith(`${url}/`);
}

export function MainNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useQuery(api.auth.auth.getCurrentUser);
  const myCommunities = useQuery(api.communities.queries.getMyCommunities);
  const topCommunities = useQuery(api.communities.queries.getTopCommunities);
  const t = useTranslations("sidebar");
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    // At the very top, always show it. Otherwise: scrolling down hides it,
    // scrolling up — even by a single pixel — brings it back immediately.
    setHidden(latest > 0 && latest > previous);
  });

  const communities = user ? myCommunities : topCommunities;
  const communityList = (communities ?? []).filter(
    (community): community is NonNullable<typeof community> => !!community,
  );

  const handleLogOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          setMobileOpen(false);
          router.push("/login");
        },
      },
    });
  };

  return (
    <motion.header
      variants={{ visible: { y: 0 }, hidden: { y: "-100%" } }}
      animate={hidden && !mobileOpen ? "hidden" : "visible"}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 transition hover:opacity-80"
        >
          <Logo className="size-7" />
          {/* Wordmark only from xl: between lg and xl the nav links and the
              auth buttons need the room, or they overlap. */}
          <span
            className={`${righteous.className} hidden xl:block text-lg leading-none text-primary`}
          >
            Hallomada
          </span>
        </Link>

        <nav className="hidden min-w-0 items-center lg:ml-6 lg:flex xl:ml-10">
          <NavigationMenu viewport={false}>
            <NavigationMenuList className="gap-0.5">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.url);

                if (item.url === "/communities") {
                  return (
                    <CommunitiesMenu
                      key={item.url}
                      label={t("nav.communities")}
                      exploreLabel={t("communities.explore")}
                      communities={communityList}
                      pathname={pathname}
                      active={active}
                    />
                  );
                }

                return (
                  <NavigationMenuItem key={item.url}>
                    <NavigationMenuLink asChild>
                      <Link
                        href={item.url}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
                            : "text-muted-foreground hover:bg-transparent hover:text-foreground",
                        )}
                      >
                        {t(`nav.${item.key}`)}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        {/* Right side — one clear order: dashboard, language, theme, account */}
        <div className="ml-auto flex shrink-0 items-center gap-3 pl-3">
          <Authenticated>
            {user?.role === "admin" && (
              <Link
                href="/admin"
                target="_blank"
                className="hidden items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
              >
                <Shield className="size-4" />
                <span className="hidden xl:inline">{t("admin.dashboard")}</span>
              </Link>
            )}
            <NotificationWidget placement="navbar" />
          </Authenticated>

          <div className="hidden lg:block">
            <AuthControls user={user} t={t} onLogOut={handleLogOut} />
          </div>
          <Unauthenticated>
            <Button variant="default" className="lg:hidden block" size="sm">
              <Link href="/login">{t("auth.login")}</Link>
            </Button>
          </Unauthenticated>
          <div className="flex items-center sm:gap-2 gap-1 lg:flex">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-[min(100%,20rem)] p-0">
          <SheetHeader className="border-b border-border px-4 py-4">
            <SheetTitle className="flex items-center gap-2">
              <Logo className="size-7" />
              <span className={`${righteous.className} text-primary`}>
                Hallomada
              </span>
            </SheetTitle>
            <SheetDescription className="sr-only">
              {navItems.map((item) => t(`nav.${item.key}`)).join(", ")}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
            <nav className="flex flex-col gap-1">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.url);
                return (
                  <React.Fragment key={item.url}>
                    <Link
                      href={item.url}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {t(`nav.${item.key}`)}
                    </Link>
                    {index === 0 && (
                      <Authenticated>
                        <Link
                          href="/me"
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                            isActivePath(pathname, "/me")
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <PanelsTopLeft className="size-4" />
                          {t("auth.account")}
                        </Link>
                      </Authenticated>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>

            <p className="mt-6 mb-2 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t("communities.label")}
            </p>
            <div className="flex flex-col gap-1">
              {communities === undefined ? (
                <>
                  <Skeleton className="h-9 w-full rounded-xl" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </>
              ) : (
                communityList.map((community) => (
                  <Link
                    key={community._id}
                    href={`/communities/${community.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      pathname === `/communities/${community.slug}`
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
                      {community.name?.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{community.name}</span>
                  </Link>
                ))
              )}
              <Link
                href="/communities/explore"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {t("communities.explore")}
              </Link>
            </div>

            <Authenticated>
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  target="_blank"
                  onClick={() => setMobileOpen(false)}
                  className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Shield className="size-4" />
                  {t("admin.dashboard")}
                </Link>
              )}
            </Authenticated>
          </div>

          <div className="border-t border-border p-3">
            <AuthControls
              user={user}
              t={t}
              onLogOut={handleLogOut}
              onNavigate={() => setMobileOpen(false)}
              stacked
            />
          </div>
        </SheetContent>
      </Sheet>
    </motion.header>
  );
}

function CommunitiesMenu({
  label,
  exploreLabel,
  communities,
  pathname,
  active,
}: {
  label: string;
  exploreLabel: string;
  communities: { _id: string; slug: string; name: string }[];
  pathname: string;
  active: boolean;
}) {
  return (
    <NavigationMenuItem>
      <DropdownMenu>
        <div
          className={cn(
            "inline-flex items-center rounded-full transition-colors",
            active
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {/* Click the label → go straight to /communities */}
          <Link
            href="/communities"
            className="inline-flex items-center rounded-full py-1.5 pr-1 pl-3 text-sm font-medium"
          >
            {label}
          </Link>
          {/* Click the chevron → open the panel, no navigation */}
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group mr-1 inline-flex size-6 items-center justify-center rounded-full hover:bg-accent"
              aria-label={label}
            >
              <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>
        </div>
        <DropdownMenuContent align="center" className="w-72 p-3 mt-1">
          <div className="mb-1 flex items-center justify-between px-1 py-1">
            <span className="text-sm font-semibold text-foreground">
              {label}
            </span>
            <Link
              href="/communities"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={exploreLabel}
            >
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="flex flex-col gap-0.5">
            {communities.length === 0 ? (
              <DropdownMenuItem asChild>
                <Link href="/communities/explore">{exploreLabel}</Link>
              </DropdownMenuItem>
            ) : (
              communities.map((community) => (
                <DropdownMenuItem key={community._id} asChild>
                  <Link
                    href={`/communities/${community.slug}`}
                    className={cn(
                      "flex items-center gap-2.5",
                      pathname === `/communities/${community.slug}` &&
                        "bg-accent",
                    )}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
                      {community.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate font-medium">
                      {community.name}
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))
            )}
          </div>

          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/communities/explore" className="text-muted-foreground">
              {exploreLabel}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </NavigationMenuItem>
  );
}

function AuthControls({
  user,
  t,
  onLogOut,
  onNavigate,
  stacked = false,
}: {
  user:
    | {
        image?: string | null;
        name?: string | null;
        email?: string | null;
        slug?: string | null;
      }
    | null
    | undefined;
  t: (key: string) => string;
  onLogOut: () => void;
  onNavigate?: () => void;
  stacked?: boolean;
}) {
  return (
    <>
      <AuthLoading>
        <div className={cn("flex items-center gap-2", stacked && "w-full")}>
          <Skeleton className="size-9 rounded-full" />
          {stacked && <Skeleton className="h-9 flex-1 rounded-full" />}
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div
          className={cn(
            "flex items-center gap-2",
            stacked && "w-full flex-col",
          )}
        >
          <Button
            variant="ghost"
            size={stacked ? "default" : "sm"}
            className={cn(stacked && "w-full")}
            asChild
          >
            <Link href="/login" onClick={onNavigate}>
              {t("auth.login")}
            </Link>
          </Button>
          <Button
            size={stacked ? "default" : "sm"}
            className={cn(stacked && "w-full", "rounded-full")}
            asChild
          >
            <Link href="/register" onClick={onNavigate}>
              {t("auth.register")}
            </Link>
          </Button>
        </div>
      </Unauthenticated>
      <Authenticated>
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "size-9 rounded-full p-0",
                  stacked && "w-full justify-start gap-2 rounded-xl px-2",
                )}
              >
                <Avatar className="size-8">
                  <AvatarImage src={user.image || ""} alt={user.name || ""} />
                  <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                {stacked && (
                  <span className="truncate text-sm font-medium">
                    {user.name}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {getAccountNavigation(user.slug).map((item) => (
                <DropdownMenuItem asChild key={item.key}>
                  <Link
                    href={item.href}
                    className="cursor-pointer"
                    onClick={onNavigate}
                  >
                    <User className="size-4" />
                    {t(`auth.${item.key}`)}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onLogOut}
                className="cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground"
              >
                <LogOut className="size-4" />
                {t("auth.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </Authenticated>
    </>
  );
}
