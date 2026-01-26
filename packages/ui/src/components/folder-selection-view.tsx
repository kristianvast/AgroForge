import { Component, createSignal, Show, For, onMount, onCleanup, createEffect } from "solid-js"
import { Folder, Clock, Trash2, FolderPlus, Settings, ChevronRight, MonitorUp, Star } from "lucide-solid"
import { useConfig } from "../stores/preferences"
import AdvancedSettingsModal from "./advanced-settings-modal"
import DirectoryBrowserDialog from "./directory-browser-dialog"
import Kbd from "./kbd"
import { openNativeFolderDialog, supportsNativeDialogs } from "../lib/native/native-functions"
import VersionPill from "./version-pill"
import { DiscordSymbolIcon, GitHubMarkIcon } from "./brand-icons"
import { githubStars } from "../stores/github-stars"
import { formatCompactCount } from "../lib/formatters"

const agroForgeLogo = new URL("../images/CodeNomad-Icon.png", import.meta.url).href


interface FolderSelectionViewProps {
  onSelectFolder: (folder: string, binaryPath?: string) => void
  isLoading?: boolean
  advancedSettingsOpen?: boolean
  onAdvancedSettingsOpen?: () => void
  onAdvancedSettingsClose?: () => void
  onOpenRemoteAccess?: () => void
  autoOpenNative?: boolean
}

