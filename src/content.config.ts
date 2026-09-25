import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { editionSchema } from "./lib/schema";

const editions = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./data/editions" }),
  schema: editionSchema,
});

export const collections = { editions };
