---
name: testing-standards
description: Best practices, 100% code coverage rules, and Makefile automation for writing automated tests across Tauri UI, CLI, server actions, and background logic in GameStash.
---

# GameStash Automated Testing Standards

Use this skill when designing, reviewing, or writing automated tests for the GameStash codebase.

```
+---------------------------------------------------------------------------------+
|                       GAMESTASH 100% TESTING SUITE                              |
|                                                                                 |
|  TIER 1: React UI Components & Modals    --> Vitest + Testing Library           |
|  TIER 2: Custom Hooks & State Engines    --> Vitest (Async Hook Testing)        |
|  TIER 3: Tauri Backend Services & IPC    --> Rust `#[cfg(test)]` & Tempdirs     |
|  TIER 4: Server Routes & State Machine   --> Axum Integration Tests             |
+---------------------------------------------------------------------------------+
```

## Principles

1. **100% Code Coverage Standard**:
   - All components, custom hooks, services, IPC commands, and API endpoints must achieve comprehensive coverage across statements, branches, functions, and lines.
   - Every conditional branch (`match`, `if/else`, ternary, error states) must have explicit test cases.
2. **Purpose-Driven Testing**:
   - Every test must have a stated objective and test a realistic boundary, happy path, or error state.
   - **No dummy assertions** (`expect(true).toBe(true)`) or redundant filler assertions.
3. **Four-Tier Automated Test Architecture**:
   - **Tier 1 (UI Components)**: Test component rendering, visual states, button clicks, status badges, and modal dialogs.
   - **Tier 2 (Custom Hooks)**: Test reactive state merging, caching, event listening, and IPC wrappers.
   - **Tier 3 (Tauri Services & Background Logic)**: Test ROM hashing algorithms, filesystem scanners, streaming downloads, checksum verification, process runners, and save backup/undo.
   - **Tier 4 (Server Actions & REST API)**: Test Axum routes, metadata catalog endpoints, download URL generation, and cloud save sync state machine.

## Test Structure Guidelines

- **No Silent Fallbacks**: Tests should fail loudly with clear, actionable assertions.
- **Cross-Platform Compatibility**: Ensure filesystem paths and subprocess calls work seamlessly on Windows and Linux (Bazzite).
- **Isolation**: Mock external web calls (e.g., IGDB API, external S3) in unit and integration tests to avoid flaky network dependencies.
- **Continuous Skill Maintenance**: Whenever an agent adds or changes test standards, tooling, or conventions, this skill file MUST be updated immediately.

## Standard Makefile Testing Interface

All testing operations MUST be executed through the project `Makefile`:

| Makefile Target | Description |
|---|---|
| `make test` | Runs the full automated test suite across all crates and frontend components |
| `make test-rust` | Runs Rust workspace unit and integration tests (`cargo test --workspace`) |
| `make test-desktop` | Runs React Vitest component and hook tests |
| `make coverage` | Runs full test suite with coverage report generation |
| `make coverage-desktop` | Runs Vitest coverage report for the React desktop client |
| `make coverage-rust` | Runs Rust workspace coverage report |
| `make deep-clean` | Resets local GameStash library (`%LOCALAPPDATA%/GameStash/roms`), media cache (`media/`), backups, and saves for fresh end-to-end testing |