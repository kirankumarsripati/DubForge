import type { AppSettings } from '@dubforge/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  Switch,
} from '@dubforge/ui';

interface SettingsFormProps {
  settings: AppSettings;
  onChange: (partial: Partial<AppSettings>) => void;
}

export function SettingsForm({ settings, onChange }: SettingsFormProps): React.JSX.Element {
  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">General</CardTitle>
          <CardDescription>Appearance and notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <select
              id="theme"
              value={settings.theme}
              onChange={(event) => {
                onChange({ theme: event.target.value as AppSettings['theme'] });
              }}
              className="border-input bg-card h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications">Notifications</Label>
              <p className="text-muted-foreground text-xs">Job completion and failure alerts</p>
            </div>
            <Switch
              id="notifications"
              checked={settings.notificationsEnabled}
              onCheckedChange={(checked) => {
                onChange({ notificationsEnabled: checked });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance</CardTitle>
          <CardDescription>Hardware acceleration and resource limits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="metal">Metal Acceleration</Label>
              <p className="text-muted-foreground text-xs">Use Apple Silicon GPU</p>
            </div>
            <Switch
              id="metal"
              checked={settings.metalAcceleration}
              onCheckedChange={(checked) => {
                onChange({ metalAcceleration: checked });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="threads">Thread Count</Label>
            <Input
              id="threads"
              type="number"
              min={1}
              max={16}
              value={settings.threadCount}
              onChange={(event) => {
                onChange({ threadCount: Number(event.target.value) });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memory">Memory Limit (MB)</Label>
            <Input
              id="memory"
              type="number"
              min={1024}
              step={512}
              value={settings.memoryLimitMb}
              onChange={(event) => {
                onChange({ memoryLimitMb: Number(event.target.value) });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Output & Cache</CardTitle>
          <CardDescription>Default paths and storage management.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="output-dir">Default Output Folder</Label>
            <Input
              id="output-dir"
              value={settings.outputDirectory}
              onChange={(event) => {
                onChange({ outputDirectory: event.target.value });
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="cache-clean">Auto Clean Cache</Label>
              <p className="text-muted-foreground text-xs">Remove artifacts older than 30 days</p>
            </div>
            <Switch
              id="cache-clean"
              checked={settings.cacheAutoClean}
              onCheckedChange={(checked) => {
                onChange({ cacheAutoClean: checked });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Privacy</CardTitle>
          <CardDescription>Data handling preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="offline">Offline Mode</Label>
              <p className="text-muted-foreground text-xs">No network requests</p>
            </div>
            <Switch
              id="offline"
              checked={settings.offlineMode}
              onCheckedChange={(checked) => {
                onChange({ offlineMode: checked });
              }}
            />
          </div>
          <Separator className="h-px w-full" />
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="developer">Developer Mode</Label>
              <p className="text-muted-foreground text-xs">Simulate service errors for testing</p>
            </div>
            <Switch
              id="developer"
              checked={settings.developerMode}
              onCheckedChange={(checked) => {
                onChange({ developerMode: checked });
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
