import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Bookmark,
  Flame,
  ListFilter,
  Shuffle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { SortMode } from "./types";

const FILTERS: { mode: SortMode; icon: React.ElementType }[] = [
  { mode: "recent", icon: ArrowDownNarrowWide },
  { mode: "shuffle", icon: Shuffle },
  { mode: "oldest", icon: ArrowUpNarrowWide },
  { mode: "top", icon: Flame },
  { mode: "bookmarked", icon: Bookmark },
];

export function ModeToggle({
  mode,
  onChangeAction,
}: {
  mode: SortMode;
  onChangeAction: (m: SortMode) => void;
}) {
  const t = useTranslations("sortMode");
  const tc = useTranslations("communities");

  return (
    <Select
      value={mode}
      onValueChange={(value) => onChangeAction(value as SortMode)}
    >
      <SelectTrigger size="sm" aria-label={tc("sortLabel")}>
        <ListFilter className="size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {FILTERS.map(({ mode: itemMode, icon: Icon }) => (
          <SelectItem key={itemMode} value={itemMode}>
            <span className="flex items-center gap-2">
              <Icon className="size-3.5" />
              {t(itemMode)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
