import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ComFilters() {
  const t = useTranslations("jobs");
  return (
    <InputGroup>
      <InputGroupInput placeholder={t("filters.search")} className="pl-10" />
      <InputGroupAddon>
        <Search className="h-4 w-4" />
      </InputGroupAddon>
      {/* <InputGroupAddon align="inline-end">
        <Popover>
          <PopoverTrigger asChild>
            <InputGroupButton variant="outline">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtres</span>
            </InputGroupButton>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-4" align="end">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Type de contrat
                </label>
              </div>
              <div></div>
            </div>
          </PopoverContent>
        </Popover>
      </InputGroupAddon> */}
    </InputGroup>
  );
}
