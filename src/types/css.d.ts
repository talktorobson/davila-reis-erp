// CSS Module declarations for TypeScript
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// Allow importing CSS files without module extension
declare module '*.css?inline' {
  const css: string;
  export default css;
}

// Global CSS declarations for custom properties
declare global {
  namespace React {
    interface CSSProperties {
      [key: `--${string}`]: string | number | undefined;
    }
  }
}

export {};