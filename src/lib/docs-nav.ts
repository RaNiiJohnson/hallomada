import type * as PageTree from "fumadocs-core/page-tree";
import { docsSource } from "./docs-source";

/** Plain, serializable docs navigation for the client sidebar. */
export type DocsNavNode =
  | { type: "page"; name: string; url: string; isNew: boolean }
  | { type: "folder"; name: string; url: string | null; isNew: boolean; children: DocsNavNode[] }
  | { type: "separator"; name: string };

const text = (value: unknown) => (typeof value === "string" ? value : String(value ?? ""));

export function getDocsNav(): DocsNavNode[] {
  const isNew = new Map(docsSource.getPages().map((page) => [page.url, page.data.new === true]));

  const convert = (node: PageTree.Node): DocsNavNode => {
    if (node.type === "separator") return { type: "separator", name: text(node.name) };
    if (node.type === "page") {
      return { type: "page", name: text(node.name), url: node.url, isNew: isNew.get(node.url) ?? false };
    }
    const children = node.children.map(convert);
    return {
      type: "folder",
      name: text(node.name),
      url: node.index?.url ?? null,
      // A folder is "new" when its index or any page inside is new.
      isNew:
        (node.index ? (isNew.get(node.index.url) ?? false) : false) ||
        children.some((child) => child.type !== "separator" && child.isNew),
      children,
    };
  };

  return docsSource.pageTree.children.map(convert);
}
