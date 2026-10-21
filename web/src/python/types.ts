export interface PyError {
  type: string;
  message: string;
  line: number | null;
  hint: string;
}

export interface TestResult {
  name: string;
  description: string;
  passed: boolean;
  message: string;
}

export interface RunResult {
  stdout: string;
  error: PyError | null;
  tests: TestResult[];
  figures: string[];
  passed: boolean;
  /** Wall-clock milliseconds spent executing (excludes package downloads). */
  durationMs: number;
}

export interface RunRequest {
  code: string;
  tests?: string;
  stdin?: string[];
  files?: Record<string, string>;
}

export type WorkerIn =
  | { kind: "init"; indexURL: string; harness: string; wheels: Record<string, string> }
  | ({ kind: "run"; id: number } & RunRequest);

export type WorkerOut =
  | { kind: "ready"; version: string }
  | { kind: "init-error"; message: string }
  | { kind: "status"; id: number; phase: "packages" | "running"; detail?: string }
  | { kind: "result"; id: number; result: RunResult }
  | { kind: "run-error"; id: number; message: string };
