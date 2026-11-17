import { DocsNav } from "@/components/docs/docs-nav";
import { getDocsNav } from "@/lib/docs-nav";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
      <aside className="min-w-0">
        <DocsNav nodes={getDocsNav()} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
