// Where Pyodide is downloaded from. Shared by the runner and the build (which tells the service
// worker which URLs to keep for offline use).
export const PYODIDE_VERSION = "0.28.3";

export const pyodideUrl = (override?: string): string => override || `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
