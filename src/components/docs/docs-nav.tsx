"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { DocsNavNode } from "@/lib/docs-nav";
import { BookOpen, Menu } from "lucide-react";

/** Left navigation of the internal docs. Pages still to check are in amber. */
export function DocsNav({ nodes }: { nodes: DocsNavNode[] }) {
  const pathname = usePathname();
  const list = <NavList nodes={nodes} pathname={pathname} />;

  return (
    <>
      <details className="rounded-lg border bg-card p-3 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
          <Menu className="size-4" />
          Sommaire de la documentation
        </summary>
        <div className="mt-3">{list}</div>
      </details>
      <nav aria-label="Documentation" className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 lg:block">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="size-4 text-primary" />
          Documentation
        </p>
        {list}
        <p className="mt-6 flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
          <NewDot /> En orange : à vérifier
        </p>
      </nav>
    </>
  );
}

function NewDot() {
  return <span aria-hidden className="inline-block size-2 shrink-0 rounded-full bg-amber-500" />;
}

function NavList({ nodes, pathname }: { nodes: DocsNavNode[]; pathname: string }) {
  return (
    <ul className="space-y-0.5 text-sm">
      {nodes.map((node, index) => (
        <NavNode key={`${node.type}-${node.name}-${index}`} node={node} pathname={pathname} />
      ))}
    </ul>
  );
}

function NavNode({ node, pathname }: { node: DocsNavNode; pathname: string }) {
  if (node.type === "separator") {
    return (
      <li className="mt-4 mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {node.name}
      </li>
    );
  }
  if (node.type === "folder") {
    return (
      <li className="mt-3">
        <NavLink name={node.name} url={node.url} isNew={node.isNew} pathname={pathname} heading />
        <ul className="mt-0.5 space-y-0.5 border-l pl-2 ml-2">
          {node.children.map((child, index) => (
            <NavNode key={`${child.type}-${child.name}-${index}`} node={child} pathname={pathname} />
          ))}
        </ul>
      </li>
    );
  }
  return (
    <li>
      <NavLink name={node.name} url={node.url} isNew={node.isNew} pathname={pathname} />
    </li>
  );
}

function NavLink({
  name,
  url,
  isNew,
  pathname,
  heading = false,
}: {
  name: string;
  url: string | null;
  isNew: boolean;
  pathname: string;
  heading?: boolean;
}) {
  const active = url !== null && pathname === url;
  const className = cn(
    "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
    heading && "font-semibold",
    isNew
      ? "text-amber-700 dark:text-amber-400"
      : heading
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground",
    active && "bg-primary/10 font-medium",
    active && !isNew && "text-primary",
  );
  const content = (
    <>
      <span className="min-w-0 flex-1">{name}</span>
      {isNew && <NewDot />}
    </>
  );
  if (url === null) return <span className={className}>{content}</span>;
  return (
    <Link href={url} className={className} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  );
}
