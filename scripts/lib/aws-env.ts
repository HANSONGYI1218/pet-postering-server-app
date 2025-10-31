export type EnvMap = Record<string, string>;

const escapeSingleQuotes = (value: string): string => value.replace(/'/g, "'\\''");

export const formatExportLines = (env: EnvMap): string[] =>
  Object.keys(env)
    .sort()
    .map((key) => {
      const rawValue = env[key] ?? '';
      const escaped = escapeSingleQuotes(rawValue);
      return `export ${key}='${escaped}'`;
    });

export const serializeEnvFile = (env: EnvMap): string =>
  Object.keys(env)
    .sort()
    .map((key) => `${key}=${env[key] ?? ''}`)
    .join('\n');
