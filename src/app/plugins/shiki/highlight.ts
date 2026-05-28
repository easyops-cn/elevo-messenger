import type { CSSProperties } from 'react';
import type { HighlighterCore } from 'shiki/core';
import type { BundledLanguage, ThemedToken } from 'shiki';
import { ThemeKind } from '../../hooks/useTheme';

export type LanguageBundle = typeof import('shiki/langs');
export type HighlightedTokenLines = ThemedToken[][];
export type ShikiThemeName = 'github-dark' | 'github-light';

let codeHighlighterPromise: Promise<HighlighterCore> | undefined;
let languageBundlePromise: Promise<LanguageBundle> | undefined;

export function getLanguageBundle(): Promise<LanguageBundle> {
  if (!languageBundlePromise) {
    languageBundlePromise = import('shiki/langs');
  }

  return languageBundlePromise;
}

export function getCodeHighlighter(): Promise<HighlighterCore> {
  if (!codeHighlighterPromise) {
    codeHighlighterPromise = Promise.all([
      import('shiki/core'),
      import('shiki/engine-oniguruma'),
      import('shiki/themes/github-dark.mjs'),
      import('shiki/themes/github-light.mjs'),
    ]).then(
      ([
        { createHighlighterCore },
        { createOnigurumaEngine },
        { default: githubDarkTheme },
        { default: githubLightTheme },
      ]) =>
        createHighlighterCore({
          themes: [githubDarkTheme, githubLightTheme],
          langs: [],
          engine: createOnigurumaEngine(import('shiki/wasm')),
        })
    );
  }

  return codeHighlighterPromise;
}

const languageMap: Record<string, string> = {
  js: 'javascript',
  rs: 'rust',
  ts: 'typescript',
};

const fileNameLanguageMap: Record<string, string> = {
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  rakefile: 'ruby',
  gemfile: 'ruby',
  cargo: 'toml',
};

export function getShikiThemeName(themeKind: ThemeKind): ShikiThemeName {
  return themeKind === ThemeKind.Dark ? 'github-dark' : 'github-light';
}

export function normalizeLanguageName(language?: string): string | undefined {
  const normalized = language?.replace(/^language-/, '').trim().toLowerCase();
  if (!normalized) return undefined;
  return languageMap[normalized] ?? normalized;
}

function getPathLanguageCandidates(path: string): string[] {
  const fileName = path.split('/').pop()?.toLowerCase() ?? '';
  const candidates: string[] = [];
  const mappedFileName = fileNameLanguageMap[fileName];
  if (mappedFileName) candidates.push(mappedFileName);

  if (fileName.endsWith('.d.ts')) candidates.push('typescript');

  const parts = fileName.split('.').filter(Boolean);
  if (parts.length > 1) {
    const extension = normalizeLanguageName(parts[parts.length - 1]);
    if (extension) candidates.push(extension);

    if (extension === 'lock' && parts.length > 2) {
      const lockSource = normalizeLanguageName(parts[parts.length - 2]);
      if (lockSource) candidates.push(lockSource);
    }
  }

  return candidates;
}

function resolveLanguage(candidate: string, bundle: LanguageBundle): BundledLanguage | undefined {
  const { bundledLanguages, bundledLanguagesAlias, bundledLanguagesInfo } = bundle;

  if (candidate in bundledLanguages) return candidate as BundledLanguage;

  const aliasTarget = bundledLanguagesAlias[candidate as keyof typeof bundledLanguagesAlias];
  if (aliasTarget && aliasTarget in bundledLanguages) return aliasTarget as BundledLanguage;

  const info = bundledLanguagesInfo.find(
    (item) => item.id === candidate || item.aliases?.includes(candidate)
  );
  if (info?.id && info.id in bundledLanguages) return info.id as BundledLanguage;

  return undefined;
}

export function inferLanguage(
  input: { language?: string; path?: string },
  bundle: LanguageBundle
): BundledLanguage | 'text' {
  const candidates = [
    normalizeLanguageName(input.language),
    ...(input.path ? getPathLanguageCandidates(input.path) : []),
  ].filter((candidate): candidate is string => Boolean(candidate));

  const language = candidates
    .map((candidate) => resolveLanguage(candidate, bundle))
    .find((candidate): candidate is BundledLanguage => Boolean(candidate));

  return language ?? 'text';
}

export async function ensureLanguage(
  highlighter: HighlighterCore,
  bundle: LanguageBundle,
  lang: BundledLanguage | 'text'
): Promise<void> {
  if (lang === 'text' || highlighter.getLoadedLanguages().includes(lang)) return;

  const loader = bundle.bundledLanguages[lang];
  if (!loader) return;
  const module = await loader();
  highlighter.loadLanguageSync(module.default);
}

export async function codeToTokensBase({
  code,
  language,
  path,
  theme,
}: {
  code: string;
  language?: string;
  path?: string;
  theme: ShikiThemeName;
}): Promise<HighlightedTokenLines> {
  const [highlighter, bundle] = await Promise.all([getCodeHighlighter(), getLanguageBundle()]);
  const lang = inferLanguage({ language, path }, bundle);
  await ensureLanguage(highlighter, bundle, lang);
  return highlighter.codeToTokensBase(code, { lang, theme });
}

export function getTokenStyle(token: ThemedToken): CSSProperties {
  const fontStyle = token.fontStyle ?? 0;
  const hasStyle = (flag: number) => fontStyle > 0 && Math.floor(fontStyle / flag) % 2 === 1;

  return {
    color: token.color,
    fontStyle: hasStyle(1) ? 'italic' : undefined,
    fontWeight: hasStyle(2) ? 700 : undefined,
    textDecoration: hasStyle(4) ? 'underline' : undefined,
  };
}

export function getPlainTokenLines(code: string): HighlightedTokenLines {
  return code.split('\n').map((line) => [{ content: line } as ThemedToken]);
}
