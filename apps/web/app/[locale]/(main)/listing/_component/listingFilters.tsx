"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useState, useTransition } from "react";
import { useDebounce } from "use-debounce";
import { listingTypeValues } from "./forms/listingForm";

const BEDROOMS_OPTIONS = ["1", "2", "3", "4"] as const;

export function RealEstatesFilters() {
  const { isAuthenticated } = useConvexAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, startTransition] = useTransition();
  const t = useTranslations("listing");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [filters, setFilters] = useQueryStates({
    search: parseAsString.withDefault(""),
    type: parseAsString.withDefault("all"),
    bedrooms: parseAsInteger.withDefault(0),
    minPrice: parseAsInteger.withDefault(0),
    maxPrice: parseAsInteger.withDefault(0),
    bookmarkedOnly: parseAsString.withDefault("false"),
  });

  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localMinPrice, setLocalMinPrice] = useState(
    filters.minPrice > 0 ? filters.minPrice.toString() : "",
  );
  const [localMaxPrice, setLocalMaxPrice] = useState(
    filters.maxPrice > 0 ? filters.maxPrice.toString() : "",
  );

  const [debouncedSearch] = useDebounce(localSearch, 600);
  const [debouncedMin] = useDebounce(localMinPrice, 1000);
  const [debouncedMax] = useDebounce(localMaxPrice, 1000);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      startTransition(() => {
        setFilters({ search: debouncedSearch || null });
      });
    }
  }, [debouncedSearch, setFilters, filters.search]);

  useEffect(() => {
    const min = debouncedMin === "" ? 0 : parseInt(debouncedMin);
    if (isNaN(min)) return;

    // Ne mettre à jour que si la valeur change réellement
    if (min !== filters.minPrice) {
      startTransition(() => {
        setFilters({ minPrice: min || null });
      });
    }
  }, [debouncedMin, filters.minPrice, setFilters]);

  useEffect(() => {
    const max = debouncedMax === "" ? 0 : parseInt(debouncedMax);
    if (isNaN(max)) return;

    if (max !== filters.maxPrice) {
      startTransition(() => {
        setFilters({ maxPrice: max || null });
      });
    }
  }, [debouncedMax, filters.maxPrice, setFilters]);

  const clearAll = () => {
    setLocalSearch("");
    setLocalMinPrice("");
    setLocalMaxPrice("");
    setFilters({
      search: null,
      type: "all",
      bedrooms: 0,
      minPrice: null,
      maxPrice: null,
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
              <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
                <PopoverTrigger asChild>
                  <InputGroupButton variant="outline">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t("filters.title")}
                    </span>

                    <Badge
                      variant="secondary"
                      className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    ></Badge>
                  </InputGroupButton>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-4" align="end">
                  <div
                    className="space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{t("filters.advanced")}</h3>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground h-auto p-0"
                        onClick={clearAll}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t("filters.clearAll")}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          {t("filters.bedrooms")}
                        </label>
                        <Select
                          value={filters.bedrooms.toString()}
                          onValueChange={(value) => {
                            setFilters({ bedrooms: parseInt(value) });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("filters.bedroomsAll")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={"0"}>
                              {t("filters.bedroomsAll")}
                            </SelectItem>
                            {BEDROOMS_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {t(
                                  `filters.bedrooms${option}` as Parameters<
                                    typeof t
                                  >[0],
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          {t("filters.minPrice")}
                        </label>
                        <Input
                          type="number"
                          placeholder="Min"
                          value={localMinPrice}
                          onChange={(e) => setLocalMinPrice(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          {t("filters.maxPrice")}
                        </label>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={localMaxPrice}
                          onChange={(e) => setLocalMaxPrice(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className=" flex-wrap pt-2 gap-2 md:hidden flex">
                      <Badge
                        variant={filters.type === "all" ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => setFilters({ type: "all" })}
                      >
                        {t("filters.all")}
                      </Badge>
                      {listingTypeValues.map((type) => (
                        <Badge
                          key={type}
                          variant={
                            filters.type === type ? "default" : "outline"
                          }
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => setFilters({ type: type })}
                        >
                          {t(
                            `labels.listingTypes.${type}` as Parameters<
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
            {t("filters.all")}
          </Badge>
          {listingTypeValues.map((type) => (
            <Badge
              key={type}
              variant={filters.type === type ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
              onClick={() => setFilters({ type: type })}
            >
              {t(`labels.listingTypes.${type}` as Parameters<typeof t>[0])}
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
