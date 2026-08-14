---
name: testing-standards
description: Best practices and guidelines for writing automated tests across Tauri UI, CLI, server actions, and background logic in GameStash.
---

# GameStash Automated Testing Standards

Use this skill when designing, reviewing, or writing automated tests for the GameStash codebase.

## Principles

1. **Purpose-Driven Testing**: Every test must have a stated objective and test a realistic boundary or state transition.
2. **Four-Tier Automated Test Suite**:
   - **UI Tests**: Test Tauri/React user interface components, user interactions, and state rendering.
   - **Background Logic**: Test sync loops, hashing/checksums of ROMs, state persistence, and file management logic.
   - **CLI Interface**: Test command parsing, standard output formatting, and CLI arguments.
   - **Server Actions & API**: Test server endpoints, auth checks, object store integration, and metadata fetching.

## Test Structure Guidelines

- **No Silent Fallbacks**: Tests should fail loudly with clear, actionable assertions.
- **Cross-Platform Compatibility**: Ensure filesystem paths and subprocess calls work seamlessly on Windows and Linux (Bazzite).
- **Isolation**: Mock external web calls (e.g., IGDB API) in unit and integration tests to avoid flaky network dependencies.
