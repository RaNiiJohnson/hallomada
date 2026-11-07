"use client";

import { FounderBadge } from "@/components/founder-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { runMutationWorkflow } from "@/lib/mutation-workflow";
import { ALL_USER_TYPES, UserType } from "@/types/userType";
import { api } from "@convex/_generated/api";
import type { AdminUser } from "@convex/auth/admin";
import { useQuery } from "convex-helpers/react/cache";
import { useMutation } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { FounderMenuItem } from "./founder-menu-item";

type Role = "admin" | "user";
type SearchField = "name" | "email";
type FilterChoice =
  | "all"
  | "active"
  | "banned"
  | "role-user"
  | "role-admin"
  | "type-seeker"
  | "type-provider"
  | "type-admin";
type SortChoice = "newest" | "oldest" | "name" | "email";

const PAGE_SIZES = [10, 20, 50] as const;

function buildFilter(choice: FilterChoice) {
  switch (choice) {
    case "active":
      return { field: "banned", value: false } as const;
    case "banned":
      return { field: "banned", value: true } as const;
    case "role-user":
      return { field: "role", value: "user" } as const;
    case "role-admin":
      return { field: "role", value: "admin" } as const;
    case "type-seeker":
      return { field: "userType", value: "seeker" } as const;
    case "type-provider":
      return { field: "userType", value: "provider" } as const;
    case "type-admin":
      return { field: "userType", value: "admin" } as const;
    default:
      return undefined;
  }
}

function buildSort(choice: SortChoice) {
  switch (choice) {
    case "oldest":
      return { field: "createdAt", direction: "asc" } as const;
    case "name":
      return { field: "name", direction: "asc" } as const;
    case "email":
      return { field: "email", direction: "asc" } as const;
    default:
      return { field: "createdAt", direction: "desc" } as const;
  }
}

function UserRowsSkeleton() {
  return Array.from({ length: 5 }, (_, index) => (
    <tr key={index} className="border-b last:border-0">
      <td className="p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-2 h-3 w-44" />
      </td>
      {Array.from({ length: 5 }, (__, cellIndex) => (
        <td key={cellIndex} className="p-4">
          <Skeleton className="h-7 w-24" />
        </td>
      ))}
      <td className="p-4">
        <Skeleton className="ml-auto size-8" />
      </td>
    </tr>
  ));
}

