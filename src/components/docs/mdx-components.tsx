import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, Lightbulb } from "lucide-react";
import type { MDXComponents } from "mdx/types";
import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";

const calloutStyles = {
  info: { icon: Info, className: "border-sky-500/30 bg-sky-500/5" },
  warning: { icon: AlertTriangle, className: "border-amber-500/40 bg-amber-500/10" },
  tip: { icon: Lightbulb, className: "border-emerald-500/30 bg-emerald-500/5" },
} as const;

/** Highlighted note: <Callout type="warning" title="…">…</Callout> */
export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: keyof typeof calloutStyles;
  title?: string;
  children: ReactNode;
}) {
  const { icon: Icon, className } = calloutStyles[type];
  return (
    <div className={cn("not-prose my-5 flex gap-3 rounded-lg border p-4 text-sm", className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 space-y-1 [&_p]:leading-relaxed [&_a]:underline">
        {title && <p className="font-semibold">{title}</p>}
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  );
}

/** Numbered steps: <Steps><Step title="…">…</Step></Steps> */
export function Steps({ children }: { children: ReactNode }) {
  const steps = Children.toArray(children).filter(isValidElement);
  return (
    <ol className="not-prose my-5 space-y-4">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-3">
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
          >
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">{step}</div>
        </li>
      ))}
    </ol>
  );
}

export function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <p className="font-semibold leading-7">{title}</p>
      <div className="mt-1 space-y-2 text-sm text-muted-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-foreground [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0">
        {children}
      </div>
    </>
  );
}

/** Internal links keep the current locale; external ones open in a new tab. */
function Anchor({ href = "", ...props }: ComponentProps<"a">) {
  if (href.startsWith("/")) return <Link href={href} {...props} />;
  if (href.startsWith("#")) return <a href={href} {...props} />;
  return <a href={href} target="_blank" rel="noreferrer noopener" {...props} />;
}

export const docsMdxComponents: MDXComponents = {
  a: Anchor,
  Callout,
  Steps,
  Step,
};
