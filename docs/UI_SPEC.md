# DubForge UI Specification

Version: 1.0

Status: Draft

---

# 1. Design Philosophy

DubForge should feel:

- Native to macOS
- Fast
- Calm
- Professional
- Minimal
- Trustworthy

The interface should prioritize content and progress over controls.

Users should never feel overwhelmed.

---

# 2. Design Inspiration

Reference products:

- Raycast
- Arc Browser
- Final Cut Pro
- CleanMyMac
- Linear
- Cursor

Avoid looking like:

- Visual Studio
- Blender
- Generic Electron apps
- Admin dashboards

---

# 3. Color Palette

Primary Background

#0B0B0C

Secondary Background

#141416

Card Background

#1A1A1D

Border

#2A2A2F

Primary Text

#FFFFFF

Secondary Text

#A1A1AA

Muted

#71717A

Accent

#3B82F6

Success

#22C55E

Warning

#F59E0B

Error

#EF4444

---

# 4. Typography

Primary

Inter

Fallback

System

Hierarchy

H1

32px

Semibold

H2

24px

Medium

Body

15px

Regular

Caption

13px

Regular

Small

12px

---

# 5. Layout

Maximum width

1200px

Centered

Padding

32px

Card Radius

16px

Spacing

8pt system

---

# 6. Navigation

Left Sidebar

Home

Jobs

Models

Settings

Help

Main Content

Context sensitive

No tabs.

---

# 7. Home Screen

Header

DubForge

Subtitle

Translate, dub and localize videos completely offline.

Main Card

Large drag & drop zone.

Center icon.

Browse button.

Supported formats

MP4

MKV

---

# 8. Video Information Card

After selecting video

Show

Thumbnail

Filename

Duration

Resolution

Codec

Audio tracks

File size

Output folder

Change button

---

# 9. Localization Card

Languages

Checkbox list

English

Hindi

Telugu

Tamil

Kannada

Marathi

Gujarati

Bengali

Punjabi

Search supported languages.

---

# 10. Voice Selection

Per language

Dropdown

Preview button

Voice metadata

Gender

Provider

Quality

---

# 11. Processing Profile

Profiles

Fast

Balanced

Studio

Information panel

Estimated processing time

Estimated quality

Model selection (read-only)

---

# 12. Output Options

Generate translated audio

Generate subtitles

Embed subtitles

Export SRT

Export transcript

Export translated transcript

Burn subtitles (future)

---

# 13. Start Section

Large primary button

Start Localization

Secondary button

Preview First Minute

Estimated output

MKV

Language tracks

Subtitle tracks

---

# 14. Progress Screen

Top

Filename

Progress bar

Elapsed

Remaining

Current stage

Timeline

Validate

✓

Extract Audio

✓

Speech Recognition

✓

Translate Hindi

Running

Translate Telugu

Waiting

Generate Hindi Speech

Waiting

Generate Telugu Speech

Waiting

Mux

Waiting

Verify

Waiting

---

# 15. Live Logs

Collapsible

Timestamp

Stage

Message

Error

Warning

Searchable

Export logs

---

# 16. Job Queue

Table

Status

Filename

Languages

Started

Duration

Progress

Open output

Retry

Delete

Supports multiple queued jobs.

---

# 17. Result Screen

Success animation

Output summary

Video

Languages

Subtitle tracks

Processing time

Model versions

Buttons

Play

Reveal in Finder

Open Folder

Translate Another

---

# 18. Models Screen

Installed Models

Whisper

Translator

Speech

Status

Installed

Downloading

Missing

Ready

Version

Download button

Delete button

Update button

Disk usage

---

# 19. Settings

General

Theme

Language

Notifications

Performance

Metal

Threads

Memory

Output

Default folder

Cache

Auto clean

Models

Privacy

Offline mode

Logs

Developer Mode

---

# 20. Error States

Every error includes

Title

Description

Recovery action

Retry button

Open Logs button

Never display stack traces to users.

---

# 21. Empty States

No jobs

No models

No recent files

Each includes

Illustration

Explanation

Primary action

---

# 22. Keyboard Shortcuts

⌘O

Open video

⌘,

Settings

⌘R

Retry

⌘L

Open logs

⌘Q

Quit

Space

Pause/Resume preview

---

# 23. Notifications

Job Started

Job Completed

Job Failed

Model Download Complete

---

# 24. Accessibility

Keyboard navigation

Screen readers

High contrast

Scalable fonts

Visible focus indicators

---

# 25. Animations

Use Framer Motion

Fast

Subtle

Fade

Slide

Scale

Maximum duration

250ms

No bouncing.

---

# 26. Responsive Behaviour

Minimum width

1100px

No mobile layout.

Window resizing supported.

---

# 27. Loading

Skeleton loaders

Never spinner-only screens.

Progress always visible.

---

# 28. Confirmation Dialogs

Only when destructive

Delete cache

Delete job

Delete model

Never confirm ordinary actions.

---

# 29. Design Tokens

Spacing

4

8

12

16

24

32

48

Radius

12

16

24

Shadows

Minimal

---

# 30. UI Principles

One primary action per screen.

Whitespace over borders.

Icons support text.

No icon-only navigation.

Never hide important progress.

Advanced options remain collapsed until requested.
