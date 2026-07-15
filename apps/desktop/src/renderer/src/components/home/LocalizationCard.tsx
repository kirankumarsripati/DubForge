import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@dubforge/ui';
import type { LanguageSelection } from '@dubforge/job-config';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

interface LocalizationCardProps {
  languages: readonly LanguageSelection[];
  onToggle: (code: string) => void;
}

export function LocalizationCard({
  languages,
  onToggle,
}: LocalizationCardProps): React.JSX.Element {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) {
      return languages;
    }
    return languages.filter(
      (lang) => lang.label.toLowerCase().includes(query) || lang.code.toLowerCase().includes(query),
    );
  }, [languages, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Languages</CardTitle>
        <CardDescription>
          Select source and target languages for translation and dubbing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search
            className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Search languages"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            aria-label="Search languages"
          />
        </div>
        <ul className="grid gap-2 sm:grid-cols-2" role="list" aria-label="Language selection">
          {filtered.map((lang) => (
            <li key={lang.code}>
              <label className="hover:bg-card/80 border-border flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors">
                <input
                  type="checkbox"
                  checked={lang.enabled}
                  onChange={() => {
                    onToggle(lang.code);
                  }}
                  className="accent-primary size-4 rounded"
                  aria-label={`Enable ${lang.label}`}
                />
                <span className="text-sm font-medium">{lang.label}</span>
                <span className="text-muted-foreground text-xs">
                  {lang.isSource ? 'Source' : 'Target'}
                </span>
                <span className="text-muted-foreground ml-auto text-xs uppercase">{lang.code}</span>
              </label>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
