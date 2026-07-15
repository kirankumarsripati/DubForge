# Asset Platform Migration Notes

## Migration 2 — `download_manifest`

Adds manifest-backed downloads and resumable temp file tracking.

### Database changes

- `assets.manifest_json` — serialized download manifest (`sources`, `checksum`, `filename`)
- `downloads.temp_path` — partial download path used for resume and atomic rename

### Catalog changes

Every asset entry in `*.asset-catalog.json` must now declare at least one download source:

```json
{
  "id": "whisper-medium",
  "sources": [
    {
      "type": "github-release",
      "url": "https://github.com/org/repo/releases/download/v1.0.0/model.bin"
    },
    { "type": "huggingface", "url": "https://huggingface.co/org/model/resolve/main/model.bin" },
    { "type": "mirror", "url": "https://cdn.example.com/models/whisper-medium.bin" }
  ],
  "checksum": "64-character-sha256-hex",
  "filename": "asset.bin"
}
```

Supported `type` values:

- `github-release`
- `huggingface`
- `mirror`
- `local-file` (development and tests only)

### Runtime behavior

- `SimulatedDownloadContentProvider` has been removed.
- `DownloadManager` selects providers from the manifest source list in order.
- Downloads write to `*.part`, verify SHA-256, then atomically rename into the asset store.
- Asset metadata in SQLite is updated only after verification succeeds.
- Failed sources fall through to the next manifest entry without changing `DownloadManager`.

### Upgrade steps

1. Deploy the new build (migration 2 runs automatically on startup).
2. Update every asset catalog with `sources` and `checksum`.
3. Refresh the Models page or restart DubForge to re-import catalogs.
4. Re-download assets that were previously installed via the simulated provider.
