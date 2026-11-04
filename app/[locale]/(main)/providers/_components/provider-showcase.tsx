"use client";

import { ShareButton } from "@/components/ShareButton";
import { ReportDialog } from "@/components/report-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { whatsappLink } from "@/lib/providers";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { FaFacebook, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa";
import remarkBreaks from "remark-breaks";
import { toast } from "sonner";
import { ProviderAvatar } from "./provider-directory";
import { ProviderGallery } from "./provider-gallery";
import type { ProviderPage } from "./types";

export function ProviderShowcase({ provider }: { provider: ProviderPage }) {
  const t = useTranslations("providers");
  const whatsappHref = whatsappLink(
    provider.whatsapp,
    t("details.whatsappMessage", { name: provider.name }),
  );
  const cover = provider.images[0]?.url;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-28 lg:pb-12">
      <Button variant="ghost" size="sm" className="-ml-2 mb-4 px-2" asChild>
        <Link href="/providers">
          <ArrowLeft className="size-4" />
          {t("details.back")}
        </Link>
      </Button>

      {provider.canManage && <OwnerPanel provider={provider} />}

      <header className="overflow-hidden rounded-2xl border bg-card">
        <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5 sm:h-64">
          {cover && (
            <Image
              src={cover}
              alt={provider.name}
              fill
              priority
              sizes="(min-width: 1024px) 1024px, 100vw"
              className="object-cover"
            />
          )}
        </div>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:p-6">
          <ProviderAvatar
            name={provider.name}
            logoUrl={provider.logoUrl}
            className="-mt-14 size-24 border-4 border-card text-3xl sm:-mt-16"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
              {provider.name}
            </h1>
            {provider.tagline && (
              <p className="text-muted-foreground">{provider.tagline}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge>{t(`categories.${provider.category}`)}</Badge>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <MapPin className="size-4" />
                {provider.city}
              </span>
              {provider.serviceModes.map((mode) => (
                <Badge key={mode} variant="outline">
                  {t(`serviceModes.${mode}`)}
                </Badge>
              ))}
            </div>
            <AuthorLine provider={provider} />
          </div>
          <div className="flex gap-2">
            <ShareButton text={provider.name} showLabel />
            {!provider.canManage && (
              <ReportDialog
                target={{ type: "provider", id: provider._id }}
                variant="outline"
                showLabel={false}
                size="icon-sm"
              />
            )}
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Section title={t("details.about")}>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                {provider.description}
              </ReactMarkdown>
            </div>
          </Section>

          {provider.services.length > 0 && (
            <Section title={t("details.services")}>
              <ul className="divide-y">
                {provider.services.map((service, index) => (
                  <li
                    key={index}
                    className="flex items-baseline justify-between gap-4 py-2.5"
                  >
                    <span>{service.name}</span>
                    {service.price && (
                      <span className="shrink-0 font-medium text-primary">
                        {service.price}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {provider.images.length > 0 && (
            <Section title={t("details.gallery")}>
              <ProviderGallery
                name={provider.name}
                images={provider.images.filter(
                  (image): image is { storageId: string; url: string } =>
                    Boolean(image.url),
                )}
              />
            </Section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ContactCard provider={provider} whatsappHref={whatsappHref} />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
        <WhatsAppButton href={whatsappHref} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-6">
      <h2 className="mb-3 font-semibold text-lg">{title}</h2>
      {children}
    </section>
  );
}

function WhatsAppButton({ href }: { href: string }) {
  const t = useTranslations("providers");
  return (
    <Button
      asChild
      size="lg"
      className="w-full bg-[#25D366] text-white hover:bg-[#1ebe5a]"
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        <FaWhatsapp className="size-5" />
        {t("details.whatsapp")}
      </a>
    </Button>
  );
}

function ContactCard({
  provider,
  whatsappHref,
}: {
  provider: ProviderPage;
  whatsappHref: string;
}) {
  const t = useTranslations("providers");
  const socials = [
    { href: provider.instagram, label: "Instagram", icon: FaInstagram },
    { href: provider.facebook, label: "Facebook", icon: FaFacebook },
    { href: provider.tiktok, label: "TikTok", icon: FaTiktok },
  ].filter((social): social is typeof social & { href: string } =>
    Boolean(social.href),
  );
  const links = [
    provider.phone && {
      href: `tel:${provider.phone}`,
      label: provider.phone,
      icon: Phone,
    },
    provider.email && {
      href: `mailto:${provider.email}`,
      label: provider.email,
      icon: Mail,
    },
    provider.website && {
      href: provider.website,
      label: new URL(provider.website).hostname.replace(/^www\./, ""),
      icon: Globe,
      external: true,
    },
  ].filter((link) => !!link);

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
      <h2 className="font-semibold text-lg">{t("details.contactTitle")}</h2>
      <WhatsAppButton href={whatsappHref} />

      {socials.length > 0 && (
        <div className="flex gap-2">
          {socials.map(({ href, label, icon: Icon }) => (
            <Button key={label} variant="outline" size="icon" asChild>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
              >
                <Icon className="size-4" />
              </a>
            </Button>
          ))}
        </div>
      )}

      {links.length > 0 && (
        <ul className="space-y-2 text-sm">
          {links.map(({ href, label, icon: Icon, ...rest }) => (
            <li key={href}>
              <a
                href={href}
                className="flex items-center gap-2 break-all text-muted-foreground hover:text-primary"
                {...("external" in rest
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted-foreground text-xs">{t("details.contactHint")}</p>
    </div>
  );
}

function OwnerPanel({ provider }: { provider: ProviderPage }) {
  const t = useTranslations("providers");
  const setStatus = useMutation(api.providers.mutations.setProviderStatus);
  const [busy, setBusy] = useState(false);
  const { status } = provider;

  const changeStatus = async (next: "active" | "closed") => {
    setBusy(true);
    try {
      await setStatus({ providerId: provider._id, status: next });
      toast.success(t("status.updated"));
    } catch {
      toast.error(t("status.error"));
    } finally {
      setBusy(false);
    }
  };

  const hint =
    status === "pending"
      ? t("status.pendingHint")
      : status === "rejected"
        ? t("status.rejectedHint")
        : status === "closed"
          ? t("status.closedHint")
          : null;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1 text-sm">
        {status !== "active" && (
          <Badge variant="secondary">{t(`status.${status}`)}</Badge>
        )}
        {hint && <p className="text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/providers/${provider.slug}/edit`}>
            <Pencil className="size-4" />
            {t("details.edit")}
          </Link>
        </Button>
        {status === "active" && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => changeStatus("closed")}
          >
            <EyeOff className="size-4" />
            {t("status.hide")}
          </Button>
        )}
        {status === "closed" && (
          <Button size="sm" disabled={busy} onClick={() => changeStatus("active")}>
            <Eye className="size-4" />
            {t("status.show")}
          </Button>
        )}
      </div>
    </div>
  );
}

function AuthorLine({ provider }: { provider: ProviderPage }) {
  const t = useTranslations("providers");
  const name = provider.authorName || t("details.anonymous");

  return (
    <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
      <UserRound className="size-4" />
      {t("details.createdBy")}{" "}
      {provider.isAuthor ? (
        <span className="font-medium text-foreground">{t("details.you")}</span>
      ) : provider.authorSlug ? (
        <Link
          href={`/hl/${provider.authorSlug}`}
          className="font-medium text-foreground hover:underline"
        >
          {name}
        </Link>
      ) : (
        <span className="font-medium text-foreground">{name}</span>
      )}
    </p>
  );
}
