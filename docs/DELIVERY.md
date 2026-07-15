# DubForge Delivery & Packaging

Version: 1.0

Status: Active

---

## Purpose

The Delivery Platform transforms a completed localization workflow into production-ready deliverables.

The Workflow Engine never exports files directly. All exports flow through:

```
Workflow Engine
  ↓
Timeline
  ↓
Delivery Platform
  ↓
Packaging Plan
  ↓
Exporter
  ↓
Validator
  ↓
Deliverables
  ↓
Artifact Platform
```

---

## Packaging Flow

Exports never run immediately.

1. **Generate** `PackagingPlan`
2. **Validate** plan and required upstream artifacts
3. **Preview** plan artifact (persisted before mutation)
4. **Execute** parallel deliverable export
5. **Verify** every deliverable
6. **Complete** delivery aggregate and register artifacts

Invalid deliverables are never marked complete.

---

## Deliverables

| Kind                | Description                            |
| ------------------- | -------------------------------------- |
| `mkv`               | Primary container output               |
| `mp4`               | H.264/AAC compatible output            |
| `audio-only`        | Extracted audio deliverable            |
| `subtitle-package`  | Standalone subtitle export             |
| `project-bundle`    | Restorable `.dubforge` project archive |
| `validation-report` | Machine-readable validation summary    |

---

## Export Profiles

Profiles are JSON-driven and extensible. Built-in profiles:

- Studio Archive
- YouTube
- Plex
- Jellyfin
- Local Playback
- Mobile
- Audio Only

Profile files live in `packages/delivery/src/adapters/profiles/`.

---

## Project Bundle

Restorable bundle layout:

```
project.dubforge/
  bundle.json
  timeline.json
  workflow.json
  settings.json
  localization.json
  report.json
  diagnostics.json
  export-history.json
  artifacts/
    manifest.json
```

`bundle.json` includes `PROJECT_BUNDLE_VERSION` for backward compatibility.

---

## Validation

Every deliverable is validated for:

- Playability
- Video stream
- Audio streams
- Subtitle streams
- Metadata
- Duration
- Language tags
- Checksums
- Container

Validation reports are persisted in SQLite (`validation_reports`).

---

## Persistence

Normalized SQLite tables:

- `deliverables`
- `validation_reports`
- `export_history`
- `delivery_operations`

No duplicate storage of full workflow payloads.

---

## Domain Events

- `delivery.packaging-started`
- `delivery.packaging-completed`
- `delivery.validation-completed`
- `delivery.project-archived`
- `delivery.export-failed`
- `delivery.metric-recorded`

Metrics include export time, export size, validation score, and warning count.

---

## Recovery

- Packaging plans are persisted before export execution
- Failed exports emit `delivery.export-failed` with recovery context
- Project bundles enable full workflow restoration
- Export history tracks completed and failed packaging operations per workflow

---

## Architecture Rules

- No direct FFmpeg usage outside adapters
- No filesystem access outside adapters
- Every exported file is registered as an artifact
- Pipeline `verify` and `manifest` nodes are owned by `@dubforge/delivery`
