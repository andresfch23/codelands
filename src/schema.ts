import { z } from "zod";

export const ModuleSchema = z.object({
  id: z.string().describe("Path relative to the repository root"),
  folder: z.string().describe("Directory that contains the module"),
  lines: z.number().int().nonnegative(),
  functions: z.number().int().nonnegative(),
  imports: z.array(z.string()).describe("Ids of modules this one depends on"),
  importedBy: z.array(z.string()).describe("Ids of modules that depend on this one"),
  isEntry: z.boolean().describe("Exposed to consumers through package.json exports"),
  churn: z.number().int().nonnegative().describe("Commits that touched this module in the scanned history"),
  isDead: z.boolean().describe("No importers and not an entry point"),
  inCycle: z.boolean().describe("Takes part in a circular dependency"),
});

export const StatsSchema = z.object({
  modules: z.number().int().nonnegative(),
  lines: z.number().int().nonnegative(),
  imports: z.number().int().nonnegative(),
  commitsAnalyzed: z.number().int().nonnegative(),
});

export const CodelandsSchema = z.object({
  version: z.literal(1),
  repo: z.string(),
  generatedAt: z.string().datetime(),
  stats: StatsSchema,
  modules: z.array(ModuleSchema),
});

export type Module = z.infer<typeof ModuleSchema>;
export type Stats = z.infer<typeof StatsSchema>;
export type Codelands = z.infer<typeof CodelandsSchema>;