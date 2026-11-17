"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type FormPageProps = {
  backHref: string;
  backLabel: string;
  title: string;
  description?: string;
  children: ReactNode;
};

/** Full-page layout for long create/edit forms (replaces modal dialogs). */
export function FormPage({
  backHref,
  backLabel,
  title,
  description,
  children,
}: FormPageProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <Button variant="ghost" size="sm" className="-ml-2 mb-4 px-2" asChild>
        <Link href={backHref}>
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
      </Button>
      <header className="mb-8 space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </header>
      {children}
    </div>
  );
}
