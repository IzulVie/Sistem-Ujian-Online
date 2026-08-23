import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LaTeXRendererProps {
  text: string;
}

export const LaTeXRenderer: React.FC<LaTeXRendererProps> = ({ text }) => {
  if (!text) return null;

  // Split text by $$ to isolate LaTeX blocks
  const parts = text.split('$$');

  return (
    <span>
      {parts.map((part, index) => {
        const isMath = index % 2 === 1;

        if (isMath) {
          try {
            const html = katex.renderToString(part, {
              throwOnError: false,
              displayMode: part.includes('\n') || part.length > 35,
            });
            return (
              <span
                key={index}
                dangerouslySetInnerHTML={{ __html: html }}
                className="inline-block mx-1 align-middle text-indigo-300"
              />
            );
          } catch (err) {
            console.error('KaTeX rendering error:', err);
            return <code key={index} className="text-red-450 px-1 bg-red-950/20 rounded">$${part}$$</code>;
          }
        }

        return (
          <span key={index} className="whitespace-pre-wrap">
            {part}
          </span>
        );
      })}
    </span>
  );
};