export default function UsersPage() {
  const t = useTranslations("admin.users");
  const locale = useLocale();
  const currentUser = useQuery(api.auth.auth.getCurrentUser);
  const banUser = useMutation(api.auth.admin.banUser);
  const unbanUser = useMutation(api.auth.admin.unbanUser);
  const setUserRole = useMutation(api.auth.admin.setUserRole);
  const setUserType = useMutation(api.auth.admin.setUserType);
  const createUser = useMutation(api.auth.admin.createUser);

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [filterChoice, setFilterChoice] = useState<FilterChoice>("all");
  const [sortChoice, setSortChoice] = useState<SortChoice>("newest");
  const [limit, setLimit] = useState<(typeof PAGE_SIZES)[number]>(20);
  const [offset, setOffset] = useState(0);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const [confirmBan, setConfirmBan] = useState<AdminUser | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const queryArgs = useMemo(
    () => ({
      limit,
      offset,
      ...(debouncedSearch.trim()
        ? {
            search: {
              value: debouncedSearch.trim(),
              field: searchField,
              operator: "contains" as const,
            },
          }
        : {}),
      ...(buildFilter(filterChoice)
        ? { filter: buildFilter(filterChoice) }
        : {}),
      sort: buildSort(sortChoice),
    }),
    [debouncedSearch, filterChoice, limit, offset, searchField, sortChoice],
  );

  const result = useQuery(api.auth.admin.listUsers, queryArgs);

  const runUserMutation = async (
    actionKey: string,
    mutation: () => Promise<unknown>,
    onSuccess: () => void,
  ) => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    setPendingAction(actionKey);
    try {
      return await runMutationWorkflow({
        mutation,
        onSuccess: () => {
          onSuccess();
          setOffset(0);
        },
        onError: () => toast.error(t("toast.error")),
      });
    } finally {
      inFlightRef.current = false;
      setPendingAction(null);
    }
  };

  const handleCreateUser = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "user") as Role;
    const userType = String(formData.get("userType") ?? "seeker") as UserType;

    await runUserMutation(
      "create",
      () => createUser({ email, name, password, role, userType }),
      () => {
        toast.success(t("toast.created", { name }));
        form.reset();
        setIsCreateOpen(false);
      },
    );
  };

  const handleBanUser = async (user: AdminUser) => {
    const succeeded = await runUserMutation(
      `ban:${user.id}`,
      () =>
        user.banned
          ? unbanUser({ userId: user.id })
          : banUser({ userId: user.id }),
      () =>
        toast.success(
          t(user.banned ? "toast.unbanned" : "toast.banned", {
            name: user.name,
          }),
        ),
    );
    if (succeeded) setConfirmBan(null);
  };

  const handleSetRole = async (user: AdminUser, role: Role) => {
    if (user.role === role) return;
    await runUserMutation(
      `role:${user.id}`,
      () => setUserRole({ userId: user.id, role }),
      () => toast.success(t("toast.roleUpdated", { name: user.name })),
    );
  };

  const handleSetUserType = async (user: AdminUser, userType: UserType) => {
    if (user.userType === userType) return;
    await runUserMutation(
      `type:${user.id}`,
      () => setUserType({ userId: user.id, userType }),
      () => toast.success(t("toast.typeUpdated", { name: user.name })),
    );
  };

  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = result ? Math.min(offset + result.users.length, total) : 0;
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    [locale],
  );

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="size-4" />
            {t("add")}
          </Button>
        </div>

        <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_10rem_14rem_12rem]">
          <label className="relative">
            <span className="sr-only">{t("searchLabel")}</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOffset(0);
              }}
              placeholder={t("searchPlaceholder")}
              className="pl-9"
            />
          </label>
          <Select
            value={searchField}
            onValueChange={(value) => {
              setSearchField(value as SearchField);
              setOffset(0);
            }}
          >
            <SelectTrigger aria-label={t("searchIn")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{t("searchName")}</SelectItem>
              <SelectItem value="email">{t("searchEmail")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterChoice}
            onValueChange={(value) => {
              setFilterChoice(value as FilterChoice);
              setOffset(0);
            }}
          >
            <SelectTrigger aria-label={t("filterLabel")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAll")}</SelectItem>
              <SelectItem value="active">{t("filterActive")}</SelectItem>
              <SelectItem value="banned">{t("filterBanned")}</SelectItem>
              <SelectItem value="role-user">{t("filterRoleUser")}</SelectItem>
              <SelectItem value="role-admin">{t("filterRoleAdmin")}</SelectItem>
              <SelectItem value="type-seeker">{t("filterTypeSeeker")}</SelectItem>
              <SelectItem value="type-provider">{t("filterTypeProvider")}</SelectItem>
              <SelectItem value="type-admin">{t("filterTypeAdmin")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortChoice}
            onValueChange={(value) => {
              setSortChoice(value as SortChoice);
              setOffset(0);
            }}
          >
            <SelectTrigger aria-label={t("sortLabel")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("sortNewest")}</SelectItem>
              <SelectItem value="oldest">{t("sortOldest")}</SelectItem>
              <SelectItem value="name">{t("sortName")}</SelectItem>
              <SelectItem value="email">{t("sortEmail")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {[
                    "identity",
                    "city",
                    "createdAt",
                    "status",
                    "role",
                    "type",
                  ].map((column) => (
                    <th
                      key={column}
                      className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                    >
                      {t(`columns.${column}`)}
                    </th>
                  ))}
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                    {t("columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody aria-busy={result === undefined || pendingAction !== null}>
                {result === undefined ? (
                  <UserRowsSkeleton />
                ) : result.users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <p className="font-medium">{t("emptyTitle")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("emptyDescription")}
                      </p>
                    </td>
                  </tr>
                ) : (
                  result.users.map((user) => {
                    const isSelf = currentUser?._id === user.id;
                    const isRowPending = pendingAction?.endsWith(user.id);
                    return (
                      <tr
                        key={user.id}
                        className="border-b transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="p-4 align-middle">
                          <div className="flex flex-col">
                            <span className="flex flex-wrap items-center gap-1.5 font-medium">
                              {user.name}
                              <FounderBadge userId={user.id} />
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">{user.city || "—"}</td>
                        <td className="p-4 align-middle">
                          {user.createdAt
                            ? dateFormatter.format(new Date(user.createdAt))
                            : "—"}
                        </td>
                        <td className="p-4 align-middle">
                          <Badge
                            variant={user.banned ? "destructive" : "outline"}
                            className={
                              user.banned
                                ? undefined
                                : "border-emerald-600/30 text-emerald-700 dark:text-emerald-400"
                            }
                          >
                            {user.banned ? (
                              <XCircle className="size-3" />
                            ) : (
                              <CheckCircle2 className="size-3" />
                            )}
                            {t(user.banned ? "banned" : "active")}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle">
                          <Select
                            value={user.role}
                            onValueChange={(value) =>
                              void handleSetRole(user, value as Role)
                            }
                            disabled={isSelf || pendingAction !== null}
                          >
                            <SelectTrigger
                              className="h-8 w-36 text-xs"
                              title={isSelf ? t("selfProtected") : undefined}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">{t("roleUser")}</SelectItem>
                              <SelectItem value="admin">{t("roleAdmin")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4 align-middle">
                          <Select
                            value={user.userType ?? undefined}
                            onValueChange={(value) =>
                              void handleSetUserType(user, value as UserType)
                            }
                            disabled={pendingAction !== null}
                          >
                            <SelectTrigger className="h-8 w-36 text-xs">
                              <SelectValue placeholder={t("typeUnset")} />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_USER_TYPES.map((userType) => (
                                <SelectItem key={userType} value={userType}>
                                  {t(
                                    userType === "admin"
                                      ? "typeAdmin"
                                      : userType === "provider"
                                        ? "typeProvider"
                                        : "typeSeeker",
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4 text-right align-middle">
                          {isRowPending ? (
                            <Loader2 className="ml-auto size-4 animate-spin" />
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={pendingAction !== null}
                                >
                                  <span className="sr-only">
                                    {t("openMenu", { name: user.name })}
                                  </span>
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {user.slug ? (
                                  <DropdownMenuItem asChild>
                                    <Link href={`/hl/${user.slug}`}>
                                      {t("viewProfile")}
                                    </Link>
                                  </DropdownMenuItem>
                                ) : null}
                                <FounderMenuItem userId={user.id} name={user.name} />
                                <DropdownMenuItem
                                  onClick={() => setConfirmBan(user)}
                                  disabled={isSelf}
                                  className={
                                    user.banned
                                      ? "text-emerald-700 focus:text-emerald-700"
                                      : "text-destructive focus:text-destructive"
                                  }
                                >
                                  {isSelf
                                    ? t("selfProtected")
                                    : t(user.banned ? "unban" : "ban")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {result !== undefined && result.users.length > 0 ? (
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  {t("pagination.summary", {
                    start: rangeStart,
                    end: rangeEnd,
                    total,
                  })}
                </span>
                <Select
                  value={String(limit)}
                  onValueChange={(value) => {
                    setLimit(Number(value) as (typeof PAGE_SIZES)[number]);
                    setOffset(0);
                  }}
                >
                  <SelectTrigger
                    aria-label={t("pagination.pageSize")}
                    className="h-8 w-20"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="text-sm text-muted-foreground">
                  {t("pagination.page", {
                    page: currentPage,
                    pages: totalPages,
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset((value) => Math.max(0, value - limit))}
                  disabled={offset === 0}
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">
                    {t("pagination.previous")}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset((value) => value + limit)}
                  disabled={offset + limit >= total}
                >
                  <span className="hidden sm:inline">
                    {t("pagination.next")}
                  </span>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog
        open={confirmBan !== null}
        onOpenChange={(open) => {
          if (!open && pendingAction === null) setConfirmBan(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <div className="mb-1 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="size-5 text-amber-700 dark:text-amber-400" />
              </div>
              <DialogTitle>
                {t(
                  confirmBan?.banned
                    ? "banDialog.unbanTitle"
                    : "banDialog.banTitle",
                )}
              </DialogTitle>
            </div>
            <DialogDescription>
              {t(
                confirmBan?.banned
                  ? "banDialog.unbanDescription"
                  : "banDialog.banDescription",
                { name: confirmBan?.name ?? "" },
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmBan(null)}
              disabled={pendingAction !== null}
            >
              {t("banDialog.cancel")}
            </Button>
            <Button
              variant={confirmBan?.banned ? "default" : "destructive"}
              onClick={() => confirmBan && void handleBanUser(confirmBan)}
              disabled={pendingAction !== null}
            >
              {pendingAction?.startsWith("ban:") ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {t(
                confirmBan?.banned
                  ? "banDialog.confirmUnban"
                  : "banDialog.confirmBan",
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (pendingAction === null) setIsCreateOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createDialog.title")}</DialogTitle>
            <DialogDescription>{t("createDialog.description")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-5">
            <label className="block space-y-2 text-sm font-medium">
              <span>{t("createDialog.name")}</span>
              <Input
                name="name"
                required
                placeholder={t("createDialog.namePlaceholder")}
                disabled={pendingAction !== null}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span>{t("createDialog.email")}</span>
              <Input
                name="email"
                type="email"
                required
                placeholder={t("createDialog.emailPlaceholder")}
                disabled={pendingAction !== null}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span>{t("createDialog.password")}</span>
              <PasswordInput
                name="password"
                required
                minLength={8}
                placeholder="••••••••"
                disabled={pendingAction !== null}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>{t("createDialog.role")}</span>
                <Select name="role" defaultValue="user" disabled={pendingAction !== null}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t("roleUser")}</SelectItem>
                    <SelectItem value="admin">{t("roleAdmin")}</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>{t("createDialog.type")}</span>
                <Select name="userType" defaultValue="seeker" disabled={pendingAction !== null}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_USER_TYPES.map((userType) => (
                      <SelectItem key={userType} value={userType}>
                        {t(
                          userType === "admin"
                            ? "typeAdmin"
                            : userType === "provider"
                              ? "typeProvider"
                              : "typeSeeker",
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={pendingAction !== null}
              >
                {t("createDialog.cancel")}
              </Button>
              <Button type="submit" disabled={pendingAction !== null}>
                {pendingAction === "create" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {t("createDialog.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
