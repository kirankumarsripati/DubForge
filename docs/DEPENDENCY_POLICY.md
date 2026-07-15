# Dependency Policy

Version: 1.0

Status: Active

---

# Purpose

This document defines how third-party dependencies are evaluated, added, updated, and removed in DubForge.

The goal is to keep the project:

- Small
- Secure
- Maintainable
- Predictable
- MIT-friendly

---

# Philosophy

Every dependency becomes long-term maintenance.

Before adding a package, assume it will remain in the repository for years.

Prefer writing small utility code over introducing unnecessary libraries.

---

# General Rules

A dependency may only be added if:

- It solves a real problem.
- The functionality cannot reasonably be implemented internally.
- It has an active maintenance history.
- It has a permissive license.
- It has strong TypeScript support (for JS packages).
- It has a healthy community.
- It does not duplicate existing functionality.

---

# Evaluation Checklist

Before adding any dependency, answer:

1. Why is it needed?
2. Can the standard library solve this?
3. Can an existing project dependency solve this?
4. Is the package actively maintained?
5. Does it support Apple Silicon?
6. Does it increase bundle size significantly?
7. Is the license compatible?

---

# Preferred Licenses

Preferred

- MIT
- Apache-2.0
- BSD

Avoid

- GPL
- AGPL

unless there is no practical alternative.

---

# Version Policy

Prefer stable releases.

Avoid:

- alpha
- beta
- release candidate

unless explicitly required.

Pin versions where reproducibility matters.

---

# Updates

Update dependencies periodically rather than continuously.

Before updating:

- Review changelog.
- Check breaking changes.
- Run the complete test suite.
- Verify packaging still works.

---

# Security

Run:

- pnpm audit
- pip-audit

before releases.

Fix high-severity vulnerabilities promptly.

---

# Bundle Size

Frontend dependencies should be lightweight.

Avoid libraries that add significant bundle size unless they provide substantial value.

---

# Duplicate Functionality

Do not add libraries that duplicate existing capabilities.

Examples:

- Two state management libraries.
- Two form libraries.
- Two icon libraries.

---

# AI Libraries

AI dependencies should be isolated behind provider interfaces.

Never couple application logic directly to a specific AI library.

---

# Removal

Remove dependencies that are:

- Unmaintained.
- Replaced.
- No longer used.
- Security risks.

---

# Cursor Rules

Cursor must not introduce new dependencies automatically.

If a new package is required, Cursor must:

1. Explain why.
2. List alternatives considered.
3. Describe why existing dependencies are insufficient.
4. Wait for approval before adding it.

---

# Exceptions

Emergency security fixes may bypass this policy if necessary, but should be documented in the release notes.
