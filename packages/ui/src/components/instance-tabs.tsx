import { Component, For, Show, createSignal } from "solid-js"
import type { Instance } from "../types/instance"
import InstanceTab from "./instance-tab"
import KeyboardHint from "./keyboard-hint"
import { Plus, MonitorUp } from "lucide-solid"
import { keyboardRegistry } from "../lib/keyboard-registry"
import { reorderInstances } from "../stores/instances"

interface InstanceTabsProps {
  instances: Map<string, Instance>
  activeInstanceId: string | null
  onSelect: (instanceId: string) => void
  onClose: (instanceId: string) => void
  onNew: () => void
  onOpenRemoteAccess?: () => void
}

const InstanceTabs: Component<InstanceTabsProps> = (props) => {
  const [draggedIndex, setDraggedIndex] = createSignal<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = createSignal<number | null>(null)

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

  return (
    <div class="tab-bar tab-bar-instance">
      <div class="tab-container" role="tablist">
        <div class="tab-scroll">
          <div class="tab-strip">
            <div class="tab-strip-tabs">
              <For each={Array.from(props.instances.entries())}>
                {([id, instance], index) => (
                  <div 
                    class="instance-tab-wrapper"
                    draggable="true"
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

  )
}

export default InstanceTabs
