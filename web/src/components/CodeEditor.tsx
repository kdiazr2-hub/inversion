// CodeMirror 6 editor: Python highlighting, line numbers, auto-indent (4 spaces),
// Tab to indent, Ctrl/Cmd+Enter to run, Shift+Ctrl/Cmd+Enter to check.
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { bracketMatching, HighlightStyle, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import {
  Decoration,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
} from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { useEffect, useRef } from "react";

const errorLineDeco = Decoration.line({ class: "cm-errorLine" });

interface Palette {
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

function themeExtensions(name: string, fontSize: number) {
  const p = EDITOR_THEMES[name] ?? EDITOR_THEMES.noche;
  return [
    EditorView.theme(
      {
        "&": { backgroundColor: p.bg, color: p.text, fontSize: `${fontSize}px` },
        ".cm-content": { caretColor: p.cursor, padding: "8px 0" },
        ".cm-cursor, .cm-dropCursor": { borderLeftColor: p.cursor, borderLeftWidth: "2px" },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: p.select + " !important" },
        ".cm-gutters": { backgroundColor: p.gutter, color: p.dim, border: "none" },
        ".cm-activeLine": { backgroundColor: p.active },
        ".cm-activeLineGutter": { backgroundColor: p.active, color: p.text },
        ".cm-matchingBracket": { outline: `1px solid ${p.func}`, backgroundColor: "transparent" },
        ".cm-placeholder": { color: p.dim },
        ".cm-tooltip": { backgroundColor: p.gutter, color: p.text, border: `1px solid ${p.select}` },
        ".cm-errorLine": { backgroundColor: "rgba(255,122,89,0.18)" },
      },
      { dark: true },
    ),
    syntaxHighlighting(
      HighlightStyle.define([
        { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.moduleKeyword], color: p.keyword },
        { tag: [t.string, t.special(t.string)], color: p.string },
        { tag: [t.number, t.bool, t.null], color: p.number },
        { tag: [t.function(t.variableName), t.function(t.propertyName)], color: p.func },
        { tag: [t.definition(t.variableName), t.definition(t.function(t.variableName)), t.className], color: p.def },
        { tag: t.comment, color: p.comment, fontStyle: "italic" },
        { tag: [t.operator, t.punctuation], color: p.text },
      ]),
    ),
  ];
}

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

export function CodeEditor({ value, onChange, onRun, onCheck, theme = "noche", fontSize = 15, errorLine, label, minHeight = 220, placeholder, readOnly }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const themeComp = useRef(new Compartment());
  const errorComp = useRef(new Compartment());
  const handlers = useRef({ onChange, onRun, onCheck });
  handlers.current = { onChange, onRun, onCheck };

  useEffect(() => {
    const runKeys = keymap.of([
      { key: "Mod-Enter", run: () => (handlers.current.onRun?.(), true) },
      { key: "Shift-Mod-Enter", run: () => (handlers.current.onCheck?.(), true) },
    ]);
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          runKeys,
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          indentUnit.of("    "),
          EditorState.tabSize.of(4),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          python(),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...completionKeymap, indentWithTab]),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ "aria-label": label }),
          EditorState.readOnly.of(Boolean(readOnly)),
          cmPlaceholder(placeholder ?? ""),
          themeComp.current.of(themeExtensions(theme, fontSize)),
          errorComp.current.of([]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) handlers.current.onChange(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    return () => v.destroy();
    // The editor is created once; later prop changes are applied through compartments below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value changes (reset, load solution) replace the document.
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: themeComp.current.reconfigure(themeExtensions(theme, fontSize)) });
  }, [theme, fontSize]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    let ext: ReturnType<typeof EditorView.decorations.of> | [] = [];
    if (errorLine && errorLine >= 1 && errorLine <= v.state.doc.lines) {
      const line = v.state.doc.line(errorLine);
      ext = EditorView.decorations.of(Decoration.set([errorLineDeco.range(line.from)]));
    }
    v.dispatch({ effects: errorComp.current.reconfigure(ext) });
  }, [errorLine, value]);

  return <div ref={host} className="h-full overflow-hidden rounded-[2px]" style={{ minHeight }} data-testid="code-editor" />;
}
