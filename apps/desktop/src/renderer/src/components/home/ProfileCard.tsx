import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@dubforge/ui';
import type { JobEstimation, TranslationProfileDefinition } from '@dubforge/job-config';
import type { TranslationProfile } from '@dubforge/types';

interface ProfileCardProps {
  profiles: Record<TranslationProfile, TranslationProfileDefinition>;
  selected: TranslationProfile;
  estimation: JobEstimation;
  profileEstimates: Record<TranslationProfile, JobEstimation>;
  onSelect: (profile: TranslationProfile) => void;
}

export function ProfileCard({
  profiles,
  selected,
  estimation,
  profileEstimates,
  onSelect,
}: ProfileCardProps): React.JSX.Element {
  const profileList = Object.values(profiles);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Translation Profile</CardTitle>
        <CardDescription>Choose a balance between speed and quality.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="grid gap-3 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Translation profile"
        >
          {profileList.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => {
                onSelect(profile.id);
              }}
              className={cn(
                'rounded-xl border p-4 text-left transition-colors',
                'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
                selected === profile.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40',
              )}
              role="radio"
              aria-checked={selected === profile.id}
            >
              <p className="font-medium">{profile.label}</p>
              <p className="text-muted-foreground mt-1 text-xs">{profile.description}</p>
              <p className="text-muted-foreground mt-2 text-xs">
                Est. {profileEstimates[profile.id].processingTimeLabel}
              </p>
            </button>
          ))}
        </div>
        <div className="bg-muted/40 rounded-xl p-4">
          <p className="text-sm font-medium">Selected profile details</p>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Estimated time</dt>
              <dd className="font-medium">{estimation.processingTimeLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Estimated quality</dt>
              <dd className="font-medium">{estimation.qualityLabel}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground mb-2">Models</dt>
              <dd className="flex flex-wrap gap-2">
                <Badge variant="secondary">Whisper: {profiles[selected].models.whisper}</Badge>
                <Badge variant="secondary">
                  Translator: {profiles[selected].models.translator}
                </Badge>
                <Badge variant="secondary">Speech: {profiles[selected].models.speech}</Badge>
              </dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
