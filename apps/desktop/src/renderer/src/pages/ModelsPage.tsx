import { ErrorState, PageSkeleton } from '@dubforge/ui';
import { useEffect } from 'react';
import { ModelsList } from '../components/models/ModelsList';
import { PageHeader } from '../components/layout/PageHeader';
import { useModelsStore } from '../stores/models-store';

export function ModelsPage(): React.JSX.Element {
  const models = useModelsStore((state) => state.models);
  const fetchModels = useModelsStore((state) => state.fetchModels);
  const downloadModel = useModelsStore((state) => state.downloadModel);
  const deleteModel = useModelsStore((state) => state.deleteModel);
  const updateModel = useModelsStore((state) => state.updateModel);
  const verifyModel = useModelsStore((state) => state.verifyModel);
  const repairModel = useModelsStore((state) => state.repairModel);
  const subscribeToChanges = useModelsStore((state) => state.subscribeToChanges);

  useEffect(() => {
    void fetchModels();
    const unsubscribe = subscribeToChanges();
    return unsubscribe;
  }, [fetchModels, subscribeToChanges]);

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

        {models.status === 'success' && models.data !== null ? (
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
            onVerify={(id) => {
              void verifyModel(id);
            }}
            onRepair={(id) => {
              void repairModel(id);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
