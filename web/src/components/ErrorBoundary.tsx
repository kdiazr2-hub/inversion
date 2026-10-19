// Shows a screen's error instead of a blank page, for example when a lazily loaded part of the
// game (a lab, the editor, a world's missions) fails to download.
import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="px-panel p-6 max-w-xl flex flex-col gap-3" role="alert">
        <h1 className="px-title text-xl text-ember">Esta pantalla no se pudo mostrar</h1>
        <p className="text-sm font-mono break-words">{error.message || String(error)}</p>
        <p className="text-sm text-muted">Si estás sin conexión, vuelve a conectarte. Tu progreso está guardado en este navegador.</p>
        <button className="btn-gold self-start" onClick={() => location.reload()}>
          Recargar la página
        </button>
      </div>
    );
  }
}
