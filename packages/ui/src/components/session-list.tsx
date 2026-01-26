import { Component, For, Show, createSignal, createMemo, createEffect, JSX, onCleanup } from "solid-js"
import type { SessionStatus } from "../types/session"
import type { SessionThread } from "../stores/session-state"
import { getSessionStatus } from "../stores/session-status"
import { Bot, User, Copy, Trash2, Pencil, ShieldAlert, ChevronDown, ChevronRight, Search, X, GitBranch, MessageSquare, Zap, Clock, Filter, Plus } from "lucide-solid"
import KeyboardHint from "./keyboard-hint"
import SessionRenameDialog from "./session-rename-dialog"
import { keyboardRegistry } from "../lib/keyboard-registry"
import { showToastNotification } from "../lib/notifications"
import {
  deleteSession,
  ensureSessionParentExpanded,
  getVisibleSessionIds,
  isSessionParentExpanded,
  loading,
  renameSession,
  sessions as sessionStateSessions,
  setActiveSessionFromList,
  toggleSessionParentExpanded,
} from "../stores/sessions"
import { getLogger } from "../lib/logger"
import { copyToClipboard } from "../lib/clipboard"
const log = getLogger("session")



interface SessionListProps {
  instanceId: string
  threads: SessionThread[]
  activeSessionId: string | null
  onSelect: (sessionId: string) => void
  onNew: () => void
  showHeader?: boolean
  showFooter?: boolean
  headerContent?: JSX.Element
  footerContent?: JSX.Element
}

function formatSessionStatus(status: SessionStatus): string {
  switch (status) {
    case "working":
      return "Working"
    case "compacting":
      return "Compacting"
    default:
      return "Idle"
  }
}

