import { Project, type SourceFile } from "ts-morph";
import { simpleGit } from "simple-git";
import { readFileSync } from "node:fs";
import { basename, dirname, relative } from "node:path";
import { CodelandsSchema, type Codelands, type Module } from "./schema.js";

const ROOT_ENTRY = "src/index.ts";

export async function analyzeRepository(root: string, commitsToScan: number): Promise<Codelands> {
  const modules = loadModules(root);

  linkImporters(modules);
  markPublicEntryPoints(modules, root);
  markDeadModules(modules);
  markImportCycles(modules);
  await countRecentChanges(modules, root, commitsToScan);

  return CodelandsSchema.parse({
    version: 1,
    repo: basename(root),
    generatedAt: new Date().toISOString(),
    stats: summarize(modules, commitsToScan),
    modules: [...modules.values()],
  });
}

function loadModules(root: string): Map<string, Module> {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  project.addSourceFilesAtPaths([
    `${root}/src/**/*.ts`,
    `!${root}/src/**/*.test.ts`,
    `!${root}/src/**/*.d.ts`,
  ]);

  const modules = new Map<string, Module>();
  for (const file of project.getSourceFiles()) {
    const module = measureModule(file, root);
    modules.set(module.id, module);
  }
  return modules;
}

function measureModule(file: SourceFile, root: string): Module {
  const id = relative(root, file.getFilePath());
  return {
    id,
    folder: dirname(id),
    lines: file.getEndLineNumber(),
    functions: file.getFunctions().length + file.getClasses().length,
    imports: internalDependencies(file, root, id),
    importedBy: [],
    isEntry: id === ROOT_ENTRY,
    churn: 0,
    isDead: false,
    inCycle: false,
  };
}

/** Files this one depends on, through `import ... from` and `export ... from`. Packages from npm are ignored. */
function internalDependencies(file: SourceFile, root: string, selfId: string): string[] {
  const declarations = [...file.getImportDeclarations(), ...file.getExportDeclarations()];
  const targets = declarations
    .map((declaration) => declaration.getModuleSpecifierSourceFile())
    .filter((target): target is SourceFile => target !== undefined)
    .map((target) => relative(root, target.getFilePath()))
    .filter((target) => target !== selfId);
  return [...new Set(targets)];
}

function linkImporters(modules: Map<string, Module>): void {
  for (const module of modules.values()) {
    for (const dependency of module.imports) {
      modules.get(dependency)?.importedBy.push(module.id);
    }
  }
}

/**
 * A module is public when package.json exposes it through `exports`, `main` or `module`.
 * Those fields point at built files (`./dist/x.js`); each one maps back to `src/x.ts`.
 */
function markPublicEntryPoints(modules: Map<string, Module>, root: string): void {
  const packageJson = readPackageJson(root);
  if (!packageJson) return;

  const builtPaths = collectStrings([packageJson.exports, packageJson.main, packageJson.module]);
  for (const builtPath of builtPaths) {
    const sourceId = sourceIdForBuiltPath(builtPath);
    const module = sourceId ? modules.get(sourceId) : undefined;
    if (module) module.isEntry = true;
  }
}

function readPackageJson(root: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(readFileSync(`${root}/package.json`, "utf8"));
  } catch {
    return undefined;
  }
}

function collectStrings(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string") found.push(value);
  else if (value && typeof value === "object") Object.values(value).forEach((nested) => collectStrings(nested, found));
  return found;
}

function sourceIdForBuiltPath(builtPath: string): string | undefined {
  const match = builtPath.match(/dist\/(?:cjs\/)?(.+)\.js$/);
  return match ? `src/${match[1]}.ts` : undefined;
}

function markDeadModules(modules: Map<string, Module>): void {
  for (const module of modules.values()) {
    module.isDead = module.importedBy.length === 0 && !module.isEntry;
  }
}

function markImportCycles(modules: Map<string, Module>): void {
  for (const module of modules.values()) {
    module.inCycle = module.imports.some((dependency) => dependsOn(modules, dependency, module.id));
  }
}

function dependsOn(modules: Map<string, Module>, from: string, target: string, visited = new Set<string>()): boolean {
  if (from === target) return true;
  if (visited.has(from)) return false;
  visited.add(from);
  const dependencies = modules.get(from)?.imports ?? [];
  return dependencies.some((next) => dependsOn(modules, next, target, visited));
}

async function countRecentChanges(modules: Map<string, Module>, root: string, commitsToScan: number): Promise<void> {
  const log = await simpleGit(root).log({ maxCount: commitsToScan, "--name-only": null });
  for (const commit of log.all) {
    for (const changedFile of filesTouchedBy(commit)) {
      const module = modules.get(changedFile);
      if (module) module.churn += 1;
    }
  }
}

function filesTouchedBy(commit: { diff?: { files?: { file: string }[] } }): string[] {
  return (commit.diff?.files ?? []).map((entry) => entry.file);
}

function summarize(modules: Map<string, Module>, commitsAnalyzed: number): Codelands["stats"] {
  const all = [...modules.values()];
  return {
    modules: all.length,
    lines: all.reduce((total, module) => total + module.lines, 0),
    imports: all.reduce((total, module) => total + module.imports.length, 0),
    commitsAnalyzed,
  };
}