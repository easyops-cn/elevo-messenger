import React, { HTMLAttributes, useCallback, useEffect, useState } from 'react';
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
  path?: string;
  showLineNumbers?: boolean;
} & HTMLAttributes<HTMLElement>;

export function ShikiCode({
  code,
  lang,
  path,
  showLineNumbers,
  className,
  onCopy,
  ...props
}: ShikiCodeProps) {
  const theme = useTheme();
  const [tokenLines, setTokenLines] = useState<HighlightedTokenLines>(() =>
    getPlainTokenLines(code),
  );

  useEffect(() => {
    let alive = true;
    const shikiTheme = getShikiThemeName(theme.kind);

    setTokenLines(getPlainTokenLines(code));
    codeToTokensBase({ code, language: lang, path, theme: shikiTheme })
      .then((result) => {
        if (alive) setTokenLines(result);
      })
      .catch(() => {
        if (alive) setTokenLines(getPlainTokenLines(code));
      });

    return () => {
      alive = false;
    };
  }, [code, lang, path, theme.kind]);

  const normalizedLang = normalizeLanguageName(lang);
  const codeClassName = className ?? (normalizedLang ? `language-${normalizedLang}` : undefined);
  const handleNumberedCopy = useCallback(
    (event: React.ClipboardEvent<HTMLElement>) => {
      onCopy?.(event);
      if (event.defaultPrevented) return;

      const root = event.currentTarget;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

      const ranges = Array.from({ length: selection.rangeCount }, (_, index) =>
        selection.getRangeAt(index),
      ).filter((range) => range.intersectsNode(root));
      if (ranges.length === 0) return;

      const selectedText = Array.from(
        root.querySelectorAll<HTMLElement>('[data-shiki-line-content="true"]'),
      )
        .flatMap((line) => {
          const lineText = ranges
            .map((range) => {
              if (!range.intersectsNode(line)) return '';

              const lineRange = document.createRange();
              lineRange.selectNodeContents(line);
              if (line.contains(range.startContainer)) {
                lineRange.setStart(range.startContainer, range.startOffset);
              }
              if (line.contains(range.endContainer)) {
                lineRange.setEnd(range.endContainer, range.endOffset);
              }

              const text = lineRange.toString().replace(/\n$/, '');
              lineRange.detach();
              return text;
            })
            .join('');

          return ranges.some((range) => range.intersectsNode(line)) ? [lineText] : [];
        })
        .join('\n');

      if (selectedText.length === 0) return;
      event.clipboardData.setData('text/plain', selectedText);
      event.preventDefault();
    },
    [onCopy],
  );

  if (showLineNumbers) {
    return (
      <code
        {...props}
        className={classNames(css.NumberedCode, codeClassName)}
        onCopy={handleNumberedCopy}
      >
        {tokenLines.map((line, lineIndex) => (
          <span key={lineIndex} className={css.Line}>
            <span className={css.LineNo} aria-hidden="true">
              {lineIndex + 1}
            </span>
            <span className={css.LineContent} data-shiki-line-content="true">
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
