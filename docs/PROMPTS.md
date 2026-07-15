# DubForge Cursor Prompt Library

These prompts are used throughout development.

Always use Cursor Agent mode.

Never ask Cursor to build the entire application.

Always work one task at a time.

---

# Prompt 1 — Architecture Review

Read the following documents:

- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/TECH_STACK.md
- docs/UI_SPEC.md
- docs/PIPELINE.md

Act as a Principal Engineer.

Do NOT write code.

Review the architecture.

Identify:

- unnecessary complexity
- scalability issues
- performance risks
- maintainability concerns
- UX concerns
- dependency concerns
- AI pipeline concerns

Provide:

Critical Issues

High Priority Improvements

Medium Priority Improvements

Future Considerations

Do not rewrite architecture unless necessary.

---

# Prompt 2 — Implement Task

Read:

- docs/*
- .cursor/rules/*
- tasks/<TASK>.md

Before writing code:

Explain your implementation plan.

List assumptions.

List risks.

Wait for approval.

After approval:

Implement ONLY this task.

Do not implement future tasks.

After implementation:

Run lint.

Run type checks.

Run tests.

Fix failures.

Generate:

Summary

Commit message

Remaining risks

Stop.

---

# Prompt 3 — Code Review

Review all changes.

Act as a Senior Staff Engineer.

Do not rewrite code.

Review for:

Architecture

Naming

Performance

Accessibility

Error handling

Security

Maintainability

Testability

Suggest improvements ranked by priority.

---

# Prompt 4 — Refactor

Refactor only the selected code.

Goals

Reduce complexity

Improve readability

Reduce duplication

Improve typing

Do not change behavior.

Run tests afterwards.

---

# Prompt 5 — Bug Investigation

A bug exists.

Do not immediately modify code.

First:

Understand the issue.

Find root cause.

Explain root cause.

Suggest fix.

Only after approval

Implement.

Verify.

---

# Prompt 6 — Performance Review

Review implementation.

Find

Slow algorithms

Memory waste

Duplicate work

Blocking operations

Unnecessary renders

Poor cache usage

Suggest improvements.

---

# Prompt 7 — Accessibility Review

Review UI.

Check

Keyboard

Focus

Screen readers

Contrast

ARIA

Touch targets

Suggest fixes.

---

# Prompt 8 — Release Review

Review repository before release.

Verify

Build

Lint

Tests

Packaging

Icons

README

License

Security

Dependencies

Version

Changelog

Generate release checklist.

---

# Prompt 9 — Dependency Review

Review project dependencies.

Find

Unused packages

Duplicate packages

Heavy packages

Security issues

License conflicts

Suggest removals.

---

# Prompt 10 — AI Pipeline Review

Review only

Speech Recognition

Translation

Speech Generation

Muxing

Cache

Resume

Parallel processing

Artifact validation

Benchmarking

Suggest improvements.

---

# Prompt 11 — UI Polish

Review UI.

Act as a Senior Product Designer.

Improve

Spacing

Hierarchy

Typography

Interaction

Animation

Whitespace

Clarity

Without changing architecture.

---

# Prompt 12 — Documentation Review

Review docs.

Check consistency.

Find contradictions.

Suggest improvements.

---

# Prompt 13 — Commit Review

Generate

Commit message

Pull Request description

Testing summary

Known limitations

Next task

---

# Prompt 14 — Security Review

Review

Filesystem

IPC

Worker communication

Validation

Shell commands

User input

Find vulnerabilities.

---

# Prompt 15 — End of Session

Summarize today's work.

List:

Completed

Pending

Risks

Technical debt

Next recommended task.
