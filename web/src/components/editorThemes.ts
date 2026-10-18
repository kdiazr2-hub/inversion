// Editor colour themes and props, kept apart from CodeMirror so screens can list the themes
// without loading the editor.

export interface Palette {
  bg: string;
  gutter: string;
  text: string;
  dim: string;
  keyword: string;
  string: string;
  number: string;
  func: string;
  comment: string;
  def: string;
  cursor: string;
  select: string;
  active: string;
}

export const EDITOR_THEMES: Record<string, Palette> = {
  noche: { bg: "#0b1120", gutter: "#0f1830", text: "#e9eef8", dim: "#5f6f94", keyword: "#ff9fc2", string: "#f2c14e", number: "#a996ff", func: "#5ad1e8", comment: "#7f8fb3", def: "#6fd672", cursor: "#f2c14e", select: "#2c3f6b", active: "#121c35" },
  contraste: { bg: "#000000", gutter: "#000000", text: "#ffffff", dim: "#b0b0b0", keyword: "#ffd84a", string: "#7dff7d", number: "#7fd8ff", func: "#ffffff", comment: "#d0d0d0", def: "#ffb36b", cursor: "#ffffff", select: "#33557a", active: "#151515" },
  bosque: { bg: "#0e1a14", gutter: "#122119", text: "#e3f2e6", dim: "#5d7a66", keyword: "#f0c674", string: "#a7e08b", number: "#f59e6b", func: "#8fd3c2", comment: "#7d9a86", def: "#ffe08a", cursor: "#a7e08b", select: "#24432f", active: "#13241a" },
  atardecer: { bg: "#1c1220", gutter: "#21152a", text: "#fbe9e2", dim: "#7d6380", keyword: "#ff8a65", string: "#ffd166", number: "#f78fb3", func: "#9ad0ec", comment: "#a58aa8", def: "#ffb38a", cursor: "#ffd166", select: "#45304d", active: "#24172b" },
};

export interface CodeEditorProps {
  value: string;
  onChange: (v: string) => void;
  onRun?: () => void;
  onCheck?: () => void;
  theme?: string;
  fontSize?: number;
  errorLine?: number | null;
  label: string;
  minHeight?: number;
  placeholder?: string;
  readOnly?: boolean;
}
