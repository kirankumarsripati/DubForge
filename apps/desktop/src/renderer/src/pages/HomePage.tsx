import { Button, ErrorState } from '@dubforge/ui';
import { useEffect } from 'react';
import { ActiveJobCard } from '../components/home/ActiveJobCard';
import { ImportCard } from '../components/home/ImportCard';
import { LocalizationCard } from '../components/home/LocalizationCard';
import { OutputOptionsCard } from '../components/home/OutputOptionsCard';
import { ProfileCard } from '../components/home/ProfileCard';
import { VideoInfoCard } from '../components/home/VideoInfoCard';
import { PageHeader } from '../components/layout/PageHeader';
import { pipelineService } from '../services';
import { useHomeStore } from '../stores/home-store';
import { useSettingsStore } from '../stores/settings-store';

export function HomePage(): React.JSX.Element {
  const selectedVideo = useHomeStore((state) => state.selectedVideo);
  const languages = useHomeStore((state) => state.languages);
  const profile = useHomeStore((state) => state.profile);
  const output = useHomeStore((state) => state.output);
  const activeJob = useHomeStore((state) => state.activeJob);
  const isStarting = useHomeStore((state) => state.isStarting);
  const startError = useHomeStore((state) => state.startError);
  const selectVideo = useHomeStore((state) => state.selectVideo);
  const clearVideo = useHomeStore((state) => state.clearVideo);
  const toggleLanguage = useHomeStore((state) => state.toggleLanguage);
  const setProfile = useHomeStore((state) => state.setProfile);
  const setOutput = useHomeStore((state) => state.setOutput);
  const startLocalization = useHomeStore((state) => state.startLocalization);
  const fetchActiveJob = useHomeStore((state) => state.fetchActiveJob);
  const settings = useSettingsStore((state) => state.settings.data);

  useEffect(() => {
    void fetchActiveJob();
  }, [fetchActiveJob]);

  const outputDirectory = settings?.outputDirectory ?? '~/Movies/DubForge';
  const enabledCount = languages.filter((lang) => lang.enabled).length;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6 md:p-8">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeader
          title="DubForge"
          description="Translate, dub and localize videos completely offline."
        />

        {activeJob ? (
          <div className="mb-6">
            <ActiveJobCard
              job={activeJob}
              onCancel={() => {
                void pipelineService.cancelJob(activeJob.id).then(() => fetchActiveJob());
              }}
            />
          </div>
        ) : null}

        {!selectedVideo ? <ImportCard /> : null}

        {selectedVideo ? (
          <div className="space-y-6">
            <VideoInfoCard
              video={selectedVideo}
              outputDirectory={outputDirectory}
              onChangeVideo={clearVideo}
            />
            <LocalizationCard languages={languages} onToggle={toggleLanguage} />
            <ProfileCard selected={profile} onSelect={setProfile} />
            <OutputOptionsCard options={output} onChange={setOutput} />

            {startError ? (
              <ErrorState
                title="Localization failed to start"
                description={startError}
                recoveryAction="Check that all required models are installed, then try again."
                onRetry={() => {
                  void startLocalization();
                }}
              />
            ) : null}

            <div className="bg-card border-border rounded-2xl border p-6">
              <p className="text-muted-foreground mb-4 text-sm">
                Estimated output: MKV with {enabledCount} language track
                {enabledCount === 1 ? '' : 's'} and embedded subtitles.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  disabled={isStarting || enabledCount === 0}
                  onClick={() => {
                    void startLocalization();
                  }}
                  aria-label="Start localization"
                >
                  {isStarting ? 'Starting…' : 'Start Localization'}
                </Button>
                <Button variant="outline" size="lg" disabled={isStarting}>
                  Preview First Minute
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {!selectedVideo && !activeJob ? (
          <p className="text-muted-foreground mt-6 text-center text-sm">
            <button type="button" className="text-primary hover:underline" onClick={selectVideo}>
              Load sample video
            </button>{' '}
            to explore the localization workflow.
          </p>
        ) : null}
      </div>
    </div>
  );
}
