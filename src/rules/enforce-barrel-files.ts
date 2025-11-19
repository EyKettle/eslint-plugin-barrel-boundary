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

function isBarrelFile(importPath: string): boolean {
  const importedFilename = path.basename(importPath);
  if (importedFilename === BARREL_FILE_BASE) return true;

  const ext = path.extname(importedFilename);
  const base = path.basename(importedFilename, ext);

  return base === BARREL_FILE_BASE && EXTENSIONS.includes(ext);
}

function isDirectoryWithBarrel(resolvedImportPath: string): boolean {
  for (const ext of EXTENSIONS) {
    if (existsSync(path.join(resolvedImportPath, BARREL_FILE_BASE + ext)))
      return true;
  }
  return false;
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
): string {
  if (detectAliases) {
    const relativePath = path.relative(resolvedImportPath, barrelDir);
    const segmentsUp = relativePath
      .split(path.sep)
      .filter((s) => s === "..").length;
    let suggestedPath = importPath;
    for (let i = 0; i < segmentsUp; i++) {
      suggestedPath = path.posix.dirname(suggestedPath);
    }
    return suggestedPath;
  } else return formatAsRelativePath(currentFileDir, barrelDir);
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

    let matcher: ((path: string) => string[]) | null = null;
    if (detectAliases) {
      const tsconfig = getTsconfig(currentFileDir);
      if (tsconfig) matcher = createPathsMatcher(tsconfig);
    }

    const barrelDirCache = new Map<string, string | null>();

    function findBarrelDirectory(startDir: string): string | null {
      if (barrelDirCache.has(startDir)) return barrelDirCache.get(startDir)!;

      let currentDir = startDir;
      while (true) {
        if (!projectRoot || currentDir === projectRoot) break;

        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break;

        for (const ext of EXTENSIONS) {
          const barrelFilePath = path.join(currentDir, BARREL_FILE_BASE + ext);
          if (existsSync(barrelFilePath)) {
            barrelDirCache.set(startDir, currentDir);
            return currentDir;
          }
        }

        currentDir = path.dirname(currentDir);
      }
      barrelDirCache.set(startDir, null);
      return null;
    }

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        if (typeof importPath !== "string") return;
        if (isBarrelFile(importPath)) return;

        let resolvedImportPath: string | null = null;

        if (importPath.startsWith(".")) {
          resolvedImportPath = path.resolve(currentFileDir, importPath);
        } else if (matcher) {
          const possiblePaths = matcher(importPath);
          const actualPath = findExistPath(possiblePaths);
          if (actualPath) resolvedImportPath = actualPath;
        }
        if (!resolvedImportPath) return;

        if (isDirectoryWithBarrel(resolvedImportPath)) return;

        const importedModuleDir = path.dirname(resolvedImportPath);

        const barrelDir = findBarrelDirectory(importedModuleDir);

        if (barrelDir && !isInternalImport(barrelDir, currentFileDir)) {
          const suggestedPath = calculateSuggestedPath(
            detectAliases && matcher,
            currentFileDir,
            barrelDir,
            importPath,
            resolvedImportPath,
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
        }
      },
    };
  },
};

export default rule;
