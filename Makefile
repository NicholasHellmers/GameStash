# GameStash Makefile
# Standardized Developer Automation for Windows and Linux (Bazzite)

.PHONY: help dev dev-server dev-desktop status kill test test-rust test-desktop build build-server build-desktop clean-build clean

.DEFAULT_GOAL := help

# OS Detection for Shell Commands
ifeq ($(OS),Windows_NT)
  STATUS_PORTS_CMD = @(netstat -ano | findstr /R "8080 1420 9000" 2>nul) || echo   No active ports found.
  STATUS_PROCS_CMD = @(tasklist /FI "IMAGENAME eq gamestash*" 2>nul | findstr /I "gamestash") || echo   No active gamestash processes found.
  KILL_SERVER_CMD  = @(taskkill /F /IM gamestash-server.exe 2>nul) || (call )
  KILL_DESKTOP_CMD = @(taskkill /F /IM gamestash-desktop.exe 2>nul) || (call )
else
  STATUS_PORTS_CMD = @(lsof -i :8080 -i :1420 -i :9000 2>/dev/null || ss -tulpn | grep -E "8080|1420|9000" 2>/dev/null) || echo "  No active ports found."
  STATUS_PROCS_CMD = @(pgrep -fl "gamestash|vite" 2>/dev/null) || echo "  No active gamestash processes found."
  KILL_SERVER_CMD  = @(pkill -9 -f "gamestash-server" 2>/dev/null) || true
  KILL_DESKTOP_CMD = @(pkill -9 -f "gamestash-desktop" 2>/dev/null) || true
endif

help: ## Show this help message
	@echo "GameStash Development Commands:"
	@echo ""
	@echo "  make dev           - Run backend server and Tauri desktop app concurrently"
	@echo "  make dev-server    - Run only the backend server locally"
	@echo "  make dev-desktop   - Run only the Tauri desktop frontend in dev mode"
	@echo "  make status        - Check if backend, desktop UI, or storage are running"
	@echo "  make kill          - Terminate all running/orphan GameStash processes"
	@echo "  make test          - Run all automated tests (Rust workspace + React Vitest suite)"
	@echo "  make test-rust     - Run only Rust workspace tests (cargo test --workspace)"
	@echo "  make test-desktop  - Run only React component tests (Vitest)"
	@echo "  make build         - Build production release binaries for Server and Desktop"
	@echo "  make build-server  - Build release binary for gamestash-server"
	@echo "  make build-desktop - Build release bundle for gamestash-desktop"
	@echo "  make clean-build   - Fast cleanup: remove only release binaries and dist folders"
	@echo "  make clean         - Deep cleanup: remove all target/ caches and node_modules"
	@echo ""

# -----------------------------------------------------------------------------
# Development & Process Management
# -----------------------------------------------------------------------------

dev: ## Run backend server and Tauri desktop app concurrently
	npm run dev

dev-server: ## Run only the backend server locally
	cargo run -p gamestash-server

dev-desktop: ## Run only the Tauri desktop frontend
	npm run dev:desktop

status: ## Check if backend server, desktop UI, or storage are active
	@echo Checking active GameStash services...
	@echo.
	@echo Ports in use (8080 = Server, 1420 = Desktop/Vite, 9000 = Storage):
	$(STATUS_PORTS_CMD)
	@echo.
	@echo Running processes:
	$(STATUS_PROCS_CMD)
	@echo.

kill: ## Stop all active or orphan GameStash processes
	@echo Stopping all GameStash processes...
	$(KILL_SERVER_CMD)
	$(KILL_DESKTOP_CMD)
	@echo GameStash processes stopped.

# -----------------------------------------------------------------------------
# Automated Testing Targets
# -----------------------------------------------------------------------------

test: test-rust test-desktop ## Run all automated tests

test-rust: ## Run Rust tests across core-types, server, and desktop
	cargo test --workspace

test-desktop: ## Run React component tests via Vitest
	npm run test:desktop

# -----------------------------------------------------------------------------
# Production Build & Verification Targets
# -----------------------------------------------------------------------------

build: build-server build-desktop ## Build production binaries for Server and Desktop

build-server: ## Build release binary for gamestash-server
	cargo build --release -p gamestash-server

build-desktop: ## Build release bundle for gamestash-desktop
	npm run build:desktop

# -----------------------------------------------------------------------------
# Cleanup Targets (Cross-platform via Node.js standard runtime)
# -----------------------------------------------------------------------------

clean-build: ## Fast cleanup: removes only release binaries and frontend dist
	npm run clean:build

clean: ## Deep cleanup: removes all target/ caches and node_modules
	npm run clean
