import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dubforge/ui';
import type { OutputOptions } from '@dubforge/types';

interface OutputOptionsCardProps {
  options: OutputOptions;
  onChange: (partial: Partial<OutputOptions>) => void;
}

const optionItems: { key: keyof OutputOptions; label: string }[] = [
  { key: 'generateTranslatedAudio', label: 'Generate translated audio' },
  { key: 'generateSubtitles', label: 'Generate subtitles' },
  { key: 'embedSubtitles', label: 'Embed subtitles in MKV' },
  { key: 'exportSrt', label: 'Export standalone SRT files' },
  { key: 'exportTranscript', label: 'Export transcript' },
];

export function OutputOptionsCard({
  options,
  onChange,
}: OutputOptionsCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Output Options</CardTitle>
        <CardDescription>Configure what artifacts to generate.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {optionItems.map(({ key, label }) => (
            <li key={key}>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={() => {
                    onChange({ [key]: !options[key] });
                  }}
                  className="accent-primary size-4 rounded"
                  aria-label={label}
                />
                <span className="text-sm">{label}</span>
              </label>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
