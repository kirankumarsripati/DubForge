import { ErrorState, PageSkeleton } from '@dubforge/ui';
import { useEffect } from 'react';
import { SettingsForm } from '../components/settings/SettingsForm';
import { PageHeader } from '../components/layout/PageHeader';
import { useJobsStore } from '../stores/jobs-store';
import { useModelsStore } from '../stores/models-store';
import { useSettingsStore } from '../stores/settings-store';

export function SettingsPage(): React.JSX.Element {
  const settings = useSettingsStore((state) => state.settings);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const setSimulateError = useSettingsStore((state) => state.setSimulateError);
  const setJobsSimulateError = useJobsStore((state) => state.setSimulateError);
  const setModelsSimulateError = useModelsStore((state) => state.setSimulateError);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleChange = (partial: Parameters<typeof updateSettings>[0]): void => {
    void updateSettings(partial).then(() => {
      if (partial.developerMode !== undefined) {
        setSimulateError(partial.developerMode);
        setJobsSimulateError(partial.developerMode);
        setModelsSimulateError(partial.developerMode);
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6 md:p-8">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeader
          title="Settings"
          description="Configure application preferences and performance."
        />

        {settings.status === 'loading' ? <PageSkeleton rows={6} /> : null}

        {settings.status === 'error' ? (
          <ErrorState
            title="Unable to load settings"
            description={settings.error ?? 'An unexpected error occurred.'}
            recoveryAction="Your preferences file may need to be reset."
            onRetry={() => {
              void fetchSettings();
            }}
          />
        ) : null}

        {settings.status === 'success' && settings.data ? (
          <SettingsForm settings={settings.data} onChange={handleChange} />
        ) : null}
      </div>
    </div>
  );
}
