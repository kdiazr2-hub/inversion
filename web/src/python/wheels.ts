// Pure-Python packages that are not in the Pyodide distribution. Their official wheels ship with
// the game (public/wheels) so they install without PyPI, work offline once cached and keep a fixed
// version. Module name → wheel file.
export const WHEELS: Record<string, string> = {
  seaborn: "seaborn-0.13.2-py3-none-any.whl",
};
