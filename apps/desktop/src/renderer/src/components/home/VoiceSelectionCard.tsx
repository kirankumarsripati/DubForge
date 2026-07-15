import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dubforge/ui';
import type { LanguageSelection, Voice, VoiceSelection } from '@dubforge/job-config';
import { getEnabledLanguages, getVoicesForLanguage } from '@dubforge/job-config';
import { Volume2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { voicePreviewService } from '../../services/voice-preview-service';

interface VoiceSelectionCardProps {
  languages: readonly LanguageSelection[];
  voices: VoiceSelection;
  availableVoices: readonly Voice[];
  onVoiceChange: (languageCode: string, voiceId: string) => void;
}

function formatVoiceMeta(voice: Voice): string {
  return `${voice.gender} · ${voice.provider} · ${voice.quality}`;
}

export function VoiceSelectionCard({
  languages,
  voices,
  availableVoices,
  onVoiceChange,
}: VoiceSelectionCardProps): React.JSX.Element {
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const dubbingLanguages = useMemo(
    () =>
      getEnabledLanguages(languages).filter(
        (language) => getVoicesForLanguage(availableVoices, language.code).length > 0,
      ),
    [availableVoices, languages],
  );

  const handlePreview = async (voiceId: string): Promise<void> => {
    setPreviewError(null);
    setPreviewingVoiceId(voiceId);
    try {
      await voicePreviewService.previewVoice(voiceId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Voice preview failed';
      setPreviewError(message);
    } finally {
      setPreviewingVoiceId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Voice Selection</CardTitle>
        <CardDescription>Choose a voice for each enabled language.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {dubbingLanguages.length === 0 ? (
          <p className="text-muted-foreground text-sm">Enable languages to configure voices.</p>
        ) : (
          <ul className="space-y-4" role="list" aria-label="Voice selection">
            {dubbingLanguages.map((language) => {
              const languageVoices = getVoicesForLanguage(availableVoices, language.code);
              const selectedVoiceId = voices[language.code] ?? languageVoices[0]?.id ?? '';
              const selectedVoice = languageVoices.find((voice) => voice.id === selectedVoiceId);

              return (
                <li key={language.code} className="border-border rounded-xl border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{language.label}</p>
                      <p className="text-muted-foreground text-xs uppercase">{language.code}</p>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 sm:max-w-md sm:flex-row sm:items-center">
                      <select
                        id={`voice-${language.code}`}
                        value={selectedVoiceId}
                        onChange={(event) => {
                          onVoiceChange(language.code, event.target.value);
                        }}
                        className="bg-background border-border focus-visible:ring-ring h-10 w-full rounded-lg border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
                        aria-label={`Voice for ${language.label}`}
                      >
                        {languageVoices.map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={selectedVoiceId.length === 0 || previewingVoiceId !== null}
                        onClick={() => {
                          void handlePreview(selectedVoiceId);
                        }}
                        aria-label={`Preview voice for ${language.label}`}
                      >
                        <Volume2 className="size-4" aria-hidden="true" />
                        {previewingVoiceId === selectedVoiceId ? 'Playing…' : 'Preview'}
                      </Button>
                    </div>
                  </div>
                  {selectedVoice ? (
                    <p className="text-muted-foreground mt-3 text-xs">
                      {formatVoiceMeta(selectedVoice)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {previewError ? (
          <p className="text-destructive text-sm" role="alert">
            {previewError}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
