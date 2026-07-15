import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@dubforge/ui';
import type { JobDefinition, JobEstimation, JobValidationResult } from '@dubforge/job-config';
import {
  getEnabledLanguages,
  getTargetLanguages,
  getVoicesForLanguage,
  MOCK_VOICES,
  TRANSLATION_PROFILES,
} from '@dubforge/job-config';
import { formatBytes } from '../../lib/format';

interface ReviewPanelProps {
  definition: JobDefinition;
  estimation: JobEstimation;
  validation: JobValidationResult;
  isStarting: boolean;
  startError: string | null;
  onStart: () => void;
}

function getVoiceLabel(languageCode: string, voiceId: string | undefined): string {
  if (voiceId === undefined) {
    return 'Not selected';
  }

  const voice = getVoicesForLanguage(MOCK_VOICES, languageCode).find(
    (candidate) => candidate.id === voiceId,
  );
  return voice?.label ?? 'Unknown voice';
}

export function ReviewPanel({
  definition,
  estimation,
  validation,
  isStarting,
  startError,
  onStart,
}: ReviewPanelProps): React.JSX.Element {
  const enabledLanguages = getEnabledLanguages(definition.languages);
  const targetLanguages = getTargetLanguages(definition.languages);
  const profile = TRANSLATION_PROFILES[definition.profile];
  const errors = validation.issues.filter((issue) => issue.severity === 'error');
  const warnings = validation.issues.filter((issue) => issue.severity === 'warning');

  return (
    <Card aria-labelledby="review-panel-title">
      <CardHeader>
        <CardTitle id="review-panel-title" className="text-lg">
          Review
        </CardTitle>
        <CardDescription>Confirm your configuration before starting localization.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Video</dt>
            <dd className="font-medium">{definition.video?.filename ?? 'Not selected'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Output folder</dt>
            <dd className="font-medium">{definition.outputDirectory}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Profile</dt>
            <dd className="font-medium">{profile.label}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Estimated time</dt>
            <dd className="font-medium">{estimation.processingTimeLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Languages</dt>
            <dd className="flex flex-wrap gap-2">
              {enabledLanguages.map((language) => (
                <Badge key={language.code} variant="secondary">
                  {language.label}
                </Badge>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Target languages</dt>
            <dd className="font-medium">
              {targetLanguages.length > 0
                ? targetLanguages.map((language) => language.label).join(', ')
                : 'None'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground mb-2">Voices</dt>
            <dd className="space-y-1">
              {enabledLanguages.map((language) => (
                <p key={language.code}>
                  <span className="font-medium">{language.label}:</span>{' '}
                  {getVoiceLabel(language.code, definition.voices[language.code])}
                </p>
              ))}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground mb-2">Estimated output</dt>
            <dd className="space-y-2">
              <p className="font-medium">
                {definition.output.containerFormat.toUpperCase()}
                {estimation.outputSizeBytes !== null
                  ? ` · ${formatBytes(estimation.outputSizeBytes)}`
                  : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {estimation.artifacts.map((artifact) => (
                  <Badge key={artifact} variant="outline">
                    {artifact}
                  </Badge>
                ))}
              </div>
            </dd>
          </div>
        </dl>

        {errors.length > 0 ? (
          <div
            className="border-destructive/30 bg-destructive/10 rounded-xl border p-4"
            role="alert"
            aria-live="polite"
          >
            <p className="text-destructive text-sm font-medium">Fix these issues before starting</p>
            <ul className="mt-2 space-y-1">
              {errors.map((issue) => (
                <li key={`${issue.code}-${issue.field}`} className="text-destructive text-sm">
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {warnings.length > 0 ? (
          <div className="border-warning/30 bg-warning/10 rounded-xl border p-4" role="status">
            <p className="text-sm font-medium">Warnings</p>
            <ul className="mt-2 space-y-1">
              {warnings.map((issue) => (
                <li key={`${issue.code}-${issue.field}`} className="text-muted-foreground text-sm">
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {startError ? (
          <p className="text-destructive text-sm" role="alert">
            {startError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button
            size="lg"
            disabled={isStarting || !validation.valid}
            onClick={onStart}
            aria-label="Start localization"
          >
            {isStarting ? 'Starting…' : 'Start Localization'}
          </Button>
          <Button variant="outline" size="lg" disabled={isStarting}>
            Preview First Minute
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
