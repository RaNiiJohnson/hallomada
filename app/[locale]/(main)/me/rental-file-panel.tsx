"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useTypedR2Upload } from "@/hooks/use-r2-typed-upload";
import { Link } from "@/i18n/navigation";
import { formatDateLong } from "@/lib/date";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import {
  MAX_RENTAL_ABOUT,
  MAX_RENTAL_DOCUMENT_SIZE,
  MAX_RENTAL_DOCUMENTS,
  RENTAL_DOCUMENT_CATEGORIES,
  type RentalDocumentCategory,
} from "@convex/rentalFiles/values";
import { useQuery } from "convex-helpers/react/cache";
import { useMutation } from "convex/react";
import { FileText, FolderLock, Loader2, Trash2, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

export function RentalFilePanel() {
  const t = useTranslations("rentalFile");
  const data = useQuery(api.rentalFiles.queries.getMine, {});

  if (data === undefined) return <Skeleton className="h-96 w-full rounded-2xl" />;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FolderLock className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{t("panel.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("panel.description")}</p>
          </div>
        </div>
      </div>
      <ProfileForm key={data.profile?._id ?? "new"} profile={data.profile} />
      <Documents documents={data.documents} />
      <SentList sent={data.sent} />
    </section>
  );
}

type TriState = "unset" | "yes" | "no";
const toTri = (value: boolean | undefined): TriState =>
  value === undefined ? "unset" : value ? "yes" : "no";
const fromTri = (value: TriState) => (value === "unset" ? undefined : value === "yes");

function ProfileForm({ profile }: { profile: Doc<"rentalFiles"> | null }) {
  const t = useTranslations("rentalFile.profile");
  const save = useMutation(api.rentalFiles.mutations.saveProfile);
  const [occupation, setOccupation] = useState(profile?.occupation ?? "");
  const [employer, setEmployer] = useState(profile?.employer ?? "");
  const [income, setIncome] = useState(profile?.netMonthlyIncome?.toString() ?? "");
  const [household, setHousehold] = useState(profile?.householdSize?.toString() ?? "");
  const [moveIn, setMoveIn] = useState(profile?.moveInDate ?? "");
  const [pets, setPets] = useState<TriState>(toTri(profile?.pets));
  const [smoker, setSmoker] = useState<TriState>(toTri(profile?.smoker));
  const [about, setAbout] = useState(profile?.about ?? "");
  const [saving, setSaving] = useState(false);

  const toNumber = (value: string) => (value.trim() === "" ? undefined : Number(value));

  const submit = async () => {
    setSaving(true);
    try {
      await save({
        profile: {
          occupation,
          employer,
          netMonthlyIncome: toNumber(income),
          householdSize: toNumber(household),
          moveInDate: moveIn || undefined,
          pets: fromTri(pets),
          smoker: fromTri(smoker),
          about,
        },
      });
      toast.success(t("saved"));
    } catch {
      toast.error(t("error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div>
        <h3 className="font-semibold">{t("title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="rf-occupation" label={t("occupation")}>
          <Input id="rf-occupation" value={occupation} maxLength={100} onChange={(e) => setOccupation(e.target.value)} />
        </Field>
        <Field id="rf-employer" label={t("employer")}>
          <Input id="rf-employer" value={employer} maxLength={100} onChange={(e) => setEmployer(e.target.value)} />
        </Field>
        <Field id="rf-income" label={t("income")}>
          <Input id="rf-income" type="number" inputMode="numeric" min={0} value={income} onChange={(e) => setIncome(e.target.value)} />
        </Field>
        <Field id="rf-household" label={t("household")}>
          <Input id="rf-household" type="number" inputMode="numeric" min={1} max={20} step={1} value={household} onChange={(e) => setHousehold(e.target.value)} />
        </Field>
        <Field id="rf-move-in" label={t("moveIn")}>
          <Input id="rf-move-in" type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <TriSelect id="rf-pets" label={t("pets")} value={pets} onChange={setPets} />
          <TriSelect id="rf-smoker" label={t("smoker")} value={smoker} onChange={setSmoker} />
        </div>
      </div>
      <Field id="rf-about" label={t("about")}>
        <Textarea
          id="rf-about"
          rows={4}
          maxLength={MAX_RENTAL_ABOUT}
          value={about}
          placeholder={t("aboutPlaceholder")}
          onChange={(e) => setAbout(e.target.value)}
        />
      </Field>
      <Button type="submit" disabled={saving} className="rounded-full">
        {saving ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function TriSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: TriState;
  onChange: (value: TriState) => void;
}) {
  const t = useTranslations("rentalFile.profile");
  return (
    <Field id={id} label={label}>
      <Select value={value} onValueChange={(next) => onChange(next as TriState)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unset">{t("unset")}</SelectItem>
          <SelectItem value="yes">{t("yes")}</SelectItem>
          <SelectItem value="no">{t("no")}</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}

function Documents({ documents }: { documents: Doc<"rentalDocuments">[] }) {
  const t = useTranslations("rentalFile.documents");
  const full = documents.length >= MAX_RENTAL_DOCUMENTS;

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
      <div>
        <h3 className="font-semibold">{t("title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        <p className="mt-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          {t("privacyTip")}
        </p>
      </div>
      <ul className="divide-y">
        {RENTAL_DOCUMENT_CATEGORIES.map((category) => (
          <CategoryRow
            key={category}
            category={category}
            documents={documents.filter((document) => document.category === category)}
            disabled={full}
          />
        ))}
      </ul>
      {full && <p className="text-xs text-muted-foreground">{t("limit", { max: MAX_RENTAL_DOCUMENTS })}</p>}
    </div>
  );
}

function CategoryRow({
  category,
  documents,
  disabled,
}: {
  category: RentalDocumentCategory;
  documents: Doc<"rentalDocuments">[];
  disabled: boolean;
}) {
  const t = useTranslations("rentalFile.documents");
  const { upload } = useTypedR2Upload(
    api.integrations.r2.generateRentalDocumentUploadUrl as never,
    api.integrations.r2.syncMetadata,
    { accept: ACCEPT },
  );
  const attach = useMutation(api.rentalFiles.mutations.attachDocument);
  const remove = useMutation(api.rentalFiles.mutations.removeDocument);
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_RENTAL_DOCUMENT_SIZE) {
      toast.error(t("tooLarge"));
      return;
    }
    setUploading(true);
    try {
      const key = await upload(file);
      await attach({ key, category, fileName: file.name });
      toast.success(t("uploaded"));
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{t(`categories.${category}.label`)}</p>
          <p className="text-xs text-muted-foreground">{t(`categories.${category}.hint`)}</p>
        </div>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={disabled || uploading}
          onClick={() => input.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span className="hidden sm:inline">{t("add")}</span>
        </Button>
      </div>
      {documents.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {documents.map((document) => (
            <li key={document._id} className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{document.fileName}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={t("remove", { name: document.fileName })}
                onClick={() =>
                  void remove({ id: document._id }).then(
                    () => toast.success(t("removed")),
                    () => toast.error(t("uploadError")),
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

type Sent = {
  _id: Doc<"rentalApplications">["_id"];
  sentAt: number;
  expiresAt: number;
  revoked: boolean;
  listing: { title: string; slug: string } | null;
};

function SentList({ sent }: { sent: Sent[] }) {
  const t = useTranslations("rentalFile.sentList");
  const locale = useLocale();
  const revoke = useMutation(api.rentalFiles.mutations.revokeAccess);
  const [now] = useState(() => Date.now());

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-5 sm:p-6">
      <div>
        <h3 className="font-semibold">{t("title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      {sent.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y">
          {sent.map((item) => {
            const open = !item.revoked && item.expiresAt > now;
            return (
              <li key={item._id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  {item.listing ? (
                    <Link href={`/listing/${item.listing.slug}`} className="text-sm font-medium hover:underline">
                      {item.listing.title}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">{t("deletedListing")}</span>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t("sentOn", { date: formatDateLong(item.sentAt, locale) })}
                  </p>
                </div>
                {open ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {t("openUntil", { date: formatDateLong(item.expiresAt, locale) })}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void revoke({ applicationId: item._id }).then(
                          () => toast.success(t("revoked")),
                          () => toast.error(t("error")),
                        )
                      }
                    >
                      {t("revoke")}
                    </Button>
                  </div>
                ) : (
                  <Badge variant="outline">{t("closed")}</Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
