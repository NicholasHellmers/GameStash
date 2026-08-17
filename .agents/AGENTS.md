# GameStash AI Agent Guidelines & Policy

This file defines the project-specific rules, constraints, and best practices for AI agents assisting with the GameStash repository.

## Core Directives & AI Policy (From Project README)

1. **Feature Ownership & Codebase Understanding**:
   - Do NOT introduce full-blown features without explicit user direction and architectural alignment.
   - Codebase understanding is a key skill; do not replace human architectural oversight with autonomous code dumps.
   - Prioritize pair-programming: propose clean, focused implementations or incremental steps rather than massive unsolicited refactors.

2. **100% Code Coverage Standard & Testing Policy**:
   - Every piece of code (UI components, custom hooks, backend commands, services, and server routes) must maintain a **100% code coverage standard**.
   - Every test must be **purpose-driven with meaningful assertions**—no dummy assertions (`expect(true).toBe(true)`) or redundant tests.
   - Target full automation across:
     - Tauri/React UI components, modals, and custom hooks
     - Background logic, ROM hashing, download streams, and save sync workflows
     - CLI interfaces and Makefile automation targets
     - Server actions & API routes
   - Use the `verify-test-coverage` skill to inspect git diffs after any code changes (especially manual edits) to generate any missing tests.

3. **Continuous Skill & Agent Synchronization Protocol**:
   - Project skills located in `.agents/skills/` are the living reference for AI agents.
   - **Mandatory Skill Update Rule**: Whenever an architectural pattern, API contract, command, data model, or workflow is introduced or modified, the agent **must** update the corresponding `SKILL.md` before concluding the task.
   - Never allow skills to become stale snapshots.

4. **Single Source of Truth: Makefile**:
   - All build, development, testing, and coverage operations must route through the project `Makefile` (e.g. `make test`, `make coverage`, `make dev`, `make kill`, `make status`).

5. **Precision & Clarity**:
   - Avoid vagueness at all costs. Be explicit about parameter names, file locations, error messages, and API contracts.

6. **Target Environments**:
   - All code, scripts, build tools, and paths must support **Windows** and **Linux (Bazzite)** target platforms.
   - Avoid OS-specific hardcoded file paths (e.g. use standard path utilities).

7. **Technology Stack**:
   - **Frontend**: Tauri framework with a React-based UI.
   - **Backend**: Self-hostable server managing cloud saves, game downloads, and object storage coordination.
   - **Storage**: Object store model for retro ISOs/ROMs, PC game binaries, and save files.
   - **Metadata**: External open-source database integration (e.g., IGDB, RAWG) for game information and assets.

8. **Diagram & Documentation Formatting**:
   - Always use plain ASCII art code blocks (` ``` `) for diagrams, flowcharts, and architecture representations instead of external rendering engines (e.g., Mermaid). This guarantees 100% rendering compatibility across all markdown viewers and text editors.
