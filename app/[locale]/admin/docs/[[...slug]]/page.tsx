import { docsMdxComponents } from "@/components/docs/mdx-components";
import { docsSource } from "@/lib/docs-source";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ locale: string; slug?: string[] }> };

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const page = docsSource.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const toc = page.data.toc.filter((item) => item.depth <= 3);

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_13rem]">
      <article className="min-w-0">
        <header className="mb-8 border-b pb-6">
          <h1 className="text-3xl font-bold tracking-tight">{page.data.title}</h1>
          {page.data.description && (
            <p className="mt-2 text-lg text-muted-foreground">{page.data.description}</p>
          )}
        </header>
        <div className="prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-a:text-primary prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:text-foreground [&_ul.contains-task-list]:list-none [&_ul.contains-task-list]:pl-0">
          <MDX components={docsMdxComponents} />
        </div>
      </article>
      {toc.length > 0 && (
        <aside className="hidden xl:block">
          <nav aria-label="Sur cette page" className="sticky top-20 text-sm">
            <p className="mb-2 font-semibold">Sur cette page</p>
            <ul className="space-y-1.5 border-l">
              {toc.map((item) => (
                <li key={item.url} style={{ paddingLeft: `${(item.depth - 2) * 0.75 + 0.75}rem` }}>
                  <a href={item.url} className="text-muted-foreground hover:text-foreground">
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = docsSource.getPage(slug);
  if (!page) return {};
  return {
    title: `${page.data.title} · Documentation`,
    robots: { index: false, follow: false },
  };
}
