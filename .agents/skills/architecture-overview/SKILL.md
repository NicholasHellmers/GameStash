---
name: architecture-overview
description: Architectural overview, component interactions, and data flows for the GameStash platform.
---

# GameStash Architecture Reference

Use this skill when planning new components, API endpoints, or data flows across GameStash.

## System Topology

```
+------------------------------------------------------------------------+
|                             CLIENT LAYER                               |
|                                                                        |
|                      +--------------------------+                      |
|                      |     Tauri + React UI     |                      |
|                      | (Game Launcher & Manager)|                      |
|                      +------------+-------------+                      |
+-----------------------------------|------------------------------------+
                                    |
                        API Requests & State Sync
                                    |
+-----------------------------------|------------------------------------+
|                    SELF-HOSTED INFRASTRUCTURE                          |
|                                   v                                    |
|                      +--------------------------+                      |
|                      |    GameStash Backend     |                      |
|                      | (Downloads & Cloud Saves)|                      |
|                      +-----+--------------+-----+                      |
|                            |              |                            |
|       Manage ROMs & Saves  |              |  Fetch Info & Cover Art    |
|                            v              v                            |
|                 +------------------+  +------------------+             |
|                 |   Object Store   |  | Open Game DB API |             |
|                 | (ISOs/ROMs/Saves)|  | (IGDB/Metadata)  |             |
|                 +------------------+  +------------------+             |
+------------------------------------------------------------------------+
```

## Component Roles & Communication

1. **Client (Tauri + React UI)**
   - Responsible for cross-platform desktop UI execution (Windows, Linux Bazzite).
   - Issues requests to the self-hosted backend for library updates, game launches, and save synchronization.

2. **Self-Hosted Backend**
   - Central control unit serving downloads, syncing cloud saves, and coordinating storage access.
   - Interfaces directly with external game databases to fetch metadata and assets, caching them locally or serving them to clients.

3. **Object Store**
   - Storage target responsible for binary payload storage (ISOs, ROMs, game builds, save states).

4. **External Game Metadata DB**
   - Open source database queried by the backend for information gathering (cover art, publisher, release dates).
