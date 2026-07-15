import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dubforge/ui';
import type { JobPreset } from '@dubforge/job-config';

interface PresetCardProps {
  presets: readonly JobPreset[];
  activePresetId: string | null;
  onApply: (presetId: string) => void;
}

export function PresetCard({
  presets,
  activePresetId,
  onApply,
}: PresetCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Presets</CardTitle>
        <CardDescription>Apply a saved configuration to this job.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2" role="list" aria-label="Job presets">
          {presets.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                onClick={() => {
                  onApply(preset.id);
                }}
                className={`border-border hover:border-primary/40 focus-visible:ring-ring w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                  activePresetId === preset.id ? 'border-primary bg-primary/10' : ''
                }`}
                aria-pressed={activePresetId === preset.id}
              >
                <p className="font-medium">{preset.name}</p>
                <p className="text-muted-foreground mt-1 text-xs">{preset.description}</p>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
