import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { digestSchema } from "./lib/digest";

const digests = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./data/digests" }),
  schema: digestSchema,
});

export const collections = { digests };