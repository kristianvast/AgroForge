import { Component, For, Show, createMemo, createEffect, createSignal, onMount, onCleanup, lazy, Suspense } from "solid-js"
import { Dialog } from "@kobalte/core/dialog"
import { Toaster } from "solid-toast"
import { showConfirmDialog } from "./stores/alerts"
import InstanceTabs from "./components/instance-tabs"
import { InstanceMetadataProvider } from "./lib/contexts/instance-metadata-context"
import { initMarkdown } from "./lib/markdown"
import { initGithubStars } from "./stores/github-stars"

// Lazy loaded components for better initial load performance
const AlertDialog = lazy(() => import("./components/alert-dialog"))
const FolderSelectionView = lazy(() => import("./components/folder-selection-view"))
const InstanceDisconnectedModal = lazy(() => import("./components/instance-disconnected-modal"))
const InstanceShell = lazy(() => import("./components/instance/instance-shell2"))
const RemoteAccessOverlay = lazy(() => import("./components/remote-access-overlay").then(m => ({ default: m.RemoteAccessOverlay })))

import { useTheme } from "./lib/theme"
import { useCommands } from "./lib/hooks/use-commands"
import { useAppLifecycle } from "./lib/hooks/use-app-lifecycle"
import { getLogger } from "./lib/logger"
import { initReleaseNotifications } from "./stores/releases"
import { runtimeEnv } from "./lib/runtime-env"
import {
  hasInstances,
  isSelectingFolder,
  setIsSelectingFolder,
  showFolderSelection,
  setShowFolderSelection,
} from "./stores/ui"
import { useConfig } from "./stores/preferences"
import {
  createInstance,
  instances,
  activeInstanceId,
  setActiveInstanceId,
  stopInstance,
  getActiveInstance,
  disconnectedInstance,
  acknowledgeDisconnectedInstance,
} from "./stores/instances"
import {
  getSessions,
  activeSessionId,
  setActiveParentSession,
  clearActiveParentSession,
  createSession,
  fetchSessions,
  updateSessionAgent,
  updateSessionModel,
} from "./stores/sessions"

const log = getLogger("actions")

// Lightweight loading fallback for lazy components
const LoadingFallback: Component<{ class?: string }> = (props) => (
  <div class={`flex items-center justify-center ${props.class || ""}`}>
    <div class="animate-pulse text-secondary">Loading...</div>
  </div>
)

// Shell loading fallback with proper sizing
const ShellLoadingFallback: Component = () => (
  <div class="flex-1 min-h-0 overflow-hidden flex items-center justify-center bg-surface">
    <div class="flex flex-col items-center gap-3">
      <div class="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <span class="text-sm text-secondary">Loading workspace...</span>
    </div>
  </div>
)

