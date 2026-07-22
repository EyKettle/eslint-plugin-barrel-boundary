/**
 * @fileoverview Disallow deep imports from directories that have an index file.
 * @author EyKettle
 */

import type { Rule } from "eslint";
import { existsSync } from "fs";
import { createPathsMatcher, getTsconfig } from "get-tsconfig";
import path from "path";

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const BARREL_FILE_BASE = "index";

function findProjectRoot(startDir: string): string | null {
  let currentDir = startDir;
  while (true) {
    if (existsSync(path.join(currentDir, "package.json"))) return currentDir;
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return null;
    currentDir = parentDir;
  }
}

function formatAsRelativePath(from: string, to: string): string {
  let relative = path.relative(from, to) || ".";
  relative = relative.split(path.sep).join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

function isInternalImport(barrelDir: string, currentFileDir: string): boolean {
  const relativePathToBarrel = path.relative(barrelDir, currentFileDir);
  return (
    !relativePathToBarrel.startsWith("..") &&
    !path.isAbsolute(relativePathToBarrel)
  );
}

function findExistPath(possiblePaths: string[]): string | null {
  for (const rawPath of possiblePaths) {
    if (existsSync(rawPath)) return rawPath;
    for (const ext of EXTENSIONS) {
      const pathWithExt = rawPath + ext;
      if (existsSync(pathWithExt)) return pathWithExt;
    }
  }
  return null;
}

function calculateSuggestedPath(
  detectAliases: boolean,
  currentFileDir: string,
  barrelDir: string,
  importPath: string,
  resolvedImportPath: string,
  moduleResolution?: string,
  suggestPattern?: string,
): string {
  let suggestedPath: string;
  if (detectAliases) {
    const relativePath = path.relative(resolvedImportPath, barrelDir);
    const segmentsUp = relativePath
      .split(path.sep)
      .filter((s) => s === "..").length;
    suggestedPath = importPath;
    for (let i = 0; i < segmentsUp; i++) {
      suggestedPath = path.posix.dirname(suggestedPath);
    }
  } else {
    suggestedPath = formatAsRelativePath(currentFileDir, barrelDir);
  }

  if (moduleResolution === "nodenext" || moduleResolution === "node16") {
    return suggestedPath + "/index.js";
  }

  if (suggestPattern && suggestPattern !== "/") {
    return suggestedPath + suggestPattern;
  }

  return suggestedPath;
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow deep imports from directories that have an index file.",
      recommended: true,
      url: "https://github.com/EyKettle/eslint-plugin-barrel-boundary/blob/main/docs/rules/enforce-barrel-files.md",
    },
    messages: {
      noDeepImport:
        "Import from '{{directory}}' instead of '{{importPath}}'. Module is behind a barrel file.",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          detectAliases: {
            type: "boolean",
          },
          suggestPattern: {
            type: "string",
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const currentFileDir = path.dirname(context.filename);
    const projectRoot = findProjectRoot(currentFileDir);

    const options = context.options[0] || {};
    const detectAliases = options.detectAliases ?? false;
    const userSuggestPattern = options.suggestPattern;

    let matcher: ((path: string) => string[]) | null = null;
    let moduleResolution: string | undefined;
    const tsconfig = getTsconfig(currentFileDir);
    if (tsconfig) {
      moduleResolution = tsconfig.config.compilerOptions?.moduleResolution as string | undefined;
      if (detectAliases) matcher = createPathsMatcher(tsconfig);
    }

    const barrelDirCache = new Map<string, string | null>();
    const barrelPresenceCache = new Map<string, boolean>();

    function isDirectoryWithBarrel(dirPath: string): boolean {
      const cached = barrelPresenceCache.get(dirPath);
      if (cached !== undefined) return cached;

      for (const ext of EXTENSIONS) {
        if (existsSync(path.join(dirPath, BARREL_FILE_BASE + ext))) {
          barrelPresenceCache.set(dirPath, true);
          return true;
        }
      }
      barrelPresenceCache.set(dirPath, false);
      return false;
    }

    function findBarrelDirectory(startDir: string): string | null {
      if (barrelDirCache.has(startDir)) return barrelDirCache.get(startDir)!;

      let currentDir = startDir;
      let nearestBarrel: string | null = null;

      while (true) {
        if (!projectRoot || currentDir === projectRoot) break;
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break;

        if (isDirectoryWithBarrel(currentDir)) {
          if (!nearestBarrel) {
            nearestBarrel = currentDir;
          }
        }

        currentDir = parentDir;
      }

      barrelDirCache.set(startDir, nearestBarrel);
      return nearestBarrel;
    }

    function importTargetsBarrelEntry(resolvedPath: string): boolean {
      if (isDirectoryWithBarrel(resolvedPath)) return true;
      const filename = path.basename(resolvedPath);
      if (filename === BARREL_FILE_BASE) return true;
      const ext = path.extname(filename);
      const base = path.basename(filename, ext);
      return base === BARREL_FILE_BASE && EXTENSIONS.includes(ext);
    }

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        if (typeof importPath !== "string") return;

        let resolvedImportPath: string | null = null;

        if (importPath.startsWith(".")) {
          resolvedImportPath = path.resolve(currentFileDir, importPath);
        } else if (matcher) {
          const possiblePaths = matcher(importPath);
          const actualPath = findExistPath(possiblePaths);
          if (actualPath) resolvedImportPath = actualPath;
        }
        if (!resolvedImportPath) return;

        const importTargetDir = isDirectoryWithBarrel(resolvedImportPath)
          ? resolvedImportPath
          : path.dirname(resolvedImportPath);

        const nearestBarrel = findBarrelDirectory(importTargetDir);
        if (!nearestBarrel) return;

        let effectiveBarrel = nearestBarrel;
        let checkDir = path.dirname(nearestBarrel);
        while (barrelPresenceCache.get(checkDir) === true) {
          if (!isInternalImport(checkDir, currentFileDir)) {
            effectiveBarrel = checkDir;
            checkDir = path.dirname(checkDir);
          } else {
            break;
          }
        }

        if (isInternalImport(effectiveBarrel, currentFileDir)) return;

        if (
          importTargetDir === effectiveBarrel &&
          importTargetsBarrelEntry(resolvedImportPath)
        )
          return;

        const suggestedPath = calculateSuggestedPath(
          detectAliases && matcher,
          currentFileDir,
          effectiveBarrel,
          importPath,
          resolvedImportPath,
          moduleResolution,
          userSuggestPattern,
        );
        context.report({
          node: node.source,
          messageId: "noDeepImport",
          data: {
            directory: suggestedPath,
            importPath,
          },
          fix(fixer) {
            const quote = node.source.raw?.startsWith("'") ? "'" : '"';
            return fixer.replaceText(
              node.source,
              `${quote}${suggestedPath}${quote}`,
            );
          },
        });
      },
    };
  },
};

export default rule;
