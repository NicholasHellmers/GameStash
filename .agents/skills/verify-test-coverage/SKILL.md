---
name: verify-test-coverage
description: Workflow for scanning git diffs, identifying test gaps from code changes (including manual user edits), and generating 100% compliant purpose-driven tests.
---

# Verify Test Coverage Skill (Git-Diff Driven)

Use this skill when reviewing recent code modifications, responding to manual user edits, or auditing test coverage across GameStash.

```
+-----------------------------------------------------------------------------------+
|                        VERIFY TEST COVERAGE WORKFLOW                              |
|                                                                                   |
|  1. Scan Git Diff       2. Identify Gaps        3. Author Tests   4. Verify Suite |
|  [git diff / status] ─> [Map to __tests__]  ─>  [100% Coverage]─> [make test]    |
+-----------------------------------------------------------------------------------+
```

## Step-by-Step Procedure

### 1. Scan the Git Tree for Changes
Analyze what files, functions, types, and logic have changed compared to `HEAD`:
- Inspect modified, staged, or untracked files.
- Categorize changed files by architectural layer:
  - **Frontend UI / Hooks**: `apps/desktop/src/`
  - **Tauri Backend / Services**: `apps/desktop/src-tauri/src/`
  - **Shared Data Models**: `crates/core-types/src/`
  - **Server Endpoints & State**: `apps/server/src/`

### 2. Map Changes to Test Files
Locate the corresponding test suite for each modified file:
- **React Components**: `apps/desktop/src/**/__tests__/<Component>.test.tsx`
- **React Hooks**: `apps/desktop/src/**/hooks/__tests__/<hook>.test.ts`
- **Tauri Services / Rust Libs**: `#[cfg(test)] mod tests` in the file or `apps/desktop/src-tauri/src/services/<service>.rs`
- **Server API Routes**: `apps/server/tests/api_tests.rs`

### 3. Identify Coverage Gaps
Check for any untested code paths introduced or touched by the diff:
- **New or Modified Props / State Transitions**: Are all branches rendered and tested?
- **Error Conditions & Edge Cases**: Are network failures, corrupt file payloads, checksum mismatches, and offline modes tested?
- **Async Event Handlers**: Are IPC invocations, progress event listeners, and cleanup callbacks exercised?
- **Branching Logic**: Are all `match` statements, `if/else` checks, and ternary conditions evaluated?

### 4. Author Purpose-Driven Tests (100% Coverage Standard)
Write clean, meaningful tests following the project guidelines:
- **No Dummy Assertions**: Never write `expect(true).toBe(true)` or redundant filler tests.
- **Cross-Platform Compatibility**: Test both Windows and Linux pathing and platform enumerations.
- **Isolation**: Mock external network calls (e.g. IGDB, external servers).

### 5. Execute & Verify via Makefile
Execute the automated test suite using the standardized `Makefile` commands:
```bash
make test
```
Or run targeted coverage reports:
```bash
make test-desktop
make test-rust
```
Ensure all tests pass with zero regressions.
