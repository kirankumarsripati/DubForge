import { Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@dubforge/ui';
import type { TranslationProfile } from '@dubforge/types';

const profiles: { value: TranslationProfile; label: string; description: string; time: string }[] =
  [
    {
      value: 'fast',
      label: 'Fast',
      description: 'Lower quality, fastest processing',
      time: '~30 min',
    },
    {
      value: 'balanced',
      label: 'Balanced',
      description: 'Recommended for most videos',
      time: '~45 min',
    },
    {
      value: 'studio',
      label: 'Studio',
      description: 'Highest quality, longest processing',
      time: '~90 min',
    },
  ];

interface ProfileCardProps {
  selected: TranslationProfile;
  onSelect: (profile: TranslationProfile) => void;
}

export function ProfileCard({ selected, onSelect }: ProfileCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Processing Profile</CardTitle>
        <CardDescription>Choose a balance between speed and quality.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {profiles.map((profile) => (
            <button
              key={profile.value}
              type="button"
              onClick={() => {
                onSelect(profile.value);
              }}
              className={cn(
                'rounded-xl border p-4 text-left transition-colors',
                'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
                selected === profile.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40',
              )}
              aria-pressed={selected === profile.value}
            >
              <p className="font-medium">{profile.label}</p>
              <p className="text-muted-foreground mt-1 text-xs">{profile.description}</p>
              <p className="text-muted-foreground mt-2 text-xs">Est. {profile.time}</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
