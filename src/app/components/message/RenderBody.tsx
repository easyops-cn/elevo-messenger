import React, { ReactNode, useMemo } from 'react';
import parse, { HTMLReactParserOptions } from 'html-react-parser';
import Linkify from 'linkify-react';
import { Opts } from 'linkifyjs';
import { MessageEmptyContent } from './content';
import { sanitizeCustomHtml } from '../../utils/sanitize';
import { highlightText, scaleSystemEmoji } from '../../plugins/react-custom-html-parser';

type RenderBodyProps = {
  body: string;
  customBody?: string;

  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
};
export function RenderBody({
  body,
  customBody,
  highlightRegex,
  htmlReactParserOptions,
  linkifyOpts,
}: RenderBodyProps) {
  const customBodyContent = useMemo<ReactNode>(() => {
    if (customBody === undefined) return undefined;
    if (customBody === '') return <MessageEmptyContent />;
    return parse(sanitizeCustomHtml(customBody), htmlReactParserOptions);
  }, [customBody, htmlReactParserOptions]);

  const plainBodyContent = useMemo<ReactNode>(
    () => (
      <Linkify options={linkifyOpts}>
        {highlightRegex
          ? highlightText(highlightRegex, scaleSystemEmoji(body))
          : scaleSystemEmoji(body)}
      </Linkify>
    ),
    [body, highlightRegex, linkifyOpts],
  );

  if (customBody !== undefined) {
    return customBodyContent;
  }

  if (body === '') {
    return <MessageEmptyContent />;
  }

  return plainBodyContent;
}
