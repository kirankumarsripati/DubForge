# DubForge Architecture

Version: 1.0

Status: Draft

---

# 1. Architecture Goals

The architecture must satisfy:

- Offline first
- Replaceable AI providers
- No UI blocking
- Restartable jobs
- Testable
- Open Source friendly
- Apple Silicon optimized
- Future proof

---

# 2. High Level Architecture

                    React UI
                       │
                       ▼
              Electron Renderer
                       │
              Typed IPC (Electron)
                       │
                       ▼
               Electron Main Process
                       │
                 Job Manager
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
     Pipeline Engine          Python Worker
          │                         │
          ▼                         ▼
      FFmpeg                AI Providers
                                 │
                                 ▼
              Whisper / Translator / TTS

---

# 3. Layers

Presentation Layer

- React
- shadcn/ui
- Zustand

Responsibilities

- UI only
- No business logic
- No ffmpeg
- No AI

---

Application Layer

Node

Responsibilities

- Job orchestration
- Queue
- IPC
- Cache
- Logging

No AI implementation.

---

Pipeline Layer

Responsibilities

- Execute processing stages
- Retry
- Resume
- Artifact management

---

Worker Layer

Python

Responsibilities

- Speech Recognition
- Translation
- Speech Generation

Nothing else.

---

Infrastructure Layer

FFmpeg

Filesystem

Electron

Settings

Logging

---

# 4. Folder Structure

dubforge/

apps/
    desktop/

packages/
    pipeline/
    providers/
    shared/
    types/
    ui/

python/
    workers/
    providers/
    utils/
    models/

docs/

tests/

assets/

scripts/

---

# 5. Core Components

Renderer

↓

IPC

↓

Job Manager

↓

Pipeline

↓

Worker

↓

Artifacts

---

# 6. Job Lifecycle

Queued

↓

Validating

↓

Extracting Audio

↓

Transcribing

↓

Generating English Subtitle

↓

Translating

↓

Generating Speech

↓

Muxing

↓

Verifying

↓

Completed

Every stage is persisted.

---

# 7. Job Object

Job

id

input

output

languages

status

progress

startedAt

finishedAt

logs

artifacts

errors

---

# 8. Artifact System

Every stage generates artifacts.

Example

audio.wav

transcript.json

english.srt

hindi.txt

hindi.wav

metadata.json

Nothing depends on memory.

Everything depends on artifacts.

---

# 9. Cache

cache/

SHA256/

audio.wav

transcript.json

...

Cache key

SHA256(video)

Cache never modifies outputs.

---

# 10. Provider Architecture

SpeechToTextProvider

↓

Whisper

Future

Azure

Deepgram

---

TranslatorProvider

↓

Seamless

Future

NLLB

Argos

DeepL

Google

---

SpeechProvider

↓

Kokoro

Future

XTTS

Piper

ElevenLabs

---

MuxerProvider

↓

FFmpeg

Future

MKVToolNix

---

# 11. Provider Contract

Every provider exposes

initialize()

execute()

validate()

cleanup()

No provider knows another provider.

---

# 12. Pipeline

Validate

↓

Extract Audio

↓

Speech Recognition

↓

Generate Transcript

↓

Translate

↓

Generate Audio

↓

Generate Subtitle

↓

Mux

↓

Verify

↓

Done

Each stage

Input

Output

Artifacts

Logs

Timing

---

# 13. IPC

Renderer

↓

Start Job

↓

Pause Job

↓

Cancel Job

↓

Open Folder

↓

Settings

Renderer never executes filesystem operations.

---

# 14. Worker Communication

Electron

↓

JSON Request

↓

Python

↓

JSON Response

No stdout parsing.

No string parsing.

Structured protocol.

---

# 15. Message Format

Request

id

action

payload

Response

id

success

payload

error

duration

version

---

# 16. State Management

React

↓

Zustand

↓

IPC

↓

Job Store

UI derives everything from state.

---

# 17. Logging

Each Job

↓

Job Log

Each Provider

↓

Provider Log

Application

↓

Application Log

Never mix logs.

---

# 18. Error Handling

Every stage

Retry

↓

Recover

↓

Resume

↓

Abort

Errors never crash Electron.

---

# 19. Model Manager

Every model

Installed

Downloading

Missing

Updating

Ready

Models never auto-download.

User confirms.

---

# 20. Threading

React

Main Thread

Node

Main Thread

Workers

Separate Process

Python

Separate Process

Never block UI.

---

# 21. Performance

Avoid duplicate copies.

Stream where possible.

Reuse cache.

Enable Metal.

Avoid reading entire video into memory.

---

# 22. Security

No telemetry.

No uploads.

No external requests.

No shell injection.

Escape filenames.

Validate paths.

---

# 23. Testing

Every provider

Mockable

Every pipeline stage

Independent

Every worker

Independent

End-to-end

Entire pipeline

---

# 24. Future Extension Points

New Translator

New Voice

New Subtitle Export

New Muxer

New Model

New Plugin

No UI changes required.

---

# 25. Architecture Rules

React never calls Python.

Python never calls Electron.

Providers never know UI.

Workers never know Renderer.

Everything typed.

Everything testable.

Everything replaceable.