const SessionList: Component<SessionListProps> = (props) => {
  const [renameTarget, setRenameTarget] = createSignal<{ id: string; title: string; label: string } | null>(null)
  const [isRenaming, setIsRenaming] = createSignal(false)
  const [searchQuery, setSearchQuery] = createSignal("")
  const [showSearch, setShowSearch] = createSignal(false)
  const [filterStatus, setFilterStatus] = createSignal<"all" | "working" | "permission">("all")

  const isSessionDeleting = (sessionId: string) => {
    const deleting = loading().deletingSession.get(props.instanceId)
    return deleting ? deleting.has(sessionId) : false
  }

  // Filter threads based on search and status
  const filteredThreads = createMemo(() => {
    const query = searchQuery().toLowerCase().trim()
    const status = filterStatus()
    
    return props.threads.filter(thread => {
      // Check if parent or any child matches search
      const parentTitle = thread.parent.title?.toLowerCase() || ""
      const parentMatches = parentTitle.includes(query)
      const childMatches = thread.children.some(child => 
        (child.title?.toLowerCase() || "").includes(query)
      )
      const searchMatches = !query || parentMatches || childMatches
      
      if (!searchMatches) return false
      
      // Check status filter
      if (status === "all") return true
      
      const parentStatus = getSessionStatus(props.instanceId, thread.parent.id)
      const parentPending = thread.parent.pendingPermission || (thread.parent as any).pendingQuestion
      
      if (status === "working") {
        const parentWorking = parentStatus === "working" || parentStatus === "compacting"
        const childWorking = thread.children.some(child => {
          const childStatus = getSessionStatus(props.instanceId, child.id)
          return childStatus === "working" || childStatus === "compacting"
        })
        return parentWorking || childWorking
      }
      
      if (status === "permission") {
        const childPending = thread.children.some(child => 
          child.pendingPermission || (child as any).pendingQuestion
        )
        return parentPending || childPending
      }
      
      return true
    })
  })

  // Count active/pending sessions
  const sessionCounts = createMemo(() => {
    let working = 0
    let permission = 0
    let total = 0
    
    for (const thread of props.threads) {
      total++
      total += thread.children.length
      
      const parentStatus = getSessionStatus(props.instanceId, thread.parent.id)
      if (parentStatus === "working" || parentStatus === "compacting") working++
      if (thread.parent.pendingPermission || (thread.parent as any).pendingQuestion) permission++
      
      for (const child of thread.children) {
        const childStatus = getSessionStatus(props.instanceId, child.id)
        if (childStatus === "working" || childStatus === "compacting") working++
        if (child.pendingPermission || (child as any).pendingQuestion) permission++
      }
    }
    
    return { working, permission, total }
  })
 

  const selectSession = (sessionId: string) => {
    const session = sessionStateSessions().get(props.instanceId)?.get(sessionId)
    const parentId = session?.parentId ?? session?.id
    if (parentId) {
      ensureSessionParentExpanded(props.instanceId, parentId)
    }

    props.onSelect(sessionId)
  }
 
  const copySessionId = async (event: MouseEvent, sessionId: string) => {
    event.stopPropagation()

    try {
      const success = await copyToClipboard(sessionId)
      if (success) {
        showToastNotification({ message: "Session ID copied", variant: "success" })
      } else {
        showToastNotification({ message: "Unable to copy session ID", variant: "error" })
      }
    } catch (error) {
      log.error(`Failed to copy session ID ${sessionId}:`, error)
      showToastNotification({ message: "Unable to copy session ID", variant: "error" })
    }
  }
 
  const handleDeleteSession = async (event: MouseEvent, sessionId: string) => {
    event.stopPropagation()
    if (isSessionDeleting(sessionId)) return

    const shouldSelectFallback = props.activeSessionId === sessionId
    let fallbackSessionId: string | undefined

    if (shouldSelectFallback) {
      const visible = getVisibleSessionIds(props.instanceId)
      const currentIndex = visible.indexOf(sessionId)
      const remaining = visible.filter((id) => id !== sessionId)

      if (remaining.length > 0) {
        if (currentIndex !== -1) {
          for (let i = currentIndex; i < visible.length; i++) {
            const candidate = visible[i]
            if (candidate && candidate !== sessionId) {
              fallbackSessionId = candidate
              break
            }
          }

          if (!fallbackSessionId) {
            for (let i = currentIndex - 1; i >= 0; i--) {
              const candidate = visible[i]
              if (candidate && candidate !== sessionId) {
                fallbackSessionId = candidate
                break
              }
            }
          }
        }

        fallbackSessionId ??= remaining[0]
      }
    }

    try {
      await deleteSession(props.instanceId, sessionId)
      if (fallbackSessionId) {
        setActiveSessionFromList(props.instanceId, fallbackSessionId)
      }
    } catch (error) {
      log.error(`Failed to delete session ${sessionId}:`, error)
      showToastNotification({ message: "Unable to delete session", variant: "error" })
    }
  }

  const openRenameDialog = (sessionId: string) => {
    const session = sessionStateSessions().get(props.instanceId)?.get(sessionId)
    if (!session) return
    const label = session.title && session.title.trim() ? session.title : sessionId
    setRenameTarget({ id: sessionId, title: session.title ?? "", label })
  }

  const closeRenameDialog = () => {
    setRenameTarget(null)
  }

  const handleRenameSubmit = async (nextTitle: string) => {
    const target = renameTarget()
    if (!target) return
 
    setIsRenaming(true)
    try {
      await renameSession(props.instanceId, target.id, nextTitle)
      setRenameTarget(null)
    } catch (error) {
      log.error(`Failed to rename session ${target.id}:`, error)
      showToastNotification({ message: "Unable to rename session", variant: "error" })
    } finally {
      setIsRenaming(false)
    }
  }
 

  // Determine if this is a subagent session by checking the title pattern
  const isSubagentSession = (title: string | undefined) => {
    if (!title) return false
    return title.includes("(subagent)") || title.includes("subagent:") || title.toLowerCase().includes("task:")
  }

  const SessionRow: Component<{
    sessionId: string
    isChild?: boolean
    isLastChild?: boolean
    isFirstChild?: boolean
    hasChildren?: boolean
    childCount?: number
    expanded?: boolean
    onToggleExpand?: () => void
  }> = (rowProps) => {
    const session = createMemo(() => sessionStateSessions().get(props.instanceId)?.get(rowProps.sessionId))
    if (!session()) {
      return <></>
    }
    const isActive = () => props.activeSessionId === rowProps.sessionId
    const title = () => session()?.title || "Untitled"
    const status = () => getSessionStatus(props.instanceId, rowProps.sessionId)
    const statusLabel = () => formatSessionStatus(status())
    const needsPermission = () => Boolean(session()?.pendingPermission)
    const needsQuestion = () => Boolean((session() as any)?.pendingQuestion)
    const needsInput = () => needsPermission() || needsQuestion()
    const statusClassName = () => (needsInput() ? "session-permission" : `session-${status()}`)
    const statusText = () => (needsPermission() ? "Permission" : needsQuestion() ? "Input" : statusLabel())
    const isSubagent = () => isSubagentSession(session()?.title)
    
    // Format time ago
    const timeAgo = createMemo(() => {
      const updated = session()?.time?.updated
      if (!updated) return ""
      const now = Date.now()
      const diff = now - updated
      const minutes = Math.floor(diff / 60000)
      if (minutes < 1) return "now"
      if (minutes < 60) return `${minutes}m`
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return `${hours}h`
      const days = Math.floor(hours / 24)
      return `${days}d`
    })
 
    return (
      <div class={`session-list-item-v2 ${rowProps.isChild ? "session-list-item-v2--child" : ""} ${isActive() ? "session-list-item-v2--active" : ""}`}>
        <div
          class={`session-card ${rowProps.isChild ? "session-card--child" : "session-card--parent"} ${isActive() ? "session-card--active" : ""} ${needsInput() ? "session-card--attention" : ""} ${status() === "working" || status() === "compacting" ? "session-card--working" : ""}`}
          data-session-id={rowProps.sessionId}
          onClick={() => selectSession(rowProps.sessionId)}
          title={title()}
          role="button"
          tabIndex={0}
          aria-selected={isActive()}
          aria-expanded={rowProps.hasChildren ? Boolean(rowProps.expanded) : undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              selectSession(rowProps.sessionId)
            }
          }}
        >
          {/* Left accent bar */}
          <div class={`session-card-accent ${rowProps.isChild ? "session-card-accent--child" : "session-card-accent--parent"} ${needsInput() ? "session-card-accent--attention" : ""} ${status() === "working" ? "session-card-accent--working" : ""}`} />
          
          {/* Tree connector for children */}
          <Show when={rowProps.isChild}>
            <div class="session-tree-connector">
              <div class={`session-tree-line ${rowProps.isLastChild ? "session-tree-line--last" : ""}`} />
              <div class="session-tree-branch" />
            </div>
          </Show>
          
          {/* Main content */}
          <div class="session-card-content">
            {/* Header row with icon, title, and expand */}
            <div class="session-card-header">
              <div class="session-card-icon-wrap">
                {rowProps.isChild ? (
                  isSubagent() ? (
                    <div class="session-icon session-icon--subagent">
                      <Bot class="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div class="session-icon session-icon--fork">
                      <GitBranch class="w-3.5 h-3.5" />
                    </div>
                  )
                ) : (
                  <div class="session-icon session-icon--parent">
                    <MessageSquare class="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              
              <div class="session-card-title-area">
                <span class="session-card-title">{title()}</span>
                <Show when={rowProps.isChild && isSubagent()}>
                  <span class="session-badge session-badge--subagent">subagent</span>
                </Show>
              </div>
              
              {/* Expand/collapse button for parents with children */}
              <Show when={rowProps.hasChildren && !rowProps.isChild}>
                <button
                  class={`session-expand-btn ${rowProps.expanded ? "session-expand-btn--expanded" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    rowProps.onToggleExpand?.()
                  }}
                  aria-label={rowProps.expanded ? "Collapse subagents" : "Expand subagents"}
                  title={rowProps.expanded ? `Hide ${rowProps.childCount} subagent${rowProps.childCount === 1 ? "" : "s"}` : `Show ${rowProps.childCount} subagent${rowProps.childCount === 1 ? "" : "s"}`}
                >
                  <span class="session-expand-count">{rowProps.childCount}</span>
                  <ChevronRight class={`session-expand-icon ${rowProps.expanded ? "session-expand-icon--open" : ""}`} />
                </button>
              </Show>
            </div>
            
            {/* Footer row with status and actions */}
            <div class="session-card-footer">
              <div class="session-card-meta">
                {/* Status pill */}
                <span class={`session-status-pill session-status-pill--${statusClassName()}`}>
                  <Show when={needsInput()}>
                    <Zap class="w-3 h-3" />
                  </Show>
                  <Show when={status() === "working" && !needsInput()}>
                    <span class="session-status-pulse" />
                  </Show>
                  <Show when={status() === "compacting" && !needsInput()}>
                    <span class="session-status-pulse session-status-pulse--slow" />
                  </Show>
                  <Show when={status() === "idle" && !needsInput()}>
                    <span class="session-status-dot" />
                  </Show>
                  {statusText()}
                </span>
                
                {/* Time ago */}
                <Show when={timeAgo()}>
                  <span class="session-time">
                    <Clock class="w-3 h-3" />
                    {timeAgo()}
                  </span>
                </Show>
              </div>
              
              {/* Action buttons - shown on hover */}
              <div class="session-card-actions">
                <button
                  class="session-action-btn"
                  onClick={(event) => copySessionId(event, rowProps.sessionId)}
                  aria-label="Copy session ID"
                  title="Copy ID"
                >
                  <Copy class="w-3.5 h-3.5" />
                </button>
                <button
                  class="session-action-btn"
                  onClick={(event) => {
                    event.stopPropagation()
                    openRenameDialog(rowProps.sessionId)
                  }}
                  aria-label="Rename session"
                  title="Rename"
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>
                <button
                  class="session-action-btn session-action-btn--danger"
                  onClick={(event) => handleDeleteSession(event, rowProps.sessionId)}
                  aria-label="Delete session"
                  title="Delete"
                >
                  <Show
                    when={!isSessionDeleting(rowProps.sessionId)}
                    fallback={
                      <svg class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    }
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </Show>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
 
  const activeParentId = createMemo(() => {
    const activeId = props.activeSessionId
    if (!activeId || activeId === "info") return null

    const activeSession = sessionStateSessions().get(props.instanceId)?.get(activeId)
    if (!activeSession) return null

    return activeSession.parentId ?? activeSession.id
  })

  createEffect(() => {
    const parentId = activeParentId()
    if (!parentId) return
    ensureSessionParentExpanded(props.instanceId, parentId)
  })
 
  const listEl = createSignal<HTMLElement | null>(null)

  const escapeCss = (value: string) => {
    if (typeof CSS !== "undefined" && typeof (CSS as any).escape === "function") {
      return (CSS as any).escape(value)
    }
    return value.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"")
  }

  const scrollActiveIntoView = (sessionId: string) => {
    const root = listEl[0]()
    if (!root) return

    const selector = `[data-session-id="${escapeCss(sessionId)}"]`

    const scrollNow = () => {
      const target = root.querySelector(selector) as HTMLElement | null
      if (!target) return
      target.scrollIntoView({ block: "nearest", inline: "nearest" })
    }

    if (typeof requestAnimationFrame === "undefined") {
      scrollNow()
      return
    }

    // Wait a couple frames so expand/collapse DOM settles.
    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        scrollNow()
      })
    })

    onCleanup(() => {
      if (raf1) cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    })
  }

  createEffect(() => {
    const activeId = props.activeSessionId
    if (!activeId || activeId === "info") return
    scrollActiveIntoView(activeId)
  })

  return (
    <div
      class="session-list-container session-list-v2 bg-surface-secondary border-r border-base flex flex-col w-full"
    >
      <Show when={props.showHeader !== false}>
        <div class="session-list-header-v2">
          {props.headerContent ?? (
            <>
              {/* Main header row */}
              <div class="session-list-header-main">
                <div class="session-list-header-left">
                  <h3 class="session-list-title">Sessions</h3>
                  <Show when={sessionCounts().total > 0}>
                    <span class="session-count-badge">{sessionCounts().total}</span>
                  </Show>
                </div>
                
                <div class="session-list-header-right">
                  {/* Status indicators */}
                  <div class="session-status-indicators">
                    <Show when={sessionCounts().working > 0}>
                      <span class="session-indicator session-indicator--working" title={`${sessionCounts().working} working`}>
                        <span class="session-indicator-pulse" />
                        {sessionCounts().working}
                      </span>
                    </Show>
                    <Show when={sessionCounts().permission > 0}>
                      <span class="session-indicator session-indicator--attention" title={`${sessionCounts().permission} need input`}>
                        <Zap class="w-3 h-3" />
                        {sessionCounts().permission}
                      </span>
                    </Show>
                  </div>
                  
                  {/* New session button */}
                  <button
                    class="session-new-session-btn"
                    onClick={() => props.onNew()}
                    aria-label="New session"
                    title="New session (⌘⇧O / Ctrl+Shift+O)"
                  >
                    <Plus class="w-4 h-4" />
                  </button>
                  
                  {/* Search toggle */}
                  <button
                    class={`session-search-toggle ${showSearch() ? "session-search-toggle--active" : ""}`}
                    onClick={() => {
                      setShowSearch(!showSearch())
                      if (!showSearch()) {
                        setSearchQuery("")
                        setFilterStatus("all")
                      }
                    }}
                    aria-label={showSearch() ? "Close search" : "Search sessions"}
                    title={showSearch() ? "Close search" : "Search sessions"}
                  >
                    <Show when={showSearch()} fallback={<Search class="w-4 h-4" />}>
                      <X class="w-4 h-4" />
                    </Show>
                  </button>
                  
                  <KeyboardHint
                    shortcuts={[keyboardRegistry.get("session-new")!, keyboardRegistry.get("session-prev")!, keyboardRegistry.get("session-next")!].filter(Boolean)}
                  />
                </div>
              </div>
              
              {/* Collapsible search/filter bar */}
              <div class={`session-search-bar ${showSearch() ? "session-search-bar--open" : ""}`}>
                <div class="session-search-bar-inner">
                  {/* Search input */}
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
                  
                  {/* Filter buttons */}
                  <div class="session-filter-buttons">
                    <button
                      class={`session-filter-btn ${filterStatus() === "all" ? "session-filter-btn--active" : ""}`}
                      onClick={() => setFilterStatus("all")}
                      aria-pressed={filterStatus() === "all"}
                    >
                      All
                    </button>
                    <button
                      class={`session-filter-btn ${filterStatus() === "working" ? "session-filter-btn--active" : ""}`}
                      onClick={() => setFilterStatus("working")}
                      aria-pressed={filterStatus() === "working"}
                    >
                      <span class="session-filter-pulse" />
                      Working
                      <Show when={sessionCounts().working > 0}>
                        <span class="session-filter-count">{sessionCounts().working}</span>
                      </Show>
                    </button>
                    <button
                      class={`session-filter-btn ${filterStatus() === "permission" ? "session-filter-btn--active" : ""}`}
                      onClick={() => setFilterStatus("permission")}
                      aria-pressed={filterStatus() === "permission"}
                    >
                      <Zap class="w-3 h-3" />
                      Needs Input
                      <Show when={sessionCounts().permission > 0}>
                        <span class="session-filter-count session-filter-count--attention">{sessionCounts().permission}</span>
                      </Show>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Show>

      <div class="session-list session-list-v2-content flex-1 overflow-y-auto" ref={(el) => listEl[1](el)}>
        {/* Empty state when no sessions */}
        <Show when={props.threads.length === 0}>
          <div class="session-empty-state">
            <div class="session-empty-icon">
              <MessageSquare class="w-8 h-8" />
            </div>
            <p class="session-empty-title">No sessions yet</p>
            <p class="session-empty-subtitle">Start a new conversation to begin</p>
          </div>
        </Show>

        {/* Empty state when no matches */}
        <Show when={props.threads.length > 0 && filteredThreads().length === 0}>
          <div class="session-empty-state session-empty-state--filtered">
            <div class="session-empty-icon session-empty-icon--search">
              <Search class="w-6 h-6" />
            </div>
            <p class="session-empty-title">No matching sessions</p>
            <p class="session-empty-subtitle">
              <Show when={searchQuery()} fallback="No sessions match the current filter">
                No sessions match "{searchQuery()}"
              </Show>
            </p>
            <button
              class="session-empty-action"
              onClick={() => {
                setSearchQuery("")
                setFilterStatus("all")
              }}
            >
              Clear filters
            </button>
          </div>
        </Show>

        {/* Session threads */}
        <Show when={filteredThreads().length > 0}>
          <div class="session-section session-section-v2">
            <For each={filteredThreads()}>
              {(thread) => {
                const expanded = () => isSessionParentExpanded(props.instanceId, thread.parent.id)
                return (
                  <div class="session-thread-group">
                    <SessionRow
                      sessionId={thread.parent.id}
                      hasChildren={thread.children.length > 0}
                      childCount={thread.children.length}
                      expanded={expanded()}
                      onToggleExpand={() => toggleSessionParentExpanded(props.instanceId, thread.parent.id)}
                    />

                    {/* Animated children container */}
                    <div 
                      class={`session-children-container ${expanded() && thread.children.length > 0 ? "session-children-container--expanded" : ""}`}
                      style={{
                        "--child-count": thread.children.length.toString()
                      }}
                    >
                      <Show when={expanded() && thread.children.length > 0}>
                        <div class="session-children-inner">
                          <For each={thread.children}>
                            {(child, index) => (
                              <SessionRow 
                                sessionId={child.id} 
                                isChild 
                                isFirstChild={index() === 0}
                                isLastChild={index() === thread.children.length - 1} 
                              />
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>
                  </div>
                )
              }}
            </For>
          </div>
        </Show>
      </div>

      <Show when={props.showFooter !== false}>
        <div class="session-list-footer session-list-footer-v2 p-3 border-t border-base">
          {props.footerContent ?? null}
        </div>
      </Show>

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

export default SessionList

