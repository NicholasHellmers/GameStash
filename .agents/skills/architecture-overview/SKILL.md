---
name: architecture-overview
description: Architectural overview, component interactions, subsystems, and data flows for the GameStash platform.
---

# GameStash Architecture Reference

Use this skill when planning new components, API endpoints, or data flows across GameStash.

```
+---------------------------------------------------------------------------------------------------+
|                                          CLIENT LAYER                                             |
|                                                                                                   |
|  +--------------------+   +---------------------+   +-----------------------+   +---------------+ |
|  | Local ROM Scanner  |   | Hashing Engine      |   | Client Metadata Engine|   | Save Sync     | |
|  | - Multi-copy dedup |   | - Header-aware MD5  |   | - IMetadataProvider   |   | - Steam-style | |
|  | - mtime/size cache |   | - SHA-1 & SHA-256   |   | - Local client cache  |   | - Safety undo | |
|  +---------+----------+   +----------+----------+   +-----------+-----------+   +-------+-------+ |
|            |                         |                          |                       |         |
|            +------------+------------+                          |                       |         |
|                         v                                       v                       v         |
|            +----------------------------+         +---------------------------+   +-------------+ |
|            | Unified Library State      |         | Downloader & Checksum     |   | Safe Trash  | |
|            | - Content-Addressable CAS  |         | - Streaming HTTP / S3     |   | - 1-click   | |
|            | - Strict `<platform>:<hash>`         | - Real-time progress IPC  |   |   restore   | |
|            | - Dynamic Card Fallback Art|         | - SHA-256 validation      |   |             | |
|            +----------------------------+         +---------------------------+   +-------------+ |
|                         │                                       │                                 |
+-------------------------|---------------------------------------|---------------------------------+
                          │                                       │
                          ▼                                       ▼
+---------------------------------------------------------------------------------------------------+
|                            SELF-HOSTED BACKEND & LEAN OBJECT STORE (Rust / Axum)                  |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | Game Storage Catalog & Hash Registry (Lean Physical Object Facts: Size, Key, SHA-256, MD5)  |  |
|  | - ZERO Hardcoded Data: Dynamic scan of `bootstrap_games/` at startup                        |  |
|  | - Deduplication-Proof: Indexed by canonical `<platform>:<retro_hash_or_sha256>`             |  |
|  +------------------------------+-------------------------------+------------------------------+  |
|                                 |                               |                                 |
|                                 v                               v                                 |
|                      +--------------------+          +--------------------+                       |
|                      | Save Manifest API  |          | Object Storage     |                       |
|                      | (/api/v1/saves)    |          | (ROMs, ISOs, Saves)|                       |
|                      +--------------------+          +--------------------+                       |
+---------------------------------------------------------------------------------------------------+
```

## Subsystems & Architecture Roles

