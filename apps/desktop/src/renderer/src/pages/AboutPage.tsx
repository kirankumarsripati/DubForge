import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  PageSkeleton,
  Separator,
} from '@dubforge/ui';
import { useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { useHomeStore } from '../stores/home-store';

export function AboutPage(): React.JSX.Element {
  const appInfo = useHomeStore((state) => state.appInfo);
  const fetchAppInfo = useHomeStore((state) => state.fetchAppInfo);

  useEffect(() => {
    void fetchAppInfo();
  }, [fetchAppInfo]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6 md:p-8">
      <div className="mx-auto w-full max-w-2xl">
        <PageHeader title="About" description="Application information and credits." />

        {appInfo.status === 'loading' ? <PageSkeleton rows={3} /> : null}

        {appInfo.status === 'error' ? (
          <ErrorState
            title="Unable to load app info"
            description={appInfo.error ?? 'An unexpected error occurred.'}
            onRetry={() => {
              void fetchAppInfo();
            }}
          />
        ) : null}

        {appInfo.status === 'success' && appInfo.data ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{appInfo.data.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-[15px]">{appInfo.data.description}</p>
              <Separator className="h-px w-full" />
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Version</dt>
                  <dd className="font-medium">{appInfo.data.version}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">License</dt>
                  <dd className="font-medium">{appInfo.data.license}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Platform</dt>
                  <dd className="font-medium">macOS · Apple Silicon</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mode</dt>
                  <dd className="font-medium">Offline First</dd>
                </div>
              </dl>
              <Separator className="h-px w-full" />
              <p className="text-muted-foreground text-xs">
                Built with Electron, React, and local AI models. No data leaves your computer.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
