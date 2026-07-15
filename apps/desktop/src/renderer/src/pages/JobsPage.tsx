import { EmptyState, ErrorState, PageSkeleton } from '@dubforge/ui';
import { ListOrdered } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { JobsTable } from '../components/jobs/JobsTable';
import { PageHeader } from '../components/layout/PageHeader';
import { useJobsStore } from '../stores/jobs-store';
import { useSettingsStore } from '../stores/settings-store';

export function JobsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const jobs = useJobsStore((state) => state.jobs);
  const fetchJobs = useJobsStore((state) => state.fetchJobs);
  const deleteJob = useJobsStore((state) => state.deleteJob);
  const retryJob = useJobsStore((state) => state.retryJob);
  const setSimulateError = useJobsStore((state) => state.setSimulateError);
  const developerMode = useSettingsStore((state) => state.settings.data?.developerMode ?? false);

  useEffect(() => {
    setSimulateError(developerMode);
    void fetchJobs();
  }, [fetchJobs, setSimulateError, developerMode]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6 md:p-8">
      <div className="mx-auto w-full max-w-5xl">
        <PageHeader title="Jobs" description="View and manage your localization jobs." />

        {jobs.status === 'loading' ? <PageSkeleton rows={5} /> : null}

        {jobs.status === 'error' ? (
          <ErrorState
            title="Unable to load jobs"
            description={jobs.error ?? 'An unexpected error occurred.'}
            recoveryAction="Check that the application has read access to the job store."
            onRetry={() => {
              void fetchJobs();
            }}
            onOpenLogs={() => {
              void navigate('/settings');
            }}
          />
        ) : null}

        {jobs.status === 'success' && jobs.data !== null && jobs.data.length === 0 ? (
          <EmptyState
            icon={ListOrdered}
            title="No jobs yet"
            description="Import a video on the Home screen and start localization to see jobs here."
            actionLabel="Go to Home"
            onAction={() => {
              void navigate('/');
            }}
          />
        ) : null}

        {jobs.status === 'success' && jobs.data !== null && jobs.data.length > 0 ? (
          <JobsTable
            jobs={jobs.data}
            onRetry={(id) => {
              void retryJob(id);
            }}
            onDelete={(id) => {
              void deleteJob(id);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
