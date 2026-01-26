import { Component, createSignal, Show, For, createEffect, onMount, onCleanup, createMemo } from "solid-js"
import { Loader2, Pencil, Trash2, MessageSquare, Search, X, Clock, Zap, Plus } from "lucide-solid"

import type { Instance } from "../types/instance"
import type { Session } from "../types/session"
import { getParentSessions, createSession, setActiveParentSession, deleteSession, loading, renameSession } from "../stores/sessions"
import { getSessionStatus } from "../stores/session-status"
import InstanceInfo from "./instance-info"
import Kbd from "./kbd"
import SessionRenameDialog from "./session-rename-dialog"
import { keyboardRegistry, type KeyboardShortcut } from "../lib/keyboard-registry"
import { isMac } from "../lib/keyboard-utils"
import { showToastNotification } from "../lib/notifications"
import { cleanSessionTitle } from "../lib/session-title"
import { getLogger } from "../lib/logger"
const log = getLogger("actions")



interface InstanceWelcomeViewProps {
  instance: Instance
}

const InstanceWelcomeView: Component<InstanceWelcomeViewProps> = (props) => {
  const [isCreating, setIsCreating] = createSignal(false)
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [focusMode, setFocusMode] = createSignal<"sessions" | "new-session" | null>("sessions")
  const [showInstanceInfoOverlay, setShowInstanceInfoOverlay] = createSignal(false)
  const [isDesktopLayout, setIsDesktopLayout] = createSignal(
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false,
  )
  const [renameTarget, setRenameTarget] = createSignal<{ id: string; title: string; label: string } | null>(null)
  const [isRenaming, setIsRenaming] = createSignal(false)
  const [searchQuery, setSearchQuery] = createSignal("")
  const [showSearch, setShowSearch] = createSignal(false)

  const parentSessions = () => getParentSessions(props.instance.id)
  
  // Filter sessions based on search query
  const filteredSessions = createMemo(() => {
    const query = searchQuery().toLowerCase().trim()
    if (!query) return parentSessions()
    
    return parentSessions().filter(session => {
      const title = (session.title || "Untitled").toLowerCase()
      return title.includes(query)
    })
  })

  // Get status info for a session
  function getStatusInfo(session: Session) {
    const status = getSessionStatus(props.instance.id, session.id)
    const needsPermission = Boolean(session.pendingPermission)
    const needsQuestion = Boolean((session as any)?.pendingQuestion)
    const needsInput = needsPermission || needsQuestion
    
    return {
      status,
      needsInput,
      statusClass: needsInput ? "session-permission" : `session-${status}`,
      statusText: needsPermission ? "Permission" : needsQuestion ? "Input" : 
                  status === "working" ? "Working" : 
                  status === "compacting" ? "Compacting" : "Idle"
    }
  }
  const isFetchingSessions = createMemo(() => Boolean(loading().fetchingSessions.get(props.instance.id)))
  const isSessionDeleting = (sessionId: string) => {
    const deleting = loading().deletingSession.get(props.instance.id)
    return deleting ? deleting.has(sessionId) : false
  }
  const newSessionShortcut = createMemo<KeyboardShortcut>(() => {
    const registered = keyboardRegistry.get("session-new")
    if (registered) return registered
    return {
      id: "session-new-display",
      key: "n",
      modifiers: {
        shift: true,
        meta: isMac(),
        ctrl: !isMac(),
      },
      handler: () => {},
      description: "New Session",
      context: "global",
    }
  })
  const newSessionShortcutString = createMemo(() => (isMac() ? "cmd+shift+e" : "ctrl+shift+e"))

  createEffect(() => {
    const sessions = parentSessions()
    if (sessions.length === 0) {
      setFocusMode("new-session")
      setSelectedIndex(0)
    } else {
      setFocusMode("sessions")
      setSelectedIndex(0)
    }
  })

  const openInstanceInfoOverlay = () => {
    if (isDesktopLayout()) return
    setShowInstanceInfoOverlay(true)
  }
  const closeInstanceInfoOverlay = () => setShowInstanceInfoOverlay(false)

  function scrollToIndex(index: number) {
    const element = document.querySelector(`[data-session-index="${index}"]`)
    if (element) {
      element.scrollIntoView({ block: "nearest", behavior: "auto" })
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
      (["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName) ||
        activeElement.isContentEditable ||
        Boolean(insideModal))
 
    if (isEditingField) {
      if (insideModal && e.key === "Escape" && renameTarget()) {
        e.preventDefault()
        closeRenameDialog()
      }
      return
    }
 
    if (showInstanceInfoOverlay()) {
      if (e.key === "Escape") {
        e.preventDefault()
        closeInstanceInfoOverlay()
      }
      return
    }
 
    const sessions = parentSessions()
 
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "e") {
      e.preventDefault()
      handleNewSession()
      return
    }
 
    if (sessions.length === 0) return
 
    const listFocused = focusMode() === "sessions"
 
    if (e.key === "ArrowDown") {
      if (!listFocused) {
        setFocusMode("sessions")
        setSelectedIndex(0)
      }
      e.preventDefault()
      const newIndex = Math.min(selectedIndex() + 1, sessions.length - 1)
      setSelectedIndex(newIndex)
      scrollToIndex(newIndex)
      return
    }
 
    if (e.key === "ArrowUp") {
      if (!listFocused) {
        setFocusMode("sessions")
        setSelectedIndex(Math.max(parentSessions().length - 1, 0))
      }
      e.preventDefault()
      const newIndex = Math.max(selectedIndex() - 1, 0)
      setSelectedIndex(newIndex)
      scrollToIndex(newIndex)
      return
    }
 
    if (!listFocused) {
      return
    }
 
    if (e.key === "PageDown") {
      e.preventDefault()
      const pageSize = 5
      const newIndex = Math.min(selectedIndex() + pageSize, sessions.length - 1)
      setSelectedIndex(newIndex)
      scrollToIndex(newIndex)
    } else if (e.key === "PageUp") {
      e.preventDefault()
      const pageSize = 5
      const newIndex = Math.max(selectedIndex() - pageSize, 0)
      setSelectedIndex(newIndex)
      scrollToIndex(newIndex)
    } else if (e.key === "Home") {
      e.preventDefault()
      setSelectedIndex(0)
      scrollToIndex(0)
    } else if (e.key === "End") {
      e.preventDefault()
      const newIndex = sessions.length - 1
      setSelectedIndex(newIndex)
      scrollToIndex(newIndex)
    } else if (e.key === "Enter") {
      e.preventDefault()
      void handleEnterKey()
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault()
      void handleDeleteKey()
    }
  }


  async function handleEnterKey() {
    const sessions = parentSessions()
    const index = selectedIndex()
 
    if (index < sessions.length) {
      await handleSessionSelect(sessions[index].id)
    }
  }
 
  async function handleDeleteKey() {
    const sessions = parentSessions()
    const index = selectedIndex()
 
    if (index >= sessions.length) {
      return
    }
 
    await handleSessionDelete(sessions[index].id)
 
    const updatedSessions = parentSessions()
    if (updatedSessions.length === 0) {
      setFocusMode("new-session")
      setSelectedIndex(0)
      return
    }
 
    const nextIndex = Math.min(index, updatedSessions.length - 1)
    setSelectedIndex(nextIndex)
    setFocusMode("sessions")
    scrollToIndex(nextIndex)
  }
 
   onMount(() => {
    window.addEventListener("keydown", handleKeyDown)

    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown)
    })
  })

  onMount(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)")
    const handleMediaChange = (matches: boolean) => {
      setIsDesktopLayout(matches)
      if (matches) {
        closeInstanceInfoOverlay()
      }
    }

    const listener = (event: MediaQueryListEvent) => handleMediaChange(event.matches)

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener)
      onCleanup(() => {
        mediaQuery.removeEventListener("change", listener)
      })
    } else {
      mediaQuery.addListener(listener)
      onCleanup(() => {
        mediaQuery.removeListener(listener)
      })
    }

    handleMediaChange(mediaQuery.matches)
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

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString()
  }

  async function handleSessionSelect(sessionId: string) {
    setActiveParentSession(props.instance.id, sessionId)
  }

  async function handleSessionDelete(sessionId: string) {
    if (isSessionDeleting(sessionId)) return

    try {
      await deleteSession(props.instance.id, sessionId)
    } catch (error) {
      log.error("Failed to delete session:", error)
    }
  }

  function openRenameDialogForSession(sessionId: string, title: string) {
    const label = title && title.trim() ? title : sessionId
    setRenameTarget({ id: sessionId, title: title ?? "", label })
  }

  function closeRenameDialog() {
    setRenameTarget(null)
  }

  async function handleRenameSubmit(nextTitle: string) {
    const target = renameTarget()
    if (!target) return

    setIsRenaming(true)
    try {
      await renameSession(props.instance.id, target.id, nextTitle)
      setRenameTarget(null)
    } catch (error) {
      log.error("Failed to rename session:", error)
      showToastNotification({ message: "Unable to rename session", variant: "error" })
    } finally {
      setIsRenaming(false)
    }
  }

  async function handleNewSession() {
    if (isCreating()) return

    setIsCreating(true)

    try {
      const session = await createSession(props.instance.id)
      setActiveParentSession(props.instance.id, session.id)
    } catch (error) {
      log.error("Failed to create session:", error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div class="flex-1 flex flex-col overflow-hidden bg-surface-secondary">
      <div class="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-auto min-w-0">
        <div class="flex-1 flex flex-col gap-4 min-h-0 min-w-0">
          <Show
            when={parentSessions().length > 0}
            fallback={
              <Show
                when={isFetchingSessions()}
                fallback={
                  <div class="session-empty-state flex-1 flex flex-col justify-center">
                    <div class="session-empty-icon">
                      <MessageSquare class="w-6 h-6" />
                    </div>
                    <p class="session-empty-title">No Previous Sessions</p>
                    <p class="session-empty-subtitle">Create a new session below to get started</p>
                    <Show when={!isDesktopLayout() && !showInstanceInfoOverlay()}>
                      <button type="button" class="session-empty-action mt-4 lg:hidden" onClick={openInstanceInfoOverlay}>
                        View Instance Info
                      </button>
                    </Show>
                  </div>
                }
              >
                <div class="session-empty-state flex-1 flex flex-col justify-center">
                  <div class="session-empty-icon">
                    <Loader2 class="w-6 h-6 animate-spin" />
                  </div>
                  <p class="session-empty-title">Loading Sessions</p>
                  <p class="session-empty-subtitle">Fetching your previous sessions...</p>
                </div>
              </Show>
            }
          >
            <div class="session-picker-section flex flex-col flex-1 min-h-0">
              {/* Header */}
              <div class="session-list-header-v2">
                <div class="session-list-header-main">
                  <div class="session-list-header-left">
                    <h2 class="session-list-title">Resume Session</h2>
                    <span class="session-count-badge">{parentSessions().length}</span>
                  </div>
                  <div class="session-list-header-right">
                    <Show when={parentSessions().length > 5}>
                      <button
                        type="button"
                        class={`session-search-toggle ${showSearch() ? "session-search-toggle--active" : ""}`}
                        onClick={() => setShowSearch(!showSearch())}
                        aria-label="Toggle search"
                      >
                        <Search class="w-4 h-4" />
                      </button>
                    </Show>
                    <Show when={!isDesktopLayout() && !showInstanceInfoOverlay()}>
                      <button
                        type="button"
                        class="session-search-toggle lg:hidden"
                        onClick={openInstanceInfoOverlay}
                        title="View Instance Info"
                      >
                        <Zap class="w-4 h-4" />
                      </button>
                    </Show>
                  </div>
                </div>
                
                {/* Search bar */}
                <div class={`session-search-bar ${showSearch() ? "session-search-bar--open" : ""}`}>
                  <div class="session-search-bar-inner">
                    <div class="session-search-input-wrap">
                      <Search class="session-search-input-icon" />
                      <input
                        type="text"
                        class="session-search-input"
                        placeholder="Search sessions..."
                        value={searchQuery()}
                        onInput={(e) => setSearchQuery(e.currentTarget.value)}
                        aria-label="Search sessions"
                      />
                      <Show when={searchQuery()}>
                        <button
                          class="session-search-clear"
                          onClick={() => setSearchQuery("")}
                          aria-label="Clear search"
                        >
                          <X class="w-3.5 h-3.5" />
                        </button>
                      </Show>
                    </div>
                  </div>
                </div>
              </div>

              {/* Session list */}
              <Show
                when={filteredSessions().length > 0}
                fallback={
                  <div class="session-empty-state session-empty-state--filtered">
                    <div class="session-empty-icon session-empty-icon--search">
                      <Search class="w-5 h-5" />
                    </div>
                    <p class="session-empty-title">No matching sessions</p>
                    <p class="session-empty-subtitle">No sessions match "{searchQuery()}"</p>
                    <button
                      class="session-empty-action"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear search
                    </button>
                  </div>
                }
              >
                <div class="session-picker-list flex-1 min-h-0 overflow-auto" style="max-height: none;">
                  <For each={filteredSessions()}>
                    {(session, index) => {
                      const isFocused = () => focusMode() === "sessions" && selectedIndex() === index()
                      const info = () => getStatusInfo(session)
                      return (
                        <div
                          role="button"
                          tabIndex={0}
                          data-session-index={index()}
                          class={`session-picker-card ${info().needsInput ? "session-picker-card--attention" : ""} ${info().status === "working" || info().status === "compacting" ? "session-picker-card--working" : ""} ${isFocused() ? "session-card--active" : ""}`}
                          onClick={() => handleSessionSelect(session.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              handleSessionSelect(session.id)
                            }
                          }}
                          onMouseEnter={() => {
                            setFocusMode("sessions")
                            setSelectedIndex(index())
                          }}
                        >
                          {/* Left accent bar */}
                          <div class={`session-card-accent session-card-accent--parent ${info().needsInput ? "session-card-accent--attention" : ""} ${info().status === "working" ? "session-card-accent--working" : ""}`} />
                          
                          {/* Icon */}
                          <div class="session-icon session-icon--parent">
                            <MessageSquare class="w-4 h-4" />
                          </div>
                          
                          {/* Content */}
                          <div class="session-picker-card-content">
                            <span class="session-card-title">
                              {cleanSessionTitle(session.title)}
                            </span>
                            <div class="session-card-meta">
                              {/* Status pill */}
                              <span class={`session-status-pill session-status-pill--${info().statusClass}`}>
                                <Show when={info().needsInput}>
                                  <Zap class="w-3 h-3" />
                                </Show>
                                <Show when={info().status === "working" && !info().needsInput}>
                                  <span class="session-status-pulse" />
                                </Show>
                                <Show when={info().status === "compacting" && !info().needsInput}>
                                  <span class="session-status-pulse session-status-pulse--slow" />
                                </Show>
                                <Show when={info().status === "idle" && !info().needsInput}>
                                  <span class="session-status-dot" />
                                </Show>
                                {info().statusText}
                              </span>
                              
                              {/* Time ago */}
                              <span class="session-time">
                                <Clock class="w-3 h-3" />
                                {formatRelativeTime(session.time.updated)}
                              </span>
                            </div>
                          </div>

                          {/* Actions - visible on focus/hover */}
                          <div class="session-card-actions">
                            <Show when={isFocused()}>
                              <kbd class="kbd flex-shrink-0" style="font-size: 10px; padding: 2px 6px;">↵</kbd>
                            </Show>
                            <button
                              type="button"
                              class="session-action-btn"
                              title="Rename session"
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                openRenameDialogForSession(session.id, session.title || "")
                              }}
                            >
                              <Pencil class="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              class="session-action-btn session-action-btn--danger"
                              title="Delete session"
                              disabled={isSessionDeleting(session.id)}
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                void handleSessionDelete(session.id)
                              }}
                            >
                              <Show
                                when={!isSessionDeleting(session.id)}
                                fallback={<Loader2 class="w-4 h-4 animate-spin" />}
                              >
                                <Trash2 class="w-4 h-4" />
                              </Show>
                            </button>
                          </div>
                        </div>
                      )
                    }}
                  </For>
                </div>
              </Show>
            </div>
          </Show>

          <div class="session-picker-section flex-shrink-0">
            <div class="session-picker-section-header" style="margin-bottom: var(--space-sm);">
              <h3 class="session-picker-section-title">Start New Session</h3>
            </div>
            <p class="session-empty-subtitle" style="margin-bottom: var(--space-md); text-align: left;">
              We'll reuse your last agent/model automatically
            </p>
            <button
              type="button"
              class="session-picker-create-btn"
              onClick={handleNewSession}
              disabled={isCreating()}
            >
              <Show
                when={!isCreating()}
                fallback={
                  <>
                    <Loader2 class="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                }
              >
                <Plus class="w-4 h-4" />
                <span>Create New Session</span>
              </Show>
              <kbd class="session-picker-kbd">{isMac() ? "⌘⇧O" : "Ctrl+Shift+O"}</kbd>
            </button>
          </div>
        </div>

        <div class="hidden lg:block lg:w-80 flex-shrink-0">
          <div class="sticky top-0 max-h-full overflow-y-auto pr-1">
            <InstanceInfo instance={props.instance} />
          </div>
        </div>
      </div>

      <Show when={!isDesktopLayout() && showInstanceInfoOverlay()}>
        <div
          class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeInstanceInfoOverlay}
        >
          <div class="flex min-h-full items-start justify-center p-4 overflow-y-auto">
            <div
              class="w-full max-w-md space-y-3"
              onClick={(event) => event.stopPropagation()}
            >
              <div class="flex justify-end">
                <button type="button" class="button-tertiary" onClick={closeInstanceInfoOverlay}>
                  Close
                </button>
              </div>
              <div class="max-h-[85vh] overflow-y-auto pr-1">
                <InstanceInfo instance={props.instance} />
              </div>
            </div>
          </div>
        </div>
      </Show>

      <div class="panel-footer hidden sm:block">

        <div class="panel-footer-hints">
          <div class="flex items-center gap-1.5">
            <kbd class="kbd">↑</kbd>
            <kbd class="kbd">↓</kbd>
            <span>Navigate</span>
          </div>
          <div class="flex items-center gap-1.5">
            <kbd class="kbd">PgUp</kbd>
            <kbd class="kbd">PgDn</kbd>
            <span>Jump</span>
          </div>
          <div class="flex items-center gap-1.5">
            <kbd class="kbd">Home</kbd>
            <kbd class="kbd">End</kbd>
            <span>First/Last</span>
          </div>
          <div class="flex items-center gap-1.5">
            <kbd class="kbd">Enter</kbd>
            <span>Resume</span>
          </div>
          <div class="flex items-center gap-1.5">
            <kbd class="kbd">Del</kbd>
            <span>Delete</span>
          </div>
        </div>
      </div>

      <SessionRenameDialog
        open={Boolean(renameTarget())}
        currentTitle={renameTarget()?.title ?? ""}
        sessionLabel={renameTarget()?.label}
        isSubmitting={isRenaming()}
        onRename={handleRenameSubmit}
        onClose={closeRenameDialog}
      />
    </div>
  )
}

export default InstanceWelcomeView
