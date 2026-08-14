# GameStash AI Agent Guidelines & Policy

This file defines the project-specific rules, constraints, and best practices for AI agents assisting with the GameStash repository.

## Core Directives & AI Policy (From Project README)

1. **Feature Ownership & Codebase Understanding**:
   - Do NOT introduce full-blown features without explicit user direction and architectural alignment.
   - Codebase understanding is a key skill; do not replace human architectural oversight with autonomous code dumps.
   - Prioritize pair-programming: propose clean, focused implementations or incremental steps rather than massive unsolicited refactors.

2. **Testing Policy**:
   - AI-written tests are acceptable and encouraged, but **every test must have a clear purpose and explicit reason**.
   - No dummy/filler assertions (`expect(true).toBe(true)`) or redundant tests.
   - Target full automation across:
     - Tauri/React UI components
     - Background logic & async workflows
     - CLI interfaces
     - Server actions & API routes

3. **Precision & Clarity**:
   - Avoid vagueness at all costs. Be explicit about parameter names, file locations, error messages, and API contracts.

4. **Target Environments**:
   - All code, scripts, build tools, and paths must support **Windows** and **Linux (Bazzite)** target platforms.
   - Avoid OS-specific hardcoded file paths (e.g. use standard path utilities).

5. **Technology Stack**:
   - **Frontend**: Tauri framework with a React-based UI.
   - **Backend**: Self-hostable server managing cloud saves, game downloads, and object storage coordination.
   - **Storage**: Object store model for retro ISOs/ROMs, PC game binaries, and save files.
   - **Metadata**: External open-source database integration (e.g., IGDB, RAWG) for game information and assets.

6. **Diagram & Documentation Formatting**:
   - Always use plain ASCII art code blocks (` ``` `) for diagrams, flowcharts, and architecture representations instead of external rendering engines (e.g., Mermaid). This guarantees 100% rendering compatibility across all markdown viewers and text editors.
