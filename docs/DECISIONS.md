# DubForge Architecture Decision Records (ADR)

Version: 1.0

Status: Active

---

## ADR-001

Title

Electron instead of Tauri

Status

Accepted

Date

2026-07-15

Decision

DubForge will use Electron.

Reason

- Mature ecosystem
- Excellent tooling
- Stable IPC
- Better documentation
- Easier AI integration
- Easier packaging

Tradeoffs

- Larger application size
- Higher memory usage

Consequences

Long-term stability is preferred over smaller binaries.

---

## ADR-002

Title

macOS Only for Version 1

Status

Accepted

Decision

Version 1 supports Apple Silicon only.

Reason

- Faster development
- Better optimization
- Smaller testing matrix
- Easier debugging

Future

Windows

Linux

---

## ADR-003

Title

Offline First

Status

Accepted

Decision

No cloud services.

Reason

- Privacy
- Unlimited usage
- No API keys
- No subscriptions

Tradeoff

Larger local models.

---

## ADR-004

Title

Provider Architecture

Status

Accepted

Decision

Every AI engine is replaceable.

Interfaces

SpeechToTextProvider

TranslatorProvider

SpeechProvider

MuxProvider

Reason

Avoid vendor lock-in.

Future providers should require zero UI changes.

---

## ADR-005

Title

Python Worker

Status

Accepted

Decision

Python performs AI inference.

Node orchestrates.

Electron renders UI.

Reason

Separation of concerns.

---

## ADR-006

Title

Artifact-Based Pipeline

Status

Accepted

Decision

Every pipeline stage produces artifacts.

Stages never communicate through memory.

Reason

Resume

Debugging

Testing

Cache reuse

---

## ADR-007

Title

MKV Output

Status

Accepted

Decision

MKV is primary output.

Reason

Multiple audio tracks

Multiple subtitle tracks

Metadata

Compatibility

---

## ADR-008

Title

Progressive Disclosure UI

Status

Accepted

Decision

Show advanced controls only when needed.

Reason

Reduce cognitive load.

---

## ADR-009

Title

Translation Profiles

Status

Accepted

Decision

Expose

Fast

Balanced

Studio

instead of individual model settings.

Reason

Simpler UX.

---

## ADR-010

Title

No Business Logic in React

Status

Accepted

Decision

React renders UI only.

Reason

Maintainability

Testing

Architecture consistency

---

## ADR-011

Title

Deterministic Pipeline

Status

Accepted

Decision

Same input + same settings + same models = same output.

Reason

Reproducibility

Testing

Bug reports

---

## ADR-012

Title

Model Manager

Status

Accepted

Decision

Models are managed inside the application.

Users should not manually install models.

Reason

Reduce setup complexity.

---

## ADR-013

Title

Cache by SHA256

Status

Accepted

Decision

Video cache is keyed by SHA256.

Reason

Reliable deduplication

Resume support

---

## ADR-014

Title

No Telemetry

Status

Accepted

Decision

DubForge collects no analytics.

Reason

Privacy

Offline philosophy

---

## ADR-015

Title

One Feature Per Branch

Status

Accepted

Decision

Every implementation task uses a dedicated Git branch.

Reason

Cleaner reviews

Safer merges

---

## ADR-016

Title

Cursor Implements, Documentation Leads

Status

Accepted

Decision

Architecture and product decisions live in docs/.

Cursor implements against documentation.

Reason

Avoid architectural drift.

---

## ADR-017

Title

Open Source First

Status

Accepted

Decision

The repository is designed for public collaboration.

License

MIT

Reason

Encourage community contributions.

---

## ADR-018

Title

Native Feeling UI

Status

Accepted

Decision

The UI should feel like a polished macOS application.

Inspired by

Raycast

Arc

Linear

Cursor

Reason

Reduce learning curve.

---

## ADR-019

Title

Quality Gates

Status

Accepted

Decision

Every pipeline stage validates its output before proceeding.

Reason

Fail early.

Improve reliability.

---

## ADR-020

Title

Preview Before Render

Status

Accepted

Decision

Allow users to generate the first 60 seconds before rendering the full video.

Reason

Validate voice and translation before spending significant processing time.

Status

Planned for Version 1.1

---

# ADR Template

## ADR-XXX

Title

Status

Accepted / Proposed / Superseded / Rejected

Decision

Reason

Alternatives Considered

Tradeoffs

Consequences

Related Tasks

Review Date
