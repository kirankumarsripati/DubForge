# DubForge Processing Pipeline

Version: 1.0

Status: Locked

---

# 1. Pipeline Philosophy

The pipeline is deterministic.

Given:

- same input
- same settings
- same models

the output should always be identical.

Every stage is:

- isolated
- restartable
- cacheable
- measurable

---

# 2. High Level Pipeline

Import

↓

Validate

↓

Fingerprint

↓

Extract Audio

↓

Speech Recognition

↓

English Transcript

↓

Subtitle Generation

↓

Translation

↓

Speech Generation

↓

Mux

↓

Verification

↓

Completed

---

# 3. Stage 1 — Import

Input

Video file

Supported

MP4

MKV

Output

Job created

Metadata extracted

No processing yet.

---

# 4. Stage 2 — Validation

Checks

File exists

Readable

Supported container

Video stream exists

Audio stream exists

Size < configured limit

Enough disk space

Output folder writable

Failure

Stop immediately.

---

# 5. Stage 3 — Fingerprint

Generate

SHA256

Purpose

Cache

Resume

History

Output

video.hash

---

# 6. Stage 4 — Metadata

Extract

Duration

Codec

Resolution

FPS

Bitrate

Audio tracks

Output

metadata.json

---

# 7. Stage 5 — Audio Extraction

Tool

FFmpeg

Output

audio.wav

PCM

16kHz

Mono

This artifact is immutable.

---

# 8. Stage 6 — Speech Recognition

Provider

SpeechToTextProvider

Default

faster-whisper

Input

audio.wav

Output

transcript.json

Each segment contains

start

end

text

language

confidence

---

# 9. Stage 7 — English Transcript

Generate

english.txt

Preserve paragraph breaks.

---

# 10. Stage 8 — English Subtitle

Generate

english.srt

Use Whisper timestamps.

Do not invent timestamps.

---

# 11. Stage 9 — Translation

For every selected language

English

↓

Translator

↓

Localized text

Output

hi.json

te.json

Language processing runs in parallel.

---

# 12. Stage 10 — Subtitle Generation

Generate

hi.srt

te.srt

Preserve original timing.

Never shift timestamps.

---

# 13. Stage 11 — Speech Generation

Input

Translated transcript

Output

hi.wav

te.wav

Each language executes independently.

Failure in one language should not affect others.

---

# 14. Stage 12 — Duration Alignment

Speech duration may differ.

Apply

small silence

time stretch

compression

only when necessary.

Avoid noticeable artifacts.

---

# 15. Stage 13 — Mux

Input

Original video

English audio

Translated audio

English subtitle

Translated subtitles

Output

movie.mkv

No re-encoding of video.

---

# 16. Stage 14 — Verification

Verify

Video exists

Playable

All audio tracks

All subtitles

Correct metadata

Duration

Track count

Language tags

Only then mark completed.

---

# 17. Pipeline Artifacts

Every stage produces files.

Example

cache/

video_hash/

metadata.json

audio.wav

transcript.json

english.txt

english.srt

hi.json

hi.srt

hi.wav

te.json

te.srt

te.wav

manifest.json

---

# 18. Manifest

Every job generates

manifest.json

Contains

Input

Output

Model versions

Providers

Settings

Languages

Timings

Artifact paths

Hashes

---

# 19. Resume

If interrupted

Find latest completed artifact.

Resume from next stage.

Never repeat completed work.

---

# 20. Retry Policy

Every stage

Maximum retries

3

Retry delay

Exponential backoff

Do not retry deterministic validation failures.

---

# 21. Parallel Processing

Allowed

Translation

Speech generation

Forbidden

Mux

Verification

---

# 22. Cancellation

User may cancel.

Current stage

↓

Gracefully stop

↓

Persist state

↓

Keep artifacts

---

# 23. Logging

Each stage logs

Started

Completed

Duration

Errors

Warnings

Provider

Model version

---

# 24. Performance Metrics

Measure

Extraction time

STT time

Translation time

TTS time

Mux time

Total

Peak RAM

Cache hits

---

# 25. Error Recovery

Validation errors

Stop

Translation errors

Retry

Speech errors

Retry

Mux errors

Retry

Verification errors

Stop

---

# 26. Pipeline Rules

No stage edits previous artifacts.

No stage deletes artifacts.

Only cache cleanup removes artifacts.

Stages communicate only through artifacts.

No shared mutable state.

---

# 27. Future Extension Points

Speaker diarization

Voice cloning

Lip sync

OCR

Subtitle editing

New providers

No pipeline redesign required.
