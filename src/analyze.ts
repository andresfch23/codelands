import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeRepository } from "./analyzer.js";
import type { Codelands } from "./schema.js";

const DEFAULT_OUTPUT = "codelands.json";
const DEFAULT_COMMITS = 200;

const repositoryPath = resolve(process.argv[2] ?? ".");
const outputPath = process.argv[3] ?? DEFAULT_OUTPUT;

const report = await analyzeRepository(repositoryPath, DEFAULT_COMMITS);
writeFileSync(outputPath, JSON.stringify(report, null, 2));
printSummary(report, outputPath);

function printSummary(report: Codelands, outputPath: string): void {
  const { stats, modules } = report;
  const count = (predicate: (module: Codelands["modules"][number]) => boolean) =>
    modules.filter(predicate).length;
  const mostChanged = [...modules].sort((a, b) => b.churn - a.churn).slice(0, 5);

  console.log(`wrote ${outputPath}`);
  console.log(`modules: ${stats.modules}  lines: ${stats.lines}  imports: ${stats.imports}  commits: ${stats.commitsAnalyzed}`);
  console.log(`entry points: ${count((m) => m.isEntry)}`);
  console.log(`dead code:    ${count((m) => m.isDead)}`);
  console.log(`in a cycle:   ${count((m) => m.inCycle)}`);
  console.log(`\nmost changed:`);
  for (const module of mostChanged) {
    console.log(`  ${String(module.churn).padStart(3)} commits  ${module.id}`);
  }
}