const FolderSelectionView: Component<FolderSelectionViewProps> = (props) => {
  const { recentFolders, removeRecentFolder, preferences } = useConfig()
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [focusMode, setFocusMode] = createSignal<"recent" | "new" | null>("recent")
  const [selectedBinary, setSelectedBinary] = createSignal(preferences().lastUsedBinary || "opencode")
  const [isFolderBrowserOpen, setIsFolderBrowserOpen] = createSignal(false)
  const [hasAutoOpened, setHasAutoOpened] = createSignal(false)
  const nativeDialogsAvailable = supportsNativeDialogs()
  let recentListRef: HTMLDivElement | undefined
 
  const folders = () => recentFolders()
  const isLoading = () => Boolean(props.isLoading)

  // Update selected binary when preferences change
  createEffect(() => {
    const lastUsed = preferences().lastUsedBinary
    if (!lastUsed) return
    setSelectedBinary((current) => (current === lastUsed ? current : lastUsed))
  })

  createEffect(() => {
    if (!props.autoOpenNative) return
    if (hasAutoOpened()) return
    if (!nativeDialogsAvailable || isLoading()) return
    setHasAutoOpened(true)
    void handleBrowse()
  })


  function scrollToIndex(index: number) {
    const container = recentListRef
    if (!container) return
    const element = container.querySelector(`[data-folder-index="${index}"]`) as HTMLElement | null
    if (!element) return

    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()

    if (elementRect.top < containerRect.top) {
      container.scrollTop -= containerRect.top - elementRect.top
    } else if (elementRect.bottom > containerRect.bottom) {
      container.scrollTop += elementRect.bottom - containerRect.bottom
    }
  }


  function handleKeyDown(e: KeyboardEvent) {
    let activeElement: HTMLElement | null = null
    if (typeof document !== "undefined") {
      activeElement = document.activeElement as HTMLElement | null
    }
    const insideModal = activeElement?.closest(".modal-surface") || activeElement?.closest("[role='dialog']")
    const isEditingField =
      activeElement &&
      (["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName) || activeElement.isContentEditable || Boolean(insideModal))

    if (isEditingField) {
      return
    }

    const normalizedKey = e.key.toLowerCase()
    const isBrowseShortcut = (e.metaKey || e.ctrlKey) && !e.shiftKey && normalizedKey === "n"
    const blockedKeys = [
      "ArrowDown",
      "ArrowUp",
      "PageDown",
      "PageUp",
      "Home",
      "End",
      "Enter",
      "Backspace",
      "Delete",
    ]

    if (isLoading()) {
      if (isBrowseShortcut || blockedKeys.includes(e.key)) {
        e.preventDefault()
      }
      return
    }

    const folderList = folders()

    if (isBrowseShortcut) {
      e.preventDefault()
      void handleBrowse()
      return
    }

    if (folderList.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      const newIndex = Math.min(selectedIndex() + 1, folderList.length - 1)
      setSelectedIndex(newIndex)
      setFocusMode("recent")
      scrollToIndex(newIndex)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const newIndex = Math.max(selectedIndex() - 1, 0)
      setSelectedIndex(newIndex)
      setFocusMode("recent")
      scrollToIndex(newIndex)
    } else if (e.key === "PageDown") {
      e.preventDefault()
      const pageSize = 5
      const newIndex = Math.min(selectedIndex() + pageSize, folderList.length - 1)
      setSelectedIndex(newIndex)
      setFocusMode("recent")
      scrollToIndex(newIndex)
    } else if (e.key === "PageUp") {
      e.preventDefault()
      const pageSize = 5
      const newIndex = Math.max(selectedIndex() - pageSize, 0)
      setSelectedIndex(newIndex)
      setFocusMode("recent")
      scrollToIndex(newIndex)
    } else if (e.key === "Home") {
      e.preventDefault()
      setSelectedIndex(0)
      setFocusMode("recent")
      scrollToIndex(0)
    } else if (e.key === "End") {
      e.preventDefault()
      const newIndex = folderList.length - 1
      setSelectedIndex(newIndex)
      setFocusMode("recent")
      scrollToIndex(newIndex)
    } else if (e.key === "Enter") {
      e.preventDefault()
      handleEnterKey()
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault()
      if (folderList.length > 0 && focusMode() === "recent") {
        const folder = folderList[selectedIndex()]
        if (folder) {
          handleRemove(folder.path)
        }
      }
    }
  }


  function handleEnterKey() {
    if (isLoading()) return
    const folderList = folders()
    const index = selectedIndex()

    const folder = folderList[index]
    if (folder) {
      handleFolderSelect(folder.path)
    }
  }


  onMount(() => {
    window.addEventListener("keydown", handleKeyDown)
    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown)
    })
  })

  function formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return "just now"
  }

  function handleFolderSelect(path: string) {
    if (isLoading()) return
    props.onSelectFolder(path, selectedBinary())
  }

  const openExternalLink = (url: string) => {
    if (typeof window === "undefined") return
    window.open(url, "_blank", "noopener,noreferrer")
  }
 
  async function handleBrowse() {
    if (isLoading()) return
    setFocusMode("new")
    if (nativeDialogsAvailable) {
      const fallbackPath = folders()[0]?.path
      const selected = await openNativeFolderDialog({
        title: "Select Workspace",
        defaultPath: fallbackPath,
      })
      if (selected) {
        handleFolderSelect(selected)
      }
      return
    }
    setIsFolderBrowserOpen(true)
  }
 
  function handleBrowserSelect(path: string) {
    setIsFolderBrowserOpen(false)
    handleFolderSelect(path)
  }
 
  function handleBinaryChange(binary: string) {

    setSelectedBinary(binary)
  }

  function handleRemove(path: string, e?: Event) {
    if (isLoading()) return
    e?.stopPropagation()
    removeRecentFolder(path)

    const folderList = folders()
    if (selectedIndex() >= folderList.length && folderList.length > 0) {
      setSelectedIndex(folderList.length - 1)
    }
  }


  function getDisplayPath(path: string): string {
    if (path.startsWith("/Users/")) {
      return path.replace(/^\/Users\/[^/]+/, "~")
    }
    return path
  }

  return (
    <>
      <div
        class="flex h-screen w-full items-start justify-center overflow-hidden py-6 px-4 sm:px-6 relative particle-container"
        style="background-color: var(--surface-secondary)"
      >
        {/* Particle Background Effect */}
        <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div class="particle" style="left: 10%; animation-delay: 0s;" />
          <div class="particle" style="left: 20%; animation-delay: 0.7s;" />
          <div class="particle" style="left: 35%; animation-delay: 1.4s;" />
          <div class="particle" style="left: 50%; animation-delay: 0.3s;" />
          <div class="particle" style="left: 65%; animation-delay: 2.1s;" />
          <div class="particle" style="left: 80%; animation-delay: 1.1s;" />
          <div class="particle" style="left: 90%; animation-delay: 0.5s;" />
          <div class="particle" style="left: 15%; animation-delay: 1.8s;" />
          <div class="particle" style="left: 45%; animation-delay: 2.5s;" />
          <div class="particle" style="left: 75%; animation-delay: 0.9s;" />
        </div>
        
        {/* Subtle scanline overlay */}
        <div class="absolute inset-0 pointer-events-none opacity-30 scanline-effect" aria-hidden="true" />
        
        <div
          class="w-full max-w-5xl h-full px-4 sm:px-8 pb-2 flex flex-col overflow-hidden relative z-10"
          aria-busy={isLoading() ? "true" : "false"}
        >
          <Show when={props.onOpenRemoteAccess}>
            <div class="absolute top-4 right-6">
              <button
                type="button"
                class="selector-button selector-button-secondary w-auto p-2 inline-flex items-center justify-center hover-lift glass-effect"
                onClick={() => props.onOpenRemoteAccess?.()}
              >
                <MonitorUp class="w-4 h-4" />
              </button>
            </div>
          </Show>
          <div class="mb-6 text-center shrink-0 fade-slide-in">
            <div class="mb-3 flex justify-center">
              <img 
                src={agroForgeLogo} 
                alt="AgroForge logo" 
                class="h-32 w-auto sm:h-48 animate-float drop-shadow-lg" 
                style="filter: drop-shadow(0 0 20px rgba(0, 255, 204, 0.3))"
                loading="lazy" 
              />
            </div>
            <h1 class="mb-2 text-4xl sm:text-5xl font-bold gradient-text tracking-tight">AgroForge</h1>
            <p class="text-base sm:text-lg text-secondary max-w-md mx-auto fade-slide-in-delay-1">
              Agricultural Intelligence for Modern Developers
            </p>
            <div class="mt-4 flex justify-center gap-3 fade-slide-in-delay-2">
              <a
                href="https://github.com/NeuralNomadsAI/CodeNomad"
                target="_blank"
                rel="noreferrer"
                class="selector-button selector-button-secondary w-auto p-2.5 inline-flex items-center justify-center hover-lift glass-effect rounded-lg"
                aria-label="AgroForge GitHub"
                title="AgroForge GitHub"
                onClick={(event) => {
                  event.preventDefault()
                  openExternalLink("https://github.com/NeuralNomadsAI/CodeNomad")
                }}
              >
                <GitHubMarkIcon class="w-5 h-5" />
              </a>
              <a
                href="https://github.com/NeuralNomadsAI/CodeNomad"
                target="_blank"
                rel="noreferrer"
                class="selector-button selector-button-secondary w-auto px-4 py-2 inline-flex items-center justify-center gap-2 hover-lift glass-effect rounded-lg"
                aria-label="AgroForge GitHub Stars"
                title="AgroForge GitHub Stars"
                onClick={(event) => {
                  event.preventDefault()
                  openExternalLink("https://github.com/NeuralNomadsAI/CodeNomad")
                }}
              >
                <Star class="w-4 h-4 text-accent" />
                <Show when={githubStars() !== null}>
                  <span class="text-sm font-medium">{formatCompactCount(githubStars()!)}</span>
                </Show>
              </a>
              <a
                href="https://discord.com/channels/1391832426048651334/1458412028325793887/1464701235683917945"
                target="_blank"
                rel="noreferrer"
                class="selector-button selector-button-secondary w-auto p-2.5 inline-flex items-center justify-center hover-lift glass-effect rounded-lg"
                aria-label="AgroForge Discord"
                title="AgroForge Discord"
                onClick={(event) => {
                  event.preventDefault()
                  openExternalLink(
                    "https://discord.com/channels/1391832426048651334/1458412028325793887/1464701235683917945",
                  )
                }}
              >
                <DiscordSymbolIcon class="w-5 h-5" />
              </a>
            </div>
          </div>

          <div class="flex-1 min-h-0 overflow-hidden flex flex-col gap-4 fade-slide-in-delay-3">
            <div class="flex-1 min-h-0 overflow-hidden flex flex-col lg:flex-row gap-4">
              {/* Right column: recent folders */}
              <div class="order-1 lg:order-2 flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
              <Show
                when={folders().length > 0}
                fallback={
                  <div class="panel panel-empty-state flex-1 glass-effect neon-border">
                    <div class="panel-empty-state-icon animate-glow">
                      <Clock class="w-12 h-12 mx-auto text-accent" />
                    </div>
                    <p class="panel-empty-state-title gradient-text-static">No Recent Folders</p>
                    <p class="panel-empty-state-description">Browse for a folder to get started</p>
                  </div>
                }
              >
                <div class="panel flex flex-col flex-1 min-h-0 glass-effect" style="border: 1px solid var(--glass-border)">
                  <div class="panel-header">
                    <h2 class="panel-title gradient-text-static">Recent Folders</h2>
                    <p class="panel-subtitle">
                      {folders().length} {folders().length === 1 ? "folder" : "folders"} available
                    </p>
                  </div>
                  <div
                    class="panel-list panel-list--fill flex-1 min-h-0 overflow-auto"
                    ref={(el) => (recentListRef = el)}
                  >
                    <For each={folders()}>
                      {(folder, index) => (
                        <div
                          class="panel-list-item transition-all duration-200"
                          classList={{
                            "panel-list-item-highlight neon-border-static": focusMode() === "recent" && selectedIndex() === index(),
                            "panel-list-item-disabled": isLoading(),
                          }}
                          style={focusMode() === "recent" && selectedIndex() === index() ? "box-shadow: var(--glow-primary); border-radius: var(--radius-md)" : ""}
                        >
                          <div class="flex items-center gap-2 w-full px-1">
                            <button
                              data-folder-index={index()}
                              class="panel-list-item-content flex-1 hover-lift"
                              disabled={isLoading()}
                              onClick={() => handleFolderSelect(folder.path)}
                              onMouseEnter={() => {
                                if (isLoading()) return
                                setFocusMode("recent")
                                setSelectedIndex(index())
                              }}
                            >
                              <div class="flex items-center justify-between gap-3 w-full">
                                <div class="flex-1 min-w-0">
                                  <div class="flex items-center gap-2 mb-1">
                                    <Folder class="w-4 h-4 flex-shrink-0 icon-accent" />
                                    <span class="text-sm font-medium truncate text-primary">
                                      {folder.path.split("/").pop()}
                                    </span>
                                  </div>
                                  <div class="text-xs font-mono truncate pl-6 text-muted">
                                    {getDisplayPath(folder.path)}
                                  </div>
                                  <div class="text-xs mt-1 pl-6 text-muted">
                                    {formatRelativeTime(folder.lastAccessed)}
                                  </div>
                                </div>
                                <Show when={focusMode() === "recent" && selectedIndex() === index()}>
                                  <kbd class="kbd neon-border-static" style="box-shadow: 0 0 8px var(--neon-cyan)">↵</kbd>
                                </Show>
                              </div>
                            </button>
                            <button
                              onClick={(e) => handleRemove(folder.path, e)}
                              disabled={isLoading()}
                              class="p-2 transition-all hover:bg-red-500/20 opacity-70 hover:opacity-100 rounded-lg"
                              title="Remove from recent"
                              style="transition: all 0.2s ease"
                            >
                              <Trash2 class="w-3.5 h-3.5 transition-colors icon-muted hover:text-red-500" style="filter: drop-shadow(0 0 0 transparent); transition: filter 0.2s ease" />
                            </button>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              </div>

              {/* Left column: version + browse + advanced settings */}
              <div class="order-2 lg:order-1 flex flex-col gap-4 flex-1 min-h-0">
              <div class="panel shrink-0 glass-effect tech-corners" style="border: 1px solid var(--glass-border)">
                <div class="panel-header hidden sm:block">
                  <h2 class="panel-title gradient-text-static">Browse for Folder</h2>
                  <p class="panel-subtitle">Select any folder on your computer</p>
                </div>

                <div class="panel-body">
                  <button
                    onClick={() => void handleBrowse()}
                    disabled={props.isLoading}
                    class="button-primary w-full flex items-center justify-center text-sm disabled:cursor-not-allowed hover-lift relative overflow-hidden group"
                    style="box-shadow: var(--glow-primary); transition: box-shadow 0.3s ease, transform 0.3s ease"
                    onMouseEnter={() => setFocusMode("new")}
                  >
                    <div class="absolute inset-0 animate-shimmer opacity-50" />
                    <div class="flex items-center gap-2 relative z-10">
                      <FolderPlus class="w-5 h-5" />
                      <span class="font-semibold">{props.isLoading ? "Opening..." : "Browse Folders"}</span>
                    </div>
                    <Kbd shortcut="cmd+n" class="ml-3 relative z-10" />
                  </button>
                </div>

                {/* Advanced settings section */}
                <div class="panel-section w-full">
                  <button onClick={() => props.onAdvancedSettingsOpen?.()} class="panel-section-header w-full justify-between hover-lift rounded-lg">
                    <div class="flex items-center gap-2">
                      <Settings class="w-4 h-4 icon-accent" />
                      <span class="text-sm font-medium text-secondary">Advanced Settings</span>
                    </div>
                    <ChevronRight class="w-4 h-4 icon-muted" />
                  </button>
                </div>
              </div>

              <div class="panel shrink-0 glass-effect" style="border: 1px solid var(--glass-border)">
                <div class="panel-body flex items-center justify-center">
                  <VersionPill />
                </div>
              </div>
            </div>

            </div>

            <div class="panel panel-footer shrink-0 hidden sm:block glass-effect" style="border: 1px solid var(--glass-border); border-radius: var(--radius-lg)">
              <div class="panel-footer-hints">
                <Show when={folders().length > 0}>
                  <div class="flex items-center gap-1.5">
                    <kbd class="kbd neon-border-static" style="box-shadow: 0 0 5px var(--neon-cyan)">↑</kbd>
                    <kbd class="kbd neon-border-static" style="box-shadow: 0 0 5px var(--neon-cyan)">↓</kbd>
                    <span class="text-secondary">Navigate</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <kbd class="kbd neon-border-static" style="box-shadow: 0 0 5px var(--neon-cyan)">Enter</kbd>
                    <span class="text-secondary">Select</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <kbd class="kbd neon-border-static" style="box-shadow: 0 0 5px var(--neon-cyan)">Del</kbd>
                    <span class="text-secondary">Remove</span>
                  </div>
                </Show>
                <div class="flex items-center gap-1.5">
                  <Kbd shortcut="cmd+n" />
                  <span class="text-secondary">Browse</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Show when={isLoading()}>
          <div class="folder-loading-overlay" style="backdrop-filter: blur(8px)">
            <div class="folder-loading-indicator glass-effect-strong neon-border" style="padding: 2rem 3rem; border-radius: var(--radius-xl)">
              <div class="spinner spin-glow" style="width: 48px; height: 48px; margin-bottom: 1rem" />
              <p class="folder-loading-text gradient-text text-lg font-semibold">Initializing AgroForge…</p>
              <p class="folder-loading-subtext text-secondary">Preparing your intelligent workspace</p>
              <div class="loading-bar mt-4 w-32 mx-auto rounded-full" />
            </div>
          </div>
        </Show>
      </div>

      <AdvancedSettingsModal
        open={Boolean(props.advancedSettingsOpen)}
        onClose={() => props.onAdvancedSettingsClose?.()}
        selectedBinary={selectedBinary()}
        onBinaryChange={handleBinaryChange}
        isLoading={props.isLoading}
      />

      <DirectoryBrowserDialog
        open={isFolderBrowserOpen()}
        title="Select Workspace"
        description="Select workspace to start coding."
        onClose={() => setIsFolderBrowserOpen(false)}
        onSelect={handleBrowserSelect}
      />
    </>
  )
}

export default FolderSelectionView
