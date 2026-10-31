// CodeMirror 6 editor (loaded on demand through CodeEditor.tsx): Python highlighting, line numbers, auto-indent (4 spaces),
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
import { useEffect, useId, useRef } from "react";
import { EDITOR_THEMES, type CodeEditorProps } from "./editorThemes";

const errorLineDeco = Decoration.line({ class: "cm-errorLine" });

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

export function CodeMirrorEditor({ value, onChange, onRun, onCheck, theme = "noche", fontSize = 15, errorLine, label, minHeight = 220, placeholder, readOnly }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const hintId = useId();
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
          EditorView.contentAttributes.of({ "aria-label": label, "aria-describedby": hintId }),
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

  return (
    <div className="group relative h-full">
      <div ref={host} className="h-full overflow-hidden rounded-[2px]" style={{ minHeight }} data-testid="code-editor" />
      {/* Tab indents inside the editor; keyboard users leave it with Escape and then Tab. */}
      <p id={hintId} className="hidden group-focus-within:block absolute right-2 bottom-1 z-10 pointer-events-none text-xs px-2 py-0.5 rounded-[2px] bg-ink/90 text-muted">
        {readOnly ? "Esc y después Tab: salir del editor" : "Ctrl (⌘ en Mac) + Intro: ejecutar · Esc y después Tab: salir del editor"}
      </p>
    </div>
  );
}
