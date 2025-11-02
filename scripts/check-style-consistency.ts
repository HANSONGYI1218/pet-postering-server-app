import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

interface Finding {
  file: string;
  line: number;
  message: string;
  snippet: string;
}

const ROOT = process.cwd();
const TARGET_DIRECTORIES = ['src'];
const SUPPORTED_EXTENSIONS = new Set(['.ts']);
const RULES = [
  {
    id: 'hangul',
    regex: /[가-힣]/u,
    message: 'Hangul characters are not allowed in source files.',
  },
  {
    id: 'eslint-disable',
    regex: /eslint-disable/u,
    message: 'eslint-disable comments are not allowed.',
  },
] as const;

async function main(): Promise<void> {
  const files = await collectFiles(
    TARGET_DIRECTORIES.map((relative) => path.join(ROOT, relative)),
  );
  const findings = (
    await Promise.all(files.map((file) => analyzeFile(path.relative(ROOT, file))))
  ).flat();

  if (findings.length === 0) {
    return;
  }

  report(findings);
  process.exitCode = 1;
}

async function collectFiles(directories: string[]): Promise<string[]> {
  const fileLists = await Promise.all(directories.map(walkDirectory));
  return fileLists.flat().filter((file) => SUPPORTED_EXTENSIONS.has(path.extname(file)));
}

async function walkDirectory(directory: string): Promise<string[]> {
  const entries = await readdir(directory);
  const tasks = entries.map(async (entry) => {
    const resolved = path.join(directory, entry);
    const stats = await stat(resolved);
    if (stats.isDirectory()) {
      return walkDirectory(resolved);
    }
    return [resolved];
  });
  const nested = await Promise.all(tasks);
  return nested.flat();
}

async function analyzeFile(relativePath: string): Promise<Finding[]> {
  const absolute = path.join(ROOT, relativePath);
  const content = await readFile(absolute, 'utf8');
  const lines = content.split(/\r?\n/u);
  return lines.flatMap((line, index) => evaluateLine(line, index + 1, relativePath));
}

function evaluateLine(line: string, lineNumber: number, file: string): Finding[] {
  return RULES.flatMap((rule) =>
    rule.regex.test(line)
      ? [
          {
            file,
            line: lineNumber,
            message: rule.message,
            snippet: line.trim(),
          },
        ]
      : [],
  );
}

function report(findings: readonly Finding[]): void {
  const grouped = findings.reduce<Record<string, Finding[]>>((acc, finding) => {
    const bucket = acc[finding.file] ?? (acc[finding.file] = []);
    bucket.push(finding);
    return acc;
  }, {});

  console.error('Style consistency check failed:');
  Object.entries(grouped)
    .sort(([fileA], [fileB]) => fileA.localeCompare(fileB))
    .forEach(([file, fileFindings]) => {
      console.error(`\n${file}`);
      fileFindings
        .sort((a, b) => a.line - b.line)
        .forEach((finding) => {
          console.error(`  L${String(finding.line)}: ${finding.message}`);
          if (finding.snippet) {
            console.error(`    ${finding.snippet}`);
          }
        });
    });
}

void main();
