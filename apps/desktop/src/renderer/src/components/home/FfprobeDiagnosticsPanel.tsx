import type { FfprobeDiagnosticRecord } from '@dubforge/types';
import type { VideoImportError } from '@dubforge/types';

interface FfprobeDiagnosticsPanelProps {
  readonly importError: VideoImportError;
  readonly diagnostics: readonly FfprobeDiagnosticRecord[];
}

function formatExitCode(exitCode: number | null): string {
  return exitCode === null ? 'unknown' : String(exitCode);
}

export function FfprobeDiagnosticsPanel({
  importError,
  diagnostics,
}: FfprobeDiagnosticsPanelProps): React.JSX.Element | null {
  const latest = diagnostics.at(-1) ?? null;
  const ffprobeDiagnostics = importError.ffprobeDiagnostics ?? latest?.diagnostics ?? null;

  if (ffprobeDiagnostics === null && latest === null) {
    return null;
  }

  const activeDiagnostics = ffprobeDiagnostics ?? latest?.diagnostics;

  if (activeDiagnostics === undefined) {
    return null;
  }

  return (
    <section
      className="border-border bg-card/60 mt-4 rounded-xl border p-4 text-left"
      aria-label="ffprobe diagnostics"
    >
      <h4 className="text-sm font-medium">ffprobe diagnostics</h4>
      <dl className="mt-3 space-y-2 font-mono text-xs">
        <div>
          <dt className="text-muted-foreground">Executable</dt>
          <dd className="mt-1 break-all">{activeDiagnostics.executablePath}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Command</dt>
          <dd className="mt-1 break-all">{activeDiagnostics.command}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Exit code</dt>
          <dd className="mt-1">{formatExitCode(activeDiagnostics.exitCode)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Working directory</dt>
          <dd className="mt-1 break-all">{activeDiagnostics.workingDirectory}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Duration</dt>
          <dd className="mt-1">{String(activeDiagnostics.durationMs)} ms</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">stdout</dt>
          <dd className="mt-1 whitespace-pre-wrap break-all">
            {activeDiagnostics.stdout.length > 0 ? activeDiagnostics.stdout : '(empty)'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">stderr</dt>
          <dd className="mt-1 whitespace-pre-wrap break-all">
            {activeDiagnostics.stderr.length > 0 ? activeDiagnostics.stderr : '(empty)'}
          </dd>
        </div>
      </dl>
      {latest !== null ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Last attempt: {new Date(latest.timestamp).toLocaleString()} · {latest.filePath}
        </p>
      ) : null}
    </section>
  );
}
