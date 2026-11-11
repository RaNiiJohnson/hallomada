import { docs } from "fumadocs-mdx:collections/server";
import { loader } from "fumadocs-core/source";

/** Internal documentation (content/docs), served under /admin/docs. */
export const docsSource = loader({
  baseUrl: "/admin/docs",
  source: docs.toFumadocsSource(),
});