const App: Component = () => {
  const { isDark } = useTheme()
  const {
    preferences,
    recordWorkspaceLaunch,
    toggleShowThinkingBlocks,
    toggleShowTimelineTools,
    toggleAutoCleanupBlankSessions,
    toggleUsageMetrics,
    setDiffViewMode,
    setToolOutputExpansion,
    setDiagnosticsExpansion,
    setThinkingBlocksExpansion,
  } = useConfig()
  const [escapeInDebounce, setEscapeInDebounce] = createSignal(false)
  interface LaunchErrorState {
    message: string
    binaryPath: string
    missingBinary: boolean
  }
  const [launchError, setLaunchError] = createSignal<LaunchErrorState | null>(null)
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = createSignal(false)
  const [remoteAccessOpen, setRemoteAccessOpen] = createSignal(false)
  const [instanceTabBarHeight, setInstanceTabBarHeight] = createSignal(0)

  const updateInstanceTabBarHeight = () => {
    if (typeof document === "undefined") return
    const element = document.querySelector<HTMLElement>(".tab-bar-instance")
    setInstanceTabBarHeight(element?.offsetHeight ?? 0)
  }

  // Defer markdown initialization until after first paint for smoother loading
  createEffect(() => {
    // Use requestIdleCallback for non-critical initialization
    const initMarkdownDeferred = () => {
      void initMarkdown(isDark()).catch((error) => log.error("Failed to initialize markdown", error))
    }
    if ("requestIdleCallback" in window) {
      ;(window as any).requestIdleCallback(initMarkdownDeferred, { timeout: 2000 })
    } else {
      setTimeout(initMarkdownDeferred, 100)
    }
  })

  // Defer release notifications check - not needed for initial render
  onMount(() => {
    if ("requestIdleCallback" in window) {
      ;(window as any).requestIdleCallback(() => initReleaseNotifications(), { timeout: 5000 })
    } else {
      setTimeout(() => initReleaseNotifications(), 1000)
    }
  })

  createEffect(() => {
    instances()
    hasInstances()
    requestAnimationFrame(() => updateInstanceTabBarHeight())
  })

  onMount(() => {
    // Defer GitHub stars fetch - purely cosmetic, not needed immediately
    if ("requestIdleCallback" in window) {
      ;(window as any).requestIdleCallback(() => void initGithubStars(), { timeout: 5000 })
    } else {
      setTimeout(() => void initGithubStars(), 1000)
    }

    updateInstanceTabBarHeight()
    const handleResize = () => updateInstanceTabBarHeight()
    window.addEventListener("resize", handleResize)
    onCleanup(() => window.removeEventListener("resize", handleResize))
  })

  const activeInstance = createMemo(() => getActiveInstance())
  const activeSessionIdForInstance = createMemo(() => {
    const instance = activeInstance()
    if (!instance) return null
    return activeSessionId().get(instance.id) || null
  })

  const launchErrorPath = () => {
    const value = launchError()?.binaryPath
    if (!value) return "opencode"
    return value.trim() || "opencode"
  }

  const launchErrorMessage = () => launchError()?.message ?? ""

  const formatLaunchErrorMessage = (error: unknown): string => {
    if (!error) {
      return "Failed to launch workspace"
    }
    const raw = typeof error === "string" ? error : error instanceof Error ? error.message : String(error)
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.error === "string") {
        return parsed.error
      }
    } catch {
      // ignore JSON parse errors
    }
    return raw
  }

  const isMissingBinaryMessage = (message: string): boolean => {
    const normalized = message.toLowerCase()
    return (
      normalized.includes("opencode binary not found") ||
      normalized.includes("binary not found") ||
      normalized.includes("no such file or directory") ||
      normalized.includes("binary is not executable") ||
      normalized.includes("enoent")
    )
  }

  const clearLaunchError = () => setLaunchError(null)

  async function handleSelectFolder(folderPath: string, binaryPath?: string) {
    if (!folderPath) {
      return
    }
    setIsSelectingFolder(true)
    const selectedBinary = binaryPath || preferences().lastUsedBinary || "opencode"
    try {
      recordWorkspaceLaunch(folderPath, selectedBinary)
      clearLaunchError()
      const instanceId = await createInstance(folderPath, selectedBinary)
      setShowFolderSelection(false)
      setIsAdvancedSettingsOpen(false)

      log.info("Created instance", {
        instanceId,
        port: instances().get(instanceId)?.port,
      })
    } catch (error) {
      const message = formatLaunchErrorMessage(error)
      const missingBinary = isMissingBinaryMessage(message)
      setLaunchError({
        message,
        binaryPath: selectedBinary,
        missingBinary,
      })
      log.error("Failed to create instance", error)
    } finally {
      setIsSelectingFolder(false)
    }
  }

  function handleLaunchErrorClose() {
    clearLaunchError()
  }

  function handleLaunchErrorAdvanced() {
    clearLaunchError()
    setIsAdvancedSettingsOpen(true)
  }

  function handleNewInstanceRequest() {
    if (hasInstances()) {
      setShowFolderSelection(true)
    }
  }

  async function handleDisconnectedInstanceClose() {
    try {
      await acknowledgeDisconnectedInstance()
    } catch (error) {
      log.error("Failed to finalize disconnected instance", error)
    }
  }

  async function handleCloseInstance(instanceId: string) {
    const confirmed = await showConfirmDialog(
      "Stop OpenCode instance? This will stop the server.",
      {
        title: "Stop instance",
        variant: "warning",
        confirmLabel: "Stop",
        cancelLabel: "Keep running",
      },
    )

    if (!confirmed) return

    await stopInstance(instanceId)
  }

  async function handleNewSession(instanceId: string) {
    try {
      const session = await createSession(instanceId)
      setActiveParentSession(instanceId, session.id)
    } catch (error) {
      log.error("Failed to create session", error)
    }
  }

  async function handleCloseSession(instanceId: string, sessionId: string) {
    const sessions = getSessions(instanceId)
    const session = sessions.find((s) => s.id === sessionId)

    if (!session) {
      return
    }

    const parentSessionId = session.parentId ?? session.id
    const parentSession = sessions.find((s) => s.id === parentSessionId)

    if (!parentSession || parentSession.parentId !== null) {
      return
    }

    clearActiveParentSession(instanceId)

    try {
      await fetchSessions(instanceId)
    } catch (error) {
      log.error("Failed to refresh sessions after closing", error)
    }
  }

  const handleSidebarAgentChange = async (instanceId: string, sessionId: string, agent: string) => {
    if (!instanceId || !sessionId || sessionId === "info") return
    await updateSessionAgent(instanceId, sessionId, agent)
  }

  const handleSidebarModelChange = async (
    instanceId: string,
    sessionId: string,
    model: { providerId: string; modelId: string },
  ) => {
    if (!instanceId || !sessionId || sessionId === "info") return
    await updateSessionModel(instanceId, sessionId, model)
  }

  const { commands: paletteCommands, executeCommand } = useCommands({
    preferences,
    toggleAutoCleanupBlankSessions,
    toggleShowThinkingBlocks,
    toggleShowTimelineTools,
    toggleUsageMetrics,
    setDiffViewMode,
    setToolOutputExpansion,
    setDiagnosticsExpansion,
    setThinkingBlocksExpansion,
    handleNewInstanceRequest,
    handleCloseInstance,
    handleNewSession,
    handleCloseSession,
    getActiveInstance: activeInstance,
    getActiveSessionIdForInstance: activeSessionIdForInstance,
  })

  useAppLifecycle({
    setEscapeInDebounce,
    handleNewInstanceRequest,
    handleCloseInstance,
    handleNewSession,
    handleCloseSession,
    showFolderSelection,
    setShowFolderSelection,
    getActiveInstance: activeInstance,
    getActiveSessionIdForInstance: activeSessionIdForInstance,
  })

  // Listen for Tauri menu events
  onMount(() => {
    if (runtimeEnv.host === "tauri") {
      const tauriBridge = (window as { __TAURI__?: { event?: { listen: (event: string, handler: (event: { payload: unknown }) => void) => Promise<() => void> } } }).__TAURI__
      if (tauriBridge?.event) {
        let unlistenMenu: (() => void) | null = null
        
        tauriBridge.event.listen("menu:newInstance", () => {
          handleNewInstanceRequest()
        }).then((unlisten) => {
          unlistenMenu = unlisten
        }).catch((error) => {
          log.error("Failed to listen for menu:newInstance event", error)
        })

        onCleanup(() => {
          unlistenMenu?.()
        })
      }
    }
  })

  return (
    <>
      <Suspense fallback={null}>
        <InstanceDisconnectedModal
          open={Boolean(disconnectedInstance())}
          folder={disconnectedInstance()?.folder}
          reason={disconnectedInstance()?.reason}
          onClose={handleDisconnectedInstanceClose}
        />
      </Suspense>

      <Dialog open={Boolean(launchError())} modal>
        <Dialog.Portal>
          <Dialog.Overlay class="modal-overlay" />
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Dialog.Content class="modal-surface w-full max-w-md p-6 flex flex-col gap-6">
              <div>
                <Dialog.Title class="text-xl font-semibold text-primary">Unable to launch OpenCode</Dialog.Title>
                <Dialog.Description class="text-sm text-secondary mt-2 break-words">
                  We couldn't start the selected OpenCode binary. Review the error output below or choose a different
                  binary from Advanced Settings.
                </Dialog.Description>
              </div>

              <div class="rounded-lg border border-base bg-surface-secondary p-4">
                <p class="text-xs font-medium text-muted uppercase tracking-wide mb-1">Binary path</p>
                <p class="text-sm font-mono text-primary break-all">{launchErrorPath()}</p>
              </div>

              <Show when={launchErrorMessage()}>
                <div class="rounded-lg border border-base bg-surface-secondary p-4">
                  <p class="text-xs font-medium text-muted uppercase tracking-wide mb-1">Error output</p>
                  <pre class="text-sm font-mono text-primary whitespace-pre-wrap break-words max-h-48 overflow-y-auto">{launchErrorMessage()}</pre>
                </div>
              </Show>

              <div class="flex justify-end gap-2">
                <Show when={launchError()?.missingBinary}>
                  <button
                    type="button"
                    class="selector-button selector-button-secondary"
                    onClick={handleLaunchErrorAdvanced}
                  >
                    Open Advanced Settings
                  </button>
                </Show>
                <button type="button" class="selector-button selector-button-primary" onClick={handleLaunchErrorClose}>
                  Close
                </button>
              </div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog>
      <div class="h-screen w-screen flex flex-col">
        <Show
          when={!hasInstances()}
          fallback={
            <>
              <InstanceTabs
                instances={instances()}
                activeInstanceId={activeInstanceId()}
                onSelect={setActiveInstanceId}
                onClose={handleCloseInstance}
                onNew={handleNewInstanceRequest}
                onOpenRemoteAccess={() => setRemoteAccessOpen(true)}
              />
 
              <For each={Array.from(instances().values())}>
                {(instance) => {
                  const isActiveInstance = () => activeInstanceId() === instance.id
                  const isVisible = () => isActiveInstance() && !showFolderSelection()
                    return (
                      <div class="flex-1 min-h-0 overflow-hidden" style={{ display: isVisible() ? "flex" : "none" }}>
                        <InstanceMetadataProvider instance={instance}>
                          <Suspense fallback={<ShellLoadingFallback />}>
                            <InstanceShell
                              instance={instance}
                              escapeInDebounce={escapeInDebounce()}
                              paletteCommands={paletteCommands}
                              onCloseSession={(sessionId) => handleCloseSession(instance.id, sessionId)}
                              onNewSession={() => handleNewSession(instance.id)}
                              handleSidebarAgentChange={(sessionId, agent) => handleSidebarAgentChange(instance.id, sessionId, agent)}
                              handleSidebarModelChange={(sessionId, model) => handleSidebarModelChange(instance.id, sessionId, model)}
                              onExecuteCommand={executeCommand}
                              tabBarOffset={instanceTabBarHeight()}
                            />
                          </Suspense>
                        </InstanceMetadataProvider>

                      </div>
                    )

                }}
              </For>

            </>
          }
        >
          <Suspense fallback={<LoadingFallback class="h-screen w-screen" />}>
            <FolderSelectionView
              onSelectFolder={handleSelectFolder}
              isLoading={isSelectingFolder()}
              advancedSettingsOpen={isAdvancedSettingsOpen()}
              onAdvancedSettingsOpen={() => setIsAdvancedSettingsOpen(true)}
              onAdvancedSettingsClose={() => setIsAdvancedSettingsOpen(false)}
              onOpenRemoteAccess={() => setRemoteAccessOpen(true)}
            />
          </Suspense>
        </Show>

        <Show when={showFolderSelection()}>
          <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div class="w-full h-full relative">
              <button
                onClick={() => {
                  setShowFolderSelection(false)
                  setIsAdvancedSettingsOpen(false)
                  clearLaunchError()
                }}
                class="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Close (Esc)"
              >
                <svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <Suspense fallback={<LoadingFallback class="h-full w-full" />}>
                <FolderSelectionView
                  onSelectFolder={handleSelectFolder}
                  isLoading={isSelectingFolder()}
                  advancedSettingsOpen={isAdvancedSettingsOpen()}
                  onAdvancedSettingsOpen={() => setIsAdvancedSettingsOpen(true)}
                  onAdvancedSettingsClose={() => setIsAdvancedSettingsOpen(false)}
                />
              </Suspense>
            </div>
          </div>
        </Show>

        <Suspense fallback={null}>
          <RemoteAccessOverlay open={remoteAccessOpen()} onClose={() => setRemoteAccessOpen(false)} />
        </Suspense>

        <Suspense fallback={null}>
          <AlertDialog />
        </Suspense>

        <Toaster
          position="top-right"
          gutter={16}
          toastOptions={{
            duration: 8000,
            className: "bg-transparent border-none shadow-none p-0",
          }}
        />
      </div>
    </>
  )
}


export default App
