"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConvexAuth } from "convex/react";
import { Filter, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryStates } from "nuqs";
import { useEffect, useState, useTransition } from "react";
import { useDebounce } from "use-debounce";

import { jobTypeValues, selectableContractTypes } from "./forms/jobOfferForm";

export function JobFilters() {
  const { isAuthenticated } = useConvexAuth();
  const t = useTranslations("jobs");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, startTransition] = useTransition();

  const [filters, setFilters] = useQueryStates({
    search: parseAsString.withDefault(""),
    type: parseAsString.withDefault("all"),
    contract: parseAsString.withDefault("all"),
    bookmarkedOnly: parseAsString.withDefault("false"),
  });

  // 1. L'unique source de vérité pour l'affichage de l'input
  const [localSearch, setLocalSearch] = useState(filters.search);

  // 2. On calcule la valeur debouncée
  const [debouncedSearch] = useDebounce(localSearch, 600);

  // 3. Un SEUL effet pour pousser vers l'URL
  useEffect(() => {
    // On vérifie si la valeur a vraiment changé pour éviter les rendus inutiles
    if (debouncedSearch !== filters.search) {
      startTransition(() => {
        setFilters({ search: debouncedSearch || null });
      });
    }
  }, [debouncedSearch, setFilters, filters.search]);

  const clearAll = () => {
    setLocalSearch("");
    setFilters({
      search: null,
      type: "all",
      contract: "all",
      bookmarkedOnly: "false",
    });
  };

  return (
    <div className="p-2">
      <div className="flex flex-col gap-4 max-w-3xl mx-auto">
        {/* Barre de recherche principale */}
        <div className="flex gap-4">
          <InputGroup>
            <InputGroupInput
              placeholder={t("filters.search")}
              className="pl-10"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <Popover>
                <PopoverTrigger asChild>
                  <InputGroupButton variant="outline">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t("filters.title")}
                    </span>
                  </InputGroupButton>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-4" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t("filters.title")}</h3>
                      <Button
                        onClick={clearAll}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground h-auto p-0"
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t("filters.clearAll")}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          {t("filters.contractType")}
                        </label>
                        <Select
                          value={filters.contract}
                          onValueChange={(value) =>
                            setFilters({ contract: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("filters.allContracts")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              {t("filters.allContracts")}
                            </SelectItem>
                            {selectableContractTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {t(
                                  `labels.contracts.${type}` as Parameters<
                                    typeof t
                                  >[0],
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className=" flex-wrap gap-2 md:hidden flex pt-2">
                        <Badge
                          variant={
                            filters.type === "all" ? "default" : "outline"
                          }
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => setFilters({ type: "all" })}
                        >
                          {t("filters.allTypes")}
                        </Badge>
                        {jobTypeValues.map((type) => (
                          <Badge
                            key={type}
                            variant={
                              filters.type === type ? "default" : "outline"
                            }
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={() => setFilters({ type })}
                          >
                            {t(
                              `labels.jobTypes.${type}` as Parameters<
                                typeof t
                              >[0],
                            )}
                          </Badge>
                        ))}
                        {isAuthenticated && (
                          <Badge
                            variant={
                              filters.bookmarkedOnly === "true"
                                ? "default"
                                : "secondary"
                            }
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={() =>
                              setFilters({
                                bookmarkedOnly:
                                  filters.bookmarkedOnly === "true"
                                    ? "false"
                                    : "true",
                              })
                            }
                          >
                            {t("filters.bookmarked")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </InputGroupAddon>
          </InputGroup>
        </div>

        {/* Filtres rapides par type */}
        <div className="hidden md:flex md:flex-wrap md:gap-2">
          <Badge
            variant={filters.type === "all" ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
            onClick={() => setFilters({ type: "all" })}
          >
            {t("filters.allTypes")}
          </Badge>
          {jobTypeValues.map((type) => (
            <Badge
              key={type}
              variant={filters.type === type ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
              onClick={() => setFilters({ type })}
            >
              {t(`labels.jobTypes.${type}` as Parameters<typeof t>[0])}
            </Badge>
          ))}
          {isAuthenticated && (
            <Badge
              variant={
                filters.bookmarkedOnly === "true" ? "default" : "secondary"
              }
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
              onClick={() =>
                setFilters({
                  bookmarkedOnly:
                    filters.bookmarkedOnly === "true" ? "false" : "true",
                })
              }
            >
              {t("filters.bookmarked")}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
