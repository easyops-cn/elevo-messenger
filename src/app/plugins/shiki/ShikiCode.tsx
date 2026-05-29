import React, { HTMLAttributes, useEffect, useState } from 'react';
import type { ThemedToken } from 'shiki';
import { useTheme } from '../../hooks/useTheme';
import {
  codeToTokensBase,
  getPlainTokenLines,
  getShikiThemeName,
  getTokenStyle,
  normalizeLanguageName,
  type HighlightedTokenLines,
} from './highlight';

type ShikiCodeProps = {
  code: string;
  lang?: string;
} & HTMLAttributes<HTMLElement>;

export function ShikiCode({ code, lang, className, ...props }: ShikiCodeProps) {
  const theme = useTheme();
  const [tokenLines, setTokenLines] = useState<HighlightedTokenLines>(() =>
    getPlainTokenLines(code),
  );

  useEffect(() => {
    let alive = true;
    const shikiTheme = getShikiThemeName(theme.kind);

    setTokenLines(getPlainTokenLines(code));
    codeToTokensBase({ code, language: lang, theme: shikiTheme })
      .then((result) => {
        if (alive) setTokenLines(result);
      })
      .catch(() => {
        if (alive) setTokenLines(getPlainTokenLines(code));
      });

    return () => {
      alive = false;
    };
  }, [code, lang, theme.kind]);

  const normalizedLang = normalizeLanguageName(lang);
  const codeClassName = className ?? (normalizedLang ? `language-${normalizedLang}` : undefined);

  return (
    <code {...props} className={codeClassName}>
      {tokenLines.map((line, lineIndex) => (
        // eslint-disable-next-line react/no-array-index-key
        <React.Fragment key={lineIndex}>
          {line.map((token: ThemedToken, tokenIndex) => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={tokenIndex} style={getTokenStyle(token)}>
              {token.content}
            </span>
          ))}
          {lineIndex < tokenLines.length - 1 && '\n'}
        </React.Fragment>
      ))}
    </code>
  );
}
