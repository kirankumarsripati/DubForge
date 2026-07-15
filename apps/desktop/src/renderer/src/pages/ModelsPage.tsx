import { EmptyState, ErrorState, PageSkeleton } from '@dubforge/ui';
import { Layers } from 'lucide-react';
import { useEffect } from 'react';
import { ModelsList } from '../components/models/ModelsList';
import { PageHeader } from '../components/layout/PageHeader';
import { useModelsStore } from '../stores/models-store';
import { useSettingsStore } from '../stores/settings-store';

export function ModelsPage(): React.JSX.Element {
  const models = useModelsStore((state) => state.models);
  const fetchModels = useModelsStore((state) => state.fetchModels);
  const downloadModel = useModelsStore((state) => state.downloadModel);
  const deleteModel = useModelsStore((state) => state.deleteModel);
  const updateModel = useModelsStore((state) => state.updateModel);
  const setSimulateError = useModelsStore((state) => state.setSimulateError);
  const developerMode = useSettingsStore((state) => state.settings.data?.developerMode ?? false);

  useEffect(() => {
    setSimulateError(developerMode);
    void fetchModels();
  }, [fetchModels, setSimulateError, developerMode]);

  const installedCount =
    models.data?.filter((m) => m.status === 'installed' || m.status === 'ready').length ?? 0;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6 md:p-8">
      <div className="mx-auto w-full max-w-3xl">
        <PageHeader
          title="Models"
          description="Manage AI models for speech recognition, translation, and speech generation."
        />

        {models.status === 'loading' ? <PageSkeleton rows={4} /> : null}

        {models.status === 'error' ? (
          <ErrorState
            title="Unable to load models"
            description={models.error ?? 'An unexpected error occurred.'}
            recoveryAction="Verify you have enough disk space and try again."
            onRetry={() => {
              void fetchModels();
            }}
          />
        ) : null}

        {models.status === 'success' && models.data !== null && models.data.length > 0 ? (
          <>
            {installedCount === 0 ? (
              <div className="mb-6">
                <EmptyState
                  icon={Layers}
                  title="No models installed"
                  description="Download the required models to enable offline video localization."
                  actionLabel="Download Missing Models"
                  onAction={() => {
                    const missing = models.data?.find((m) => m.status === 'missing');
                    if (missing) {
                      void downloadModel(missing.id);
                    }
                  }}
                />
              </div>
            ) : null}
            <ModelsList
              models={models.data}
              onDownload={(id) => {
                void downloadModel(id);
              }}
              onDelete={(id) => {
                void deleteModel(id);
              }}
              onUpdate={(id) => {
                void updateModel(id);
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
