import { Component, For, Show, createSignal, createEffect, onCleanup } from "solid-js"
import type { Instance } from "../types/instance"
import InstanceTab from "./instance-tab"
import KeyboardHint from "./keyboard-hint"
import { Plus, MonitorUp, FolderOpen, X } from "lucide-solid"
import { keyboardRegistry } from "../lib/keyboard-registry"
import { reorderInstances } from "../stores/instances"
import { getInstanceSessionIndicatorStatus } from "../stores/session-status"

interface InstanceTabsProps {
  instances: Map<string, Instance>
  activeInstanceId: string | null
  onSelect: (instanceId: string) => void
  onClose: (instanceId: string) => void
  onNew: () => void
  onOpenRemoteAccess?: () => void
}

// Detect if we're on a mobile device
const isMobile = () => window.matchMedia("(max-width: 480px)").matches
const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches

const InstanceTabs: Component<InstanceTabsProps> = (props) => {
  const [draggedIndex, setDraggedIndex] = createSignal<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = createSignal<number | null>(null)
  const [showQuickSwitcher, setShowQuickSwitcher] = createSignal(false)
  let tabScrollRef: HTMLDivElement | undefined
  let touchStartY = 0
  let touchStartTime = 0

  // Auto-scroll to active tab on mobile
  createEffect(() => {
    if (!isMobile() || !tabScrollRef) return
    const activeId = props.activeInstanceId
    if (!activeId) return
    
    // Find the active tab element and scroll it into view
    requestAnimationFrame(() => {
      const activeTab = tabScrollRef?.querySelector('[aria-selected="true"]')
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
      }
    })
  })

  // Handle touch gestures for quick switcher (swipe up from tabs)
  const handleTouchStart = (e: TouchEvent) => {
    if (!isTouchDevice()) return
    touchStartY = e.touches[0].clientY
    touchStartTime = Date.now()
  }

  const handleTouchEnd = (e: TouchEvent) => {
    if (!isTouchDevice()) return
    const touchEndY = e.changedTouches[0].clientY
    const touchDuration = Date.now() - touchStartTime
    const deltaY = touchStartY - touchEndY
    
    // Quick swipe up gesture (>50px in <300ms) to open quick switcher
    if (deltaY > 50 && touchDuration < 300 && props.instances.size > 2) {
      setShowQuickSwitcher(true)
    }
  }

  // Close quick switcher on backdrop click
  const closeQuickSwitcher = () => setShowQuickSwitcher(false)

  // Handle escape key for quick switcher
  createEffect(() => {
    if (!showQuickSwitcher()) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowQuickSwitcher(false)
      }
    }
    
    document.addEventListener("keydown", handleKeyDown)
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown))
  })

  const handleDragStart = (e: DragEvent, index: number) => {
    if (!e.dataTransfer) return
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", index.toString())
    
    // Add drag styling after a small delay to not interfere with drag image
    requestAnimationFrame(() => {
      const target = e.target as HTMLElement
      target.closest(".instance-tab-wrapper")?.classList.add("instance-tab--dragging")
    })
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDropTargetIndex(null)
    // Remove all drag classes
    document.querySelectorAll(".instance-tab--dragging, .instance-tab--drop-before, .instance-tab--drop-after")
      .forEach(el => el.classList.remove("instance-tab--dragging", "instance-tab--drop-before", "instance-tab--drop-after"))
  }

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move"
    }

    const dragged = draggedIndex()
    if (dragged === null || dragged === index) {
      setDropTargetIndex(null)
      return
    }

    setDropTargetIndex(index)

    // Update visual indicators
    document.querySelectorAll(".instance-tab--drop-before, .instance-tab--drop-after")
      .forEach(el => el.classList.remove("instance-tab--drop-before", "instance-tab--drop-after"))

    const target = (e.currentTarget as HTMLElement)
    const rect = target.getBoundingClientRect()
    const midpoint = rect.left + rect.width / 2

    if (e.clientX < midpoint) {
      target.classList.add("instance-tab--drop-before")
      target.classList.remove("instance-tab--drop-after")
    } else {
      target.classList.add("instance-tab--drop-after")
      target.classList.remove("instance-tab--drop-before")
    }
  }

  const handleDragLeave = (e: DragEvent) => {
    const target = e.currentTarget as HTMLElement
    target.classList.remove("instance-tab--drop-before", "instance-tab--drop-after")
  }

  const handleDrop = (e: DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragged = draggedIndex()
    if (dragged === null || dragged === dropIndex) {
      handleDragEnd()
      return
    }

    // Determine if dropping before or after based on cursor position
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const midpoint = rect.left + rect.width / 2
    const insertBefore = e.clientX < midpoint

    let targetIndex = dropIndex
    if (!insertBefore && dragged < dropIndex) {
      // No adjustment needed - dropping after and item is moving right
    } else if (insertBefore && dragged > dropIndex) {
      // No adjustment needed - dropping before and item is moving left
    } else if (!insertBefore) {
      targetIndex = dropIndex + 1
      if (dragged < targetIndex) targetIndex--
    }

    // Adjust target index for the removal
    if (dragged < targetIndex) {
      targetIndex--
    }

    reorderInstances(dragged, targetIndex)
    handleDragEnd()
  }

  // Get status for an instance
  const getStatusClass = (instanceId: string) => {
    const status = getInstanceSessionIndicatorStatus(instanceId)
    switch (status) {
      case "working":
        return "instance-quick-switcher-item-status--connecting"
      case "permission":
        return "instance-quick-switcher-item-status--disconnected"
      default:
        return "instance-quick-switcher-item-status--connected"
    }
  }

  return (
    <>
      <div 
        class="tab-bar tab-bar-instance"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div class="tab-container" role="tablist">
          <div class="tab-scroll" ref={tabScrollRef}>
            <div class="tab-strip">
              <div class="tab-strip-tabs">
                <For each={Array.from(props.instances.entries())}>
                  {([id, instance], index) => (
                    <div 
                      class="instance-tab-wrapper"
                      draggable={!isTouchDevice()}
                      onDragStart={(e) => handleDragStart(e, index())}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index())}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index())}
                    >
                      <InstanceTab
                        instance={instance}
                        active={id === props.activeInstanceId}
                        onSelect={() => props.onSelect(id)}
                        onClose={() => props.onClose(id)}
                      />
                    </div>
                  )}
                </For>
                <button
                  class="new-tab-button"
                  onClick={props.onNew}
                  title="New instance (Cmd/Ctrl+N)"
                  aria-label="New instance"
                >
                  <Plus class="w-4 h-4" />
                </button>
              </div>
              <div class="tab-strip-spacer" />
              <Show when={Array.from(props.instances.entries()).length > 1}>
                <div class="tab-shortcuts">
                  <KeyboardHint
                    shortcuts={[keyboardRegistry.get("instance-prev")!, keyboardRegistry.get("instance-next")!].filter(
                      Boolean,
                    )}
                  />
                </div>
              </Show>
              <Show when={Boolean(props.onOpenRemoteAccess)}>
                <button
                  class="new-tab-button tab-remote-button"
                  onClick={() => props.onOpenRemoteAccess?.()}
                  title="Remote connect"
                  aria-label="Remote connect"
                >
                  <MonitorUp class="w-4 h-4" />
                </button>
              </Show>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Quick Switcher Overlay */}
      <Show when={showQuickSwitcher()}>
        <div 
          class="instance-quick-switcher-backdrop"
          onClick={closeQuickSwitcher}
          style={{
            position: "fixed",
            inset: "0",
            background: "var(--overlay-scrim)",
            "z-index": "999"
          }}
        />
        <div class={`instance-quick-switcher instance-quick-switcher--visible`}>
          <div class="instance-quick-switcher-handle" onClick={closeQuickSwitcher} />
          <div class="instance-quick-switcher-header">
            <span class="instance-quick-switcher-title">Switch Instance</span>
            <span class="instance-quick-switcher-count">{props.instances.size} instances</span>
          </div>
          <div class="instance-quick-switcher-list">
            <For each={Array.from(props.instances.entries())}>
              {([id, instance]) => (
                <button
                  class={`instance-quick-switcher-item ${id === props.activeInstanceId ? "instance-quick-switcher-item--active" : ""}`}
                  onClick={() => {
                    props.onSelect(id)
                    setShowQuickSwitcher(false)
                  }}
                >
                  <FolderOpen class="instance-quick-switcher-item-icon" />
                  <div class="instance-quick-switcher-item-content">
                    <div class="instance-quick-switcher-item-name">
                      {instance.folder.split("/").pop() || instance.folder}
                    </div>
                    <div class="instance-quick-switcher-item-path">{instance.folder}</div>
                  </div>
                  <span class={`instance-quick-switcher-item-status ${getStatusClass(id)}`} />
                  <Show when={id === props.activeInstanceId}>
                    <button
                      class="tab-close"
                      onClick={(e) => {
                        e.stopPropagation()
                        props.onClose(id)
                        if (props.instances.size <= 1) {
                          setShowQuickSwitcher(false)
                        }
                      }}
                      aria-label="Close instance"
                    >
                      <X class="w-3.5 h-3.5" />
                    </button>
                  </Show>
                </button>
              )}
            </For>
            <button
              class="instance-quick-switcher-new"
              onClick={() => {
                props.onNew()
                setShowQuickSwitcher(false)
              }}
            >
              <Plus class="w-5 h-5" />
              <span>New Instance</span>
            </button>
          </div>
        </div>
      </Show>
    </>
  )
}

export default InstanceTabs
