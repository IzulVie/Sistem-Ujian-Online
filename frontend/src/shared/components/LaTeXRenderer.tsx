import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LaTeXRendererProps {
  text: string;
}

interface MathToken {
  type: 'text' | 'inline-math' | 'block-math';
  content: string;
}

export const LaTeXRenderer: React.FC<LaTeXRendererProps> = ({ text }) => {
  if (!text) return null;

  // Memoize tokenization for high-performance rendering of questions and answers
  const tokens = useMemo<MathToken[]>(() => {
    const result: MathToken[] = [];
    
    // Regular expression matching:
    // 1. $$...$$ (Display block math)
    // 2. \[...\] (Display block math)
    // 3. $...$ (Inline math)
    // 4. \(...\) (Inline math)
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?!\$)[\s\S]*?\$|\\\([\s\S]*?\\\))/g;
    
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const matchStart = match.index;
      const matchStr = match[0];

      // Push preceding text if any
      if (matchStart > lastIndex) {
        result.push({
          type: 'text',
          content: text.slice(lastIndex, matchStart)
        });
      }

      // Determine math type and strip delimiters
      if (matchStr.startsWith('$$') && matchStr.endsWith('$$')) {
        result.push({
          type: 'block-math',
          content: matchStr.slice(2, -2).trim()
        });
      } else if (matchStr.startsWith('\\[') && matchStr.endsWith('\\]')) {
        result.push({
          type: 'block-math',
          content: matchStr.slice(2, -2).trim()
        });
      } else if (matchStr.startsWith('\\(') && matchStr.endsWith('\\)')) {
        result.push({
          type: 'inline-math',
          content: matchStr.slice(2, -2).trim()
        });
      } else if (matchStr.startsWith('$') && matchStr.endsWith('$')) {
        result.push({
          type: 'inline-math',
          content: matchStr.slice(1, -1).trim()
        });
      }

      lastIndex = matchStart + matchStr.length;
    }

    // Push remaining text
    if (lastIndex < text.length) {
      result.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return result;
  }, [text]);

  return (
    <span className="inline leading-relaxed">
      {tokens.map((token, index) => {
        if (token.type === 'block-math') {
          try {
            const html = katex.renderToString(token.content, {
              throwOnError: false,
              displayMode: true,
            });
            return (
              <span
                key={index}
                dangerouslySetInnerHTML={{ __html: html }}
                className="my-3 py-2 px-3 block overflow-x-auto rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100/80 dark:border-indigo-500/20 text-slate-900 dark:text-indigo-100 font-medium shadow-xs"
              />
            );
          } catch (err) {
            console.error('KaTeX block rendering error:', err);
            return <code key={index} className="text-rose-600 dark:text-rose-400 px-1 bg-rose-50 dark:bg-rose-950/20 rounded">$${token.content}$$</code>;
          }
        }

        if (token.type === 'inline-math') {
          try {
            const html = katex.renderToString(token.content, {
              throwOnError: false,
              displayMode: false,
            });
            return (
              <span
                key={index}
                dangerouslySetInnerHTML={{ __html: html }}
                className="inline-block mx-0.5 align-middle font-medium px-1 py-0.5 rounded-md bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 border border-indigo-100/60 dark:border-indigo-500/20"
              />
            );
          } catch (err) {
            console.error('KaTeX inline rendering error:', err);
            return <code key={index} className="text-rose-600 dark:text-rose-400 px-1 bg-rose-50 dark:bg-rose-950/20 rounded">${token.content}$</code>;
          }
        }

        return (
          <span key={index} className="whitespace-pre-wrap">
            {token.content}
          </span>
        );
      })}
    </span>
  );
};
