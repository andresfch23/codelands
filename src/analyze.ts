import { Project } from "ts-morph";
import { relative, resolve } from "node:path";

// ---------- 1. Where to look ----------
const ROOT = resolve(process.argv[2] ?? ".");

// ---------- 2. Load every TypeScript file (skip tests and type-only files) ----------
const project = new Project({ skipAddingFilesFromTsConfig: true });
project.addSourceFilesAtPaths([
  `${ROOT}/src/**/*.ts`,
  `!${ROOT}/src/**/*.test.ts`,
  `!${ROOT}/src/**/*.d.ts`,
]);

// ---------- 3. Measure each file ----------
type FileFact = { path: string; lines: number; functions: number; imports: string[] };

const facts: FileFact[] = project.getSourceFiles().map((sf) => {
  const path = relative(ROOT, sf.getFilePath());

  // Imports that point at another file inside this repo (not npm packages)
  const imports = sf
    .getImportDeclarations()
    .map((imp) => imp.getModuleSpecifierSourceFile())
    .filter((target) => target !== undefined)
    .map((target) => relative(ROOT, target!.getFilePath()));

  return {
    path,
    lines: sf.getEndLineNumber(),
    functions: sf.getFunctions().length + sf.getClasses().length,
    imports,
  };
});

// ---------- 4. Print a summary ----------
const totalLines = facts.reduce((n, f) => n + f.lines, 0);
const totalImports = facts.reduce((n, f) => n + f.imports.length, 0);

console.log(`files:   ${facts.length}`);
console.log(`lines:   ${totalLines}`);
console.log(`imports: ${totalImports} (internal, file-to-file)`);
console.log(`\nbiggest modules:`);
for (const f of [...facts].sort((a, b) => b.lines - a.lines).slice(0, 10)) {
  console.log(`  ${String(f.lines).padStart(5)}  ${f.path}  (${f.imports.length} imports)`);
}