import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BUILTIN_EXPORT_PROFILE_IDS } from '../domain/constants.js';
import { deserializeExportProfile, type ExportProfile } from '../domain/export-profile.js';
import type { ExportProfileLoaderPort } from '../ports/delivery-ports.js';

export class JsonExportProfileLoader implements ExportProfileLoaderPort {
  constructor(private readonly options: { readonly profilesDirectory?: string } = {}) {}

  listBuiltinProfileIds(): readonly string[] {
    return BUILTIN_EXPORT_PROFILE_IDS;
  }

  loadProfile(profileId: string): ExportProfile {
    const profilesDirectory =
      this.options.profilesDirectory ?? join(import.meta.dirname, 'profiles');
    const profilePath = join(profilesDirectory, `${profileId}.json`);
    const content = readFileSync(profilePath, 'utf8');
    return deserializeExportProfile(content);
  }
}

export class SyncJsonExportProfileLoader implements ExportProfileLoaderPort {
  private readonly profiles: Readonly<Record<string, ExportProfile>>;

  constructor(profiles: Readonly<Record<string, ExportProfile>>) {
    this.profiles = profiles;
  }

  listBuiltinProfileIds(): readonly string[] {
    return Object.keys(this.profiles);
  }

  loadProfile(profileId: string): ExportProfile {
    const profile = this.profiles[profileId];
    if (profile === undefined) {
      throw new Error(`Export profile "${profileId}" was not found.`);
    }
    return profile;
  }
}
