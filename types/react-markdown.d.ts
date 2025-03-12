declare module "react-markdown" {
  import React from "react";

  interface ReactMarkdownProps {
    children: string;
    components?: Record<string, React.ComponentType<any>>;
  }

  const ReactMarkdown: React.FC<ReactMarkdownProps>;
  export default ReactMarkdown;
}

declare module "react-syntax-highlighter" {
  import React from "react";

  interface SyntaxHighlighterProps {
    children: string;
    style?: any;
    language?: string;
    PreTag?: string;
    className?: string;
  }

  export const Prism: React.FC<SyntaxHighlighterProps>;
}

declare module "react-syntax-highlighter/dist/cjs/styles/prism" {
  export const oneDark: any;
  export const oneLight: any;
}
