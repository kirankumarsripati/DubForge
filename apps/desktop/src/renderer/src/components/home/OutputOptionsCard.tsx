import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dubforge/ui';
import type { OutputConfiguration } from '@dubforge/job-config';

interface OutputOptionsCardProps {
  options: OutputConfiguration;
  onChange: (partial: Partial<OutputConfiguration>) => void;
}

const optionItems: {
  key: Exclude<keyof OutputConfiguration, 'containerFormat'>;
  label: string;
  description: string;
}[] = [
  {
    key: 'generateTranslatedAudio',
    label: 'Generate translated audio',
    description: 'Create dubbed audio tracks for each enabled language.',
  },
  {
    key: 'generateSubtitles',
    label: 'Generate subtitles',
    description: 'Create subtitle tracks for each enabled language.',
  },
  {
    key: 'embedSubtitles',
    label: 'Embed subtitles in MKV',
    description: 'Include subtitle tracks inside the output container.',
  },
  {
    key: 'exportSrt',
    label: 'Export standalone SRT files',
    description: 'Write separate SRT files alongside the video.',
  },
  {
    key: 'exportTranscript',
    label: 'Export transcript',
    description: 'Save the source transcript as a text file.',
  },
];

export function OutputOptionsCard({
  options,
  onChange,
}: OutputOptionsCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Output Configuration</CardTitle>
        <CardDescription>Configure what artifacts to generate.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3" role="list" aria-label="Output options">
          {optionItems.map(({ key, label, description }) => {
            const isDisabled =
              (key === 'embedSubtitles' || key === 'exportSrt') && !options.generateSubtitles;

            return (
              <li key={key}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg p-2 ${
                    isDisabled ? 'opacity-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={options[key]}
                    disabled={isDisabled}
                    onChange={() => {
                      onChange({ [key]: !options[key] });
                    }}
                    className="accent-primary mt-0.5 size-4 rounded"
                    aria-label={label}
                    aria-describedby={`output-${key}-description`}
                  />
                  <span>
                    <span className="text-sm font-medium">{label}</span>
                    <span
                      id={`output-${key}-description`}
                      className="text-muted-foreground mt-0.5 block text-xs"
                    >
                      {description}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
