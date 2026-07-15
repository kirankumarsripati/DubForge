import { ErrorState } from '@dubforge/ui';
import { MOCK_VOICES, setTranslationProfile, TRANSLATION_PROFILES } from '@dubforge/job-config';
import type { TranslationProfile } from '@dubforge/types';
import { useEffect, useMemo } from 'react';
import { ActiveJobCard } from '../components/home/ActiveJobCard';
import { ImportCard } from '../components/home/ImportCard';
import { LocalizationCard } from '../components/home/LocalizationCard';
import { OutputOptionsCard } from '../components/home/OutputOptionsCard';
import { PresetCard } from '../components/home/PresetCard';
import { ProfileCard } from '../components/home/ProfileCard';
import { RecentFilesCard } from '../components/home/RecentFilesCard';
import { ReviewPanel } from '../components/home/ReviewPanel';
import { VideoInfoCard } from '../components/home/VideoInfoCard';
import { VoiceSelectionCard } from '../components/home/VoiceSelectionCard';
import { PageHeader } from '../components/layout/PageHeader';
import { pipelineService } from '../services';
import { estimationService } from '../services/job-config';
import { useHomeStore } from '../stores/home-store';
import { useSettingsStore } from '../stores/settings-store';

export function HomePage(): React.JSX.Element {
  const jobDefinition = useHomeStore((state) => state.jobDefinition);
  const estimation = useHomeStore((state) => state.estimation);
  const validation = useHomeStore((state) => state.validation);
  const presets = useHomeStore((state) => state.presets);
  const activePresetId = useHomeStore((state) => state.activePresetId);
  const activeJob = useHomeStore((state) => state.activeJob);
  const isStarting = useHomeStore((state) => state.isStarting);
  const startError = useHomeStore((state) => state.startError);
  const importError = useHomeStore((state) => state.importError);
  const recentFiles = useHomeStore((state) => state.recentFiles);
  const selectVideo = useHomeStore((state) => state.selectVideo);
  const openRecentFile = useHomeStore((state) => state.openRecentFile);
  const clearVideo = useHomeStore((state) => state.clearVideo);
  const clearImportError = useHomeStore((state) => state.clearImportError);
  const toggleLanguage = useHomeStore((state) => state.toggleLanguage);
  const setProfile = useHomeStore((state) => state.setProfile);
  const setOutput = useHomeStore((state) => state.setOutput);
  const setVoice = useHomeStore((state) => state.setVoice);
  const applyPreset = useHomeStore((state) => state.applyPreset);
  const startLocalization = useHomeStore((state) => state.startLocalization);
  const fetchActiveJob = useHomeStore((state) => state.fetchActiveJob);
  const fetchRecentFiles = useHomeStore((state) => state.fetchRecentFiles);
  const syncOutputDirectory = useHomeStore((state) => state.syncOutputDirectory);
  const settings = useSettingsStore((state) => state.settings.data);

  useEffect(() => {
    void fetchActiveJob();
    void fetchRecentFiles();
  }, [fetchActiveJob, fetchRecentFiles]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        void selectVideo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectVideo]);

  useEffect(() => {
    if (settings?.outputDirectory !== undefined) {
      syncOutputDirectory(settings.outputDirectory);
    }
  }, [settings?.outputDirectory, syncOutputDirectory]);

  const outputDirectory = settings?.outputDirectory ?? jobDefinition.outputDirectory;

  const profileEstimates = useMemo(() => {
    const profiles: TranslationProfile[] = ['fast', 'balanced', 'studio'];
    return Object.fromEntries(
      profiles.map((profile) => [
        profile,
        estimationService.estimate(setTranslationProfile(jobDefinition, profile)),
      ]),
    ) as Record<TranslationProfile, typeof estimation>;
  }, [jobDefinition]);

  const selectedVideo = jobDefinition.video;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6 md:p-8">
      <div className="mx-auto w-full max-w-6xl">
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

        {importError ? (
          <div className="mb-6">
            <ErrorState
              title={importError.title}
              description={importError.description}
              recoveryAction={importError.recoveryAction}
              onRetry={() => {
                clearImportError();
                void selectVideo();
              }}
            />
          </div>
        ) : null}

        {!selectedVideo ? <ImportCard /> : null}

        {selectedVideo ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <VideoInfoCard
                video={selectedVideo}
                outputDirectory={outputDirectory}
                onChangeVideo={clearVideo}
              />
              <LocalizationCard languages={jobDefinition.languages} onToggle={toggleLanguage} />
              <VoiceSelectionCard
                languages={jobDefinition.languages}
                voices={jobDefinition.voices}
                availableVoices={MOCK_VOICES}
                onVoiceChange={setVoice}
              />
              <ProfileCard
                profiles={TRANSLATION_PROFILES}
                selected={jobDefinition.profile}
                estimation={profileEstimates[jobDefinition.profile]}
                profileEstimates={profileEstimates}
                onSelect={setProfile}
              />
              <OutputOptionsCard options={jobDefinition.output} onChange={setOutput} />
            </div>

            <div className="space-y-6">
              <PresetCard presets={presets} activePresetId={activePresetId} onApply={applyPreset} />
              <ReviewPanel
                definition={{ ...jobDefinition, outputDirectory }}
                estimation={estimation}
                validation={validation}
                isStarting={isStarting}
                startError={startError}
                onStart={() => {
                  void startLocalization();
                }}
              />
            </div>
          </div>
        ) : (
          <RecentFilesCard
            files={recentFiles}
            onOpen={(id) => {
              void openRecentFile(id);
            }}
          />
        )}
      </div>
    </div>
  );
}
