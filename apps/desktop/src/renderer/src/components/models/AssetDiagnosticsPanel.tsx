import type { AssetDiagnostics, VerificationReport } from '@dubforge/types';
import { Badge } from '@dubforge/ui';

interface AssetDiagnosticsPanelProps {
  readonly diagnostics: AssetDiagnostics;
  readonly latestVerification: VerificationReport | null;
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${String(durationMs)} ms`;
  }

  return `${(durationMs / 1000).toFixed(2)} s`;
}

function stepLabel(code: VerificationReport['steps'][number]['code']): string {
  switch (code) {
    case 'exists':
      return 'Exists';
    case 'size':
      return 'Size';
    case 'sha256':
      return 'SHA256';
    case 'permissions':
      return 'Permissions';
    case 'readable':
      return 'Readable';
    case 'healthy':
      return 'Healthy';
  }
}

export function AssetDiagnosticsPanel({
  diagnostics,
  latestVerification,
}: AssetDiagnosticsPanelProps): React.JSX.Element {
  const verification = latestVerification ?? diagnostics.latestVerification;

  return (
    <section
      className="border-border bg-card/60 mt-4 rounded-xl border p-4 text-left"
      aria-label="Asset diagnostics"
    >
      <h4 className="text-sm font-medium">Asset diagnostics</h4>

      {verification !== null ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">Verification</p>
            <Badge variant={verification.valid ? 'success' : 'destructive'}>
              {verification.valid ? 'Passed' : 'Failed'}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {new Date(verification.checkedAt).toLocaleString()} ·{' '}
              {formatDuration(verification.durationMs)}
            </span>
          </div>
          <ol className="mt-3 space-y-2">
            {verification.steps.map((step) => (
              <li
                key={`${verification.id}-${step.code}`}
                className="border-border rounded-lg border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{stepLabel(step.code)}</span>
                  <Badge variant={step.passed ? 'success' : 'destructive'}>
                    {step.passed ? 'Pass' : 'Fail'}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {formatDuration(step.durationMs)}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1">{step.message}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm">No verification reports yet.</p>
      )}

      <div className="mt-6">
        <p className="text-sm font-medium">Download reports</p>
        {diagnostics.downloadReports.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">No download attempts recorded.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {diagnostics.downloadReports.map((report) => (
              <article
                key={report.id}
                className="border-border rounded-lg border p-3 font-mono text-xs"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 font-sans text-sm">
                  <Badge variant={report.success ? 'success' : 'destructive'}>
                    {report.success ? 'Success' : 'Failed'}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(report.createdAt).toLocaleString()} ·{' '}
                    {formatDuration(report.durationMs)}
                  </span>
                </div>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-muted-foreground">URL</dt>
                    <dd className="mt-1 break-all">{report.url}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Provider</dt>
                    <dd className="mt-1">{report.provider}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Redirect chain</dt>
                    <dd className="mt-1 break-all">{report.redirectChain.join(' → ')}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">HTTP status</dt>
                    <dd className="mt-1">
                      {report.httpStatus === null ? 'n/a' : String(report.httpStatus)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Content-Length</dt>
                    <dd className="mt-1">
                      {report.contentLength === null ? 'unknown' : String(report.contentLength)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Expected size</dt>
                    <dd className="mt-1">
                      {report.expectedSizeBytes === null
                        ? 'unknown'
                        : String(report.expectedSizeBytes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Downloaded size</dt>
                    <dd className="mt-1">{String(report.downloadedSizeBytes)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">SHA256 expected</dt>
                    <dd className="mt-1 break-all">{report.sha256Expected ?? 'n/a'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">SHA256 actual</dt>
                    <dd className="mt-1 break-all">{report.sha256Actual ?? 'n/a'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">MIME type</dt>
                    <dd className="mt-1">{report.mimeType ?? 'unknown'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Retry count</dt>
                    <dd className="mt-1">{String(report.retryCount)}</dd>
                  </div>
                  {report.responseBody !== null ? (
                    <div>
                      <dt className="text-muted-foreground">Response body</dt>
                      <dd className="mt-1 whitespace-pre-wrap break-all">{report.responseBody}</dd>
                    </div>
                  ) : null}
                  {report.filesystemError !== null ? (
                    <div>
                      <dt className="text-muted-foreground">Filesystem error</dt>
                      <dd className="mt-1 break-all">{report.filesystemError}</dd>
                    </div>
                  ) : null}
                  {report.errorMessage !== null ? (
                    <div>
                      <dt className="text-muted-foreground">Error</dt>
                      <dd className="mt-1 break-all">{report.errorMessage}</dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
