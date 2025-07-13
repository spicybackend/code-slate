export const LANGUAGE_OPTIONS = [
  { value: "jsx", label: "JavaScript (JSX)" },
  { value: "tsx", label: "TypeScript (TSX)" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "python", label: "Python" },
  { value: "ruby", label: "Ruby" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
] as const;

export type LanguageValue = (typeof LANGUAGE_OPTIONS)[number]["value"];

export const DEFAULT_LANGUAGE: LanguageValue = "jsx";
