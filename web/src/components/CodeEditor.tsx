// Code editor for every screen. CodeMirror is a large download, so it loads in its own chunk the
// first time an editor appears; until then the code is shown read-only with the same colours.
import { lazy, Suspense } from "react";
import { EDITOR_THEMES, type CodeEditorProps } from "./editorThemes";

export { EDITOR_THEMES, type CodeEditorProps } from "./editorThemes";

const CodeMirrorEditor = lazy(() => import("./CodeMirrorEditor").then((m) => ({ default: m.CodeMirrorEditor })));

function EditorPlaceholder({ value, theme = "noche", fontSize = 15, label, minHeight = 220 }: CodeEditorProps) {
  const p = EDITOR_THEMES[theme] ?? EDITOR_THEMES.noche;
  return (
    <div className="h-full overflow-hidden rounded-[2px] relative" style={{ minHeight, background: p.bg }} aria-busy="true" aria-label={`${label} (cargando el editor)`}>
      <pre className="font-mono p-3 m-0 whitespace-pre overflow-hidden" style={{ color: p.text, fontSize }}>
        {value}
      </pre>
      <span className="absolute right-2 bottom-2 text-xs" style={{ color: p.dim }} role="status">
        Cargando el editor…
      </span>
    </div>
  );
}

export function CodeEditor(props: CodeEditorProps) {
  return (
    <Suspense fallback={<EditorPlaceholder {...props} />}>
      <CodeMirrorEditor {...props} />
    </Suspense>
  );
}
