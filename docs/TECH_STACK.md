# DubForge Technology Stack

Version: 1.0

Status: Locked

---

# Philosophy

Technology choices are intentionally conservative.

The primary goals are:

- Stability
- Maintainability
- Offline capability
- Excellent macOS support
- Long-term maintainability

Adding new dependencies requires justification.

---

# Supported Platform

Version 1

macOS

Apple Silicon only

Minimum

macOS 14 Sonoma

Recommended

Latest stable macOS

---

# Runtime

Node.js

Version

22 LTS

Package Manager

pnpm 10+

Python

3.12+

Git

Latest Stable

---

# Desktop Framework

Electron

Reason

- Mature ecosystem
- Excellent macOS support
- Strong IPC
- Easy packaging
- Stable

---

# Frontend

React

19

TypeScript

5.x

Vite

Latest

Reason

Fast development.

Excellent TypeScript support.

---

# UI

TailwindCSS

Latest

shadcn/ui

Framer Motion

Lucide Icons

Reason

Minimal

Beautiful

Accessible

Open Source

---

# State Management

Zustand

Reason

Simple

Tiny

No boilerplate

No Redux

---

# Forms

React Hook Form

Zod

Reason

Excellent TypeScript support.

---

# Routing

React Router

Reason

Industry standard.

---

# Data Fetching

No React Query.

Reason

No remote backend.

Communication occurs only through IPC.

---

# IPC

Electron IPC

Typed wrappers only.

Renderer never imports Electron directly.

---

# Backend

Node.js

TypeScript

Responsibilities

Job orchestration

Pipeline

Cache

Filesystem

Worker lifecycle

Logging

Settings

Never performs AI inference.

---

# AI Runtime

Python

Responsibilities

Speech Recognition

Translation

Speech Generation

Workers only.

---

# Speech Recognition

faster-whisper

Reason

Excellent Apple Silicon support

Fast

Reliable

Offline

Default Model

large-v3

Future

medium

small

tiny

---

# Translation

Primary

SeamlessM4T

Architecture

Provider Interface

Future Providers

Argos

NLLB

Google

DeepL

---

# Speech Generation

Primary

Kokoro

Future

XTTS

Piper

ElevenLabs

Provider architecture required.

---

# Video Processing

FFmpeg

Responsibilities

Audio extraction

Muxing

Metadata

Verification

No custom video processing.

---

# Hashing

SHA256

Purpose

Cache

Artifact validation

Duplicate detection

---

# Storage

electron-store

Settings

SQLite

Job History

Future

---

# Logging

electron-log

Python logging

Separate log files.

---

# Validation

Zod

Every IPC request

Every settings object

Every job request

---

# Testing

Vitest

Unit

Playwright

E2E

Python

pytest

Coverage target

80%

---

# Linting

ESLint

Prettier

TypeScript Strict

Python

ruff

black

mypy

---

# Build

electron-builder

Output

DMG

ZIP

---

# CI

GitHub Actions

Checks

Install

Lint

Type Check

Tests

Build

---

# Icons

Lucide

Application Icon

Custom

SVG source

---

# Fonts

System Font

Inter

Fallback

San Francisco

---

# Animations

Framer Motion

Guidelines

Fast

Subtle

No decorative animations.

---

# Styling

Tailwind only.

No CSS frameworks.

No Bootstrap.

No Material UI.

---

# Images

PNG

SVG

WebP

---

# Audio

WAV

Intermediate

AAC

Final

---

# Video

Input

MP4

MKV

Output

MKV

---

# Subtitle

SRT

Version 1

Future

ASS

VTT

---

# Configuration

JSON

User editable

Validated

---

# Secrets

None

Offline application.

No API Keys required.

---

# Versioning

Semantic Versioning

Example

1.0.0

1.1.0

2.0.0

---

# Repository

GitHub

MIT License

Conventional Commits

---

# Performance Goals

Application Launch

<2 sec

No UI freeze

Peak Memory

As low as practical

Streaming preferred

Avoid full memory loads

---

# Forbidden Libraries

Redux

MobX

jQuery

Bootstrap

Material UI

Moment.js

Axios

Lodash

Reason

Unnecessary complexity.

---

# Allowed Libraries

Only when justified.

Every new dependency must include

Purpose

Alternatives considered

Why existing stack cannot solve it

---

# Technology Rules

No JavaScript

TypeScript only

Strict Mode

No any

No eval

No dynamic imports unless required

No business logic in React

No AI in Electron

No UI in Python

Everything typed

Everything testable

Everything replaceable
