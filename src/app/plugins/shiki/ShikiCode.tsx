import React, { HTMLAttributes, useEffect, useState } from 'react';
import classNames from 'classnames';
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
import * as css from './ShikiCode.css';

type ShikiCodeProps = {
  code: string;
  lang?: string;
  showLineNumbers?: boolean;
} & HTMLAttributes<HTMLElement>;

export function ShikiCode({ code, lang, showLineNumbers, className, ...props }: ShikiCodeProps) {
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

  if (showLineNumbers) {
    return (
      <code {...props} className={classNames(css.NumberedCode, codeClassName)}>
        {tokenLines.map((line, lineIndex) => (
          <span key={lineIndex} className={css.Line}>
            <span className={css.LineNo}>{lineIndex + 1}</span>
            <span className={css.LineContent}>
              {line.map((token: ThemedToken, tokenIndex) => (
                <span key={tokenIndex} style={getTokenStyle(token)}>
                  {token.content}
                </span>
              ))}
              {'\n'}
            </span>
          </span>
        ))}
      </code>
    );
  }

  return (
    <code {...props} className={codeClassName}>
      {tokenLines.map((line, lineIndex) => (
        <React.Fragment key={lineIndex}>
          {line.map((token: ThemedToken, tokenIndex) => (
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