### 1. Client Layer (Tauri v2 + React Frontend)
- **Unified Library Manager**: Merges remote server games with local scanned files into `UnifiedGame[]` tagged with `status: 'installed' | 'remote_only' | 'local_only'`. Deduplicates multiple local copies of the same ROM on disk under a single card with `localPaths[]`.
- **ROM/ISO Hashing Pipeline (`RomHasher`)**: Header-aware MD5 computation (stripping 512-byte SNES copier headers, 16-byte NES headers, 512-byte Genesis SMD headers) matching RetroAchievements and No-Intro standards, plus SHA-1 and SHA-256 calculation.
- **Client-Side Metadata Resolution Engine (`IMetadataProvider`)**: Resolves game titles, box art, release years, and descriptions on the frontend using `retro_hash` and title queries against pluggable providers (`ScreenScraperProvider`, `OpenGameDbProvider`, `CompositeMetadataProvider`), cached in client storage (`localStorage` / IndexedDB). Zero hardcoded static dictionaries.
- **Native Backend Scraper Service (`ScraperService`)**: Executes multi-tier scraper requests (Libretro No-Intro CDN, Wikipedia MediaWiki API, and ScreenScraper) natively in Rust via `reqwest`, bypassing browser CORS limits with atomic text + cover art resolution and automatic disk caching.
- **Persistent Disk Metadata Store (`MetadataStore`)**: Manages `%LOCALAPPDATA%\GameStash\metadata\gamelist.json` (or Linux `~/.local/share/GameStash/metadata/gamelist.json`), guaranteeing instant startup and zero reliance on fragile browser `localStorage`.
- **Local Media Cache Service (`MediaCacheService`)**: Automatically downloads and persists high-resolution box art to the client's local disk (`media/<platform>/covers/<canonical_id>.jpg`), eliminating redundant network traffic.
- **Interactive Manual Match Dialog (`ManualMatchModal`)**: Enables users to search external game databases, preview candidate box art, and override metadata with 1 click.
- **Library Scanner & Index Cache (`LibraryScanner`)**: Directory traversal across platform directories (`roms/snes`, `roms/gba`, `roms/ps1`, `roms/nes`, `roms/gb`, etc.) with mtime/size caching to avoid redundant hashing.
- **Streaming Downloader (`DownloadManager`)**: Downloads chunked streams from presigned S3/HTTP URLs to temporary `.part` files, validates SHA-256 checksums on-the-fly, and atomically places files in the target platform folder.
- **Engine Detector & Dispatcher (`EngineDetector`)**: Automatically detects Flatpaks on Linux Bazzite / Steam Deck (`org.libretro.RetroArch`, `org.duckstation.DuckStation`, `net.pcsx2.PCSX2`, `org.DolphinEmu.dolphin-emu`) and native executables on Windows, supporting user overrides.
- **Steam-Style Save Sync & Backup (`SaveBackupService` & `SaveManager`)**: Automatically snapshots replaced saves into `backups/recently_deleted/` before any cloud overwrite or conflict resolution, providing 1-click **Restore / Undo**.

### 2. Backend Layer (Rust / Axum Server)
- **Lean Object Catalog API**: Exposes `/api/v1/games` holding strictly physical object facts (`id`, `title`, `platform`, `file_size_bytes`, `storage_key`, `sha256_checksum`, `retro_hash`). Zero presentation metadata on server.
- **Physical Storage Streaming Route**: Exposes `/storage/*key` to stream raw ROM binaries from `bootstrap_games/` (or configured storage root) with `Content-Type: application/octet-stream`, `Content-Length`, and chunked streaming.
- **Dynamic Bootstrap Scanner**: Dynamically hashes ROMs in `bootstrap_games/` on startup. If missing/empty, logs `[WARN] No bootstrap games found in bootstrap_games/. Starting with empty catalog.` and starts cleanly with an empty catalog.
- **Strict Content-Addressable Canonical Game IDs**: All game IDs across server and desktop strictly follow `<platform>:<retro_hash_or_sha256>` (e.g. `snes:cdd3c8c373244976900f86dafa969707`), eliminating duplicates.
- **Download URL Generator**: Exposes `/api/v1/games/:id/download-url` returning time-limited presigned S3/local storage URLs and checksums.
- **Cloud Save Sync State Machine**: Exposes `/api/v1/saves/:id/manifest` and `/api/v1/saves/:id/sync` comparing client manifests against cloud manifests (`InSync`, `CloudNewer`, `LocalNewer`, `Conflict`).

### 3. Shared Data Models (`crates/core-types`)
- Defines `Game`, `Platform` (expanded with `Nes`, `Gb`, `Gbc`, etc.), `RomHash`, `LocalGame`, `UnifiedGame`, `EngineConfig`, `SaveManifest`, `SaveFileEntry`, `SaveBackupEntry`, `SyncStatus`, and `DownloadProgressPayload`.

### 4. Directory & Platform Conventions
- **Windows**: `%LOCALAPPDATA%\GameStash\roms` (library), `%LOCALAPPDATA%\GameStash\media` (cached media), and `%LOCALAPPDATA%\GameStash\backups` (undo stash).
- **Linux (Bazzite / Steam Deck)**: `~/Games/GameStash/roms` or SD card mount (`/run/media/.../GameStash/roms`), `~/.local/share/GameStash/media` (cached media), with Flatpak execution.
