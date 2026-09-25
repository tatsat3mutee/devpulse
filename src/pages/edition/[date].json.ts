import { getCollection, type CollectionEntry } from "astro:content";
import type { APIRoute } from "astro";
import { isPublicEdition } from "../../lib/schema";

export async function getStaticPaths() {
  const editions = (await getCollection("editions")).filter((edition) => isPublicEdition(edition.data));
  return editions.map((edition) => ({ params: { date: edition.data.date }, props: { edition } }));
}

export const GET: APIRoute = ({ props }) => {
  const edition = props.edition as CollectionEntry<"editions">;
  return new Response(JSON.stringify(edition.data, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
