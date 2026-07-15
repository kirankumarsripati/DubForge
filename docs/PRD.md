# DubForge
### Product Requirements Document (PRD)

Version: 1.0

Status: Draft

License: MIT

Author: Kiran + ChatGPT

---

# 1. Vision

DubForge is a fully offline, AI-powered desktop application for translating, dubbing and localizing videos.

The application enables users to convert an English video into multiple localized versions while preserving the original video.

DubForge generates:

• translated audio
• translated subtitles
• embedded MKV tracks
• standalone subtitle files
• transcripts

Everything runs locally.

No cloud APIs.

No subscription.

No data leaves the user's computer.

---

# 2. Problem Statement

Today, video localization usually requires:

• uploading private videos
• expensive cloud services
• manual subtitle editing
• multiple applications
• technical knowledge

Users often need:

Whisper

↓

Subtitle editor

↓

Translator

↓

Text-to-Speech

↓

FFmpeg

↓

MKVToolNix

↓

Media Player

DubForge combines this workflow into one desktop application.

---

# 3. Vision Statement

Translate any video into multiple languages with one click.

The process should be:

Simple.

Reliable.

Offline.

Professional.

---

# 4. Target Users

Primary

• Students
• Teachers
• Yoga instructors
• Educational creators
• YouTubers

Secondary

• Companies localizing training videos
• Families translating home videos
• Language learners

---

# 5. Primary Use Case

A user has an English yoga class.

They want

Hindi audio

Telugu audio

Hindi subtitles

Telugu subtitles

English subtitles

All embedded inside one MKV.

No editing.

No cloud.

---

# 6. Goals

The application SHALL

✓ Import MP4 and MKV

✓ Process videos up to 120 minutes

✓ Support videos up to 2 GB

✓ Generate English transcript

✓ Translate transcript

✓ Generate translated speech

✓ Generate subtitles

✓ Embed subtitles

✓ Embed multiple audio tracks

✓ Export MKV

✓ Resume interrupted jobs

✓ Cache expensive work

✓ Run entirely offline

✓ Support Apple Silicon

---

# 7. Non Goals

Version 1 SHALL NOT include

Lip sync

Voice cloning

Video editing

Timeline editing

Subtitle editing

Streaming

Cloud synchronization

OCR

YouTube download

Movie editing

These belong in future releases.

---

# 8. Success Metrics

A first-time user should

Install

↓

Open

↓

Drop video

↓

Select languages

↓

Click Start

↓

Receive localized MKV

without reading documentation.

---

# 9. Supported Platforms

Version 1

macOS only

Apple Silicon only

Future

Windows

Linux

---

# 10. Functional Requirements

Input

Accept

MP4

MKV

Drag & Drop

Browse

Queue

Output

MKV

Embedded audio tracks

Embedded subtitles

Standalone subtitles

Transcript

Logs

Processing

Extract audio

Speech recognition

Translation

Speech generation

Subtitle generation

Muxing

Validation

Resume

---

# 11. Languages

Version 1

English

Hindi

Telugu

Architecture must support adding new languages without modifying UI code.

---

# 12. Subtitle Support

Generate

English SRT

Hindi SRT

Telugu SRT

Embed subtitles into MKV.

Optionally export SRT files.

Future

VTT

ASS

---

# 13. Audio Tracks

Output MKV should contain

Video

English Audio

Hindi Audio

Telugu Audio

Correct language metadata

Default English audio

Selectable translated tracks

---

# 14. Translation Profiles

Fast

Balanced

Studio

Profiles determine

Whisper model

Translation model

Speech model

Users should not manually configure models.

---

# 15. Voice Selection

Each language supports

Default Voice

Voice dropdown

Preview voice

Voice selection persists.

---

# 16. Processing Pipeline

Import

↓

Validation

↓

Extract Audio

↓

Speech Recognition

↓

English Transcript

↓

Translation

↓

Speech Generation

↓

Subtitle Generation

↓

MKV Merge

↓

Validation

↓

Completed

Every stage must be resumable.

---

# 17. Cache

Every imported video receives a unique hash.

Artifacts

Audio

Transcript

Subtitles

Speech

Metadata

must be cached.

The application must never repeat completed work.

---

# 18. Resume

If the application crashes

Resume from the last completed stage.

Never restart from beginning.

---

# 19. Error Handling

Every error must

Explain what happened

Explain why

Explain how to fix it

Never show

Unknown Error

Examples

FFmpeg missing

Output folder read only

Model missing

Insufficient disk space

Corrupt video

---

# 20. User Interface Principles

One primary screen.

Minimal controls.

Dark mode first.

Large drag & drop target.

No unnecessary dialogs.

No technical jargon.

---

# 21. Performance Targets

Application launch

<2 seconds

Video import

<1 second

No UI freezing

Memory usage remains stable

Apple Silicon Metal acceleration enabled where supported

---

# 22. Accessibility

Keyboard accessible

Screen reader labels

High contrast support

Scalable fonts

---

# 23. Privacy

No telemetry

No analytics

No uploads

No tracking

Offline by default

---

# 24. Logging

Every job produces

Log

Stage timings

Errors

Warnings

Model versions

Logs exportable.

---

# 25. Settings

Theme

Output folder

Threads

Acceleration

Translation Profile

Voice

Notifications

Cache

Models

---

# 26. Model Manager

Users should not manually download models.

Missing models

↓

Prompt

↓

Download

↓

Ready

---

# 27. Future Features

Voice cloning

Lip sync

Plugin SDK

Speaker diarization

OCR

YouTube import

Folder watch

Batch rendering

Translation glossary

Timeline preview

---

# 28. Engineering Principles

Maintainability over cleverness.

Small modules.

Typed APIs.

Provider architecture.

No duplicated code.

No hidden state.

Everything testable.

Everything replaceable.

---

# 29. Release Criteria

Before v1.0

All tests passing

No lint issues

No TypeScript errors

No Python errors

Successful processing of

5 min

30 min

120 min

videos.

---

# 30. Definition of Done

A feature is complete only when

✓ implemented

✓ tested

✓ documented

✓ lint clean

✓ type safe

✓ reviewed

✓ merged
