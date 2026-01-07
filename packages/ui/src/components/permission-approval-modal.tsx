import { Show, createSignal, createMemo, createEffect, onCleanup, type Component } from "solid-js"
import type { PermissionRequestLike } from "../types/permission"
import { getPermissionSessionId, getPermissionKind, getPermissionDisplayTitle, getPermissionMessageId, getPermissionCallId } from "../types/permission"
import { getPermissionQueue, activePermissionId, sendPermissionResponse, setActivePermissionIdForInstance } from "../stores/instances"
import { setActiveSession } from "../stores/session-state"
import { messageStoreBus } from "../stores/message-v2/bus"
import { ToolCallDiffViewer } from "./diff-viewer"
import { useTheme } from "../lib/theme"
import { getRelativePath, getToolIcon, getToolName } from "./tool-call/utils"
import { getLogger } from "../lib/logger"

const log = getLogger("session")

interface PermissionApprovalModalProps {
  instanceId: string
  isOpen: boolean
  onClose: () => void
}

const PermissionApprovalModal: Component<PermissionApprovalModalProps> = (props) => {
  const { isDark } = useTheme()
  const [submitting, setSubmitting] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const queue = createMemo(() => getPermissionQueue(props.instanceId))
  const activePermId = createMemo(() => activePermissionId().get(props.instanceId) ?? null)

  const activePermission = createMemo((): PermissionRequestLike | null => {
    const id = activePermId()
    if (!id) return null
    return queue().find((p) => p.id === id) ?? null
  })

  const hasActivePermission = createMemo(() => activePermission() !== null)

  // Current position in queue
  const currentIndex = createMemo(() => {
    const perm = activePermission()
    if (!perm) return -1
    return queue().findIndex((p) => p.id === perm.id)
  })

  const hasPrev = createMemo(() => currentIndex() > 0)
  const hasNext = createMemo(() => currentIndex() < queue().length - 1)

  // Extract tool details - try to get actual tool name from message store first
  const toolInfo = createMemo(() => {
    const permission = activePermission()
    if (!permission) return null

    const metadata = ((permission as any).metadata || {}) as Record<string, unknown>
    let toolName = "unknown"

    // BEST METHOD: Try to get the actual tool from the linked message part
    // This is how the inline chat gets it (via toolPart.tool)
    const messageId = getPermissionMessageId(permission)
    const callId = getPermissionCallId(permission)

    if (messageId) {
      const store = messageStoreBus.getInstance(props.instanceId)
      if (store) {
        const record = store.getMessage(messageId)
        if (record) {
          // Search through parts for the tool call matching this permission
          for (const partId of record.partIds) {
            const partRecord = record.parts[partId]
            if (!partRecord?.data || partRecord.data.type !== "tool") continue

            const part = partRecord.data as any
            // Match by callId if available
            const partCallId = part.callID ?? part.callId ?? part.toolCallID ?? part.toolCallId
            if (callId && partCallId === callId && part.tool) {
              toolName = part.tool
              break
            }
            // If no callId match, just use the first tool part's name
            if (!callId && part.tool) {
              toolName = part.tool
              break
            }
          }
        }
      }
    }

    // Fallback: Check metadata fields
    if (toolName === "unknown") {
      const metaToolName = (metadata.toolName as string) || (metadata.tool as string) || (metadata.action as string)
      if (metaToolName) {
        toolName = metaToolName.replace(/^opencode_/, "").toLowerCase()
      }
    }

    // Fallback: Check permission kind for embedded action words
    if (toolName === "unknown") {
      const kind = getPermissionKind(permission).toLowerCase()
      if (kind.includes("read")) toolName = "read"
      else if (kind.includes("write")) toolName = "write"
      else if (kind.includes("edit")) toolName = "edit"
      else if (kind.includes("shell") || kind.includes("bash") || kind.includes("command")) toolName = "bash"
      else if (kind.includes("patch")) toolName = "patch"
    }

    const command = metadata.command as string | undefined
    const filePath = (metadata.filePath as string) || (metadata.path as string) || undefined
    const input = metadata.input as Record<string, unknown> | undefined

    return {
      toolName,
      icon: getToolIcon(toolName),
      displayName: getToolName(toolName),
      command,
      filePath,
      input
    }
  })

  // Check if we can navigate to session
  const sessionId = createMemo(() => getPermissionSessionId(activePermission()))
  const canGoToSession = createMemo(() => !!sessionId())

  createEffect(() => {
    const permission = activePermission()
    if (!permission) {
      setSubmitting(false)
      setError(null)
    }
  })

  // Keyboard shortcuts
  createEffect(() => {
    if (!props.isOpen || !hasActivePermission()) return

    const handler = (event: KeyboardEvent) => {
      if (submitting()) return

      if (event.key === "Enter") {
        event.preventDefault()
        handleResponse("once")
      } else if (event.key === "a" || event.key === "A") {
        event.preventDefault()
        handleResponse("always")
      } else if (event.key === "d" || event.key === "D") {
        event.preventDefault()
        handleResponse("reject")
      } else if (event.key === "Escape") {
        event.preventDefault()
        props.onClose()
      } else if (event.key === "ArrowLeft" && hasPrev()) {
        event.preventDefault()
        navigatePrev()
      } else if (event.key === "ArrowRight" && hasNext()) {
        event.preventDefault()
        navigateNext()
      }
    }

    document.addEventListener("keydown", handler)
    onCleanup(() => document.removeEventListener("keydown", handler))
  })

  function navigatePrev() {
    const idx = currentIndex()
    if (idx > 0) {
      const prevPerm = queue()[idx - 1]
      if (prevPerm) {
        setActivePermissionIdForInstance(props.instanceId, prevPerm.id)
      }
    }
  }

  function navigateNext() {
    const idx = currentIndex()
    if (idx < queue().length - 1) {
      const nextPerm = queue()[idx + 1]
      if (nextPerm) {
        setActivePermissionIdForInstance(props.instanceId, nextPerm.id)
      }
    }
  }

  function handleGoToSession() {
    const sid = sessionId()
    if (sid) {
      setActiveSession(props.instanceId, sid)
      props.onClose()
    }
  }

  async function handleResponse(response: "once" | "always" | "reject") {
    const permission = activePermission()
    if (!permission) return

    setSubmitting(true)
    setError(null)

    try {
      const sid = getPermissionSessionId(permission) || ""
      await sendPermissionResponse(props.instanceId, sid, permission.id, response)

      // Wait a moment for queue to update before closing
      setTimeout(() => {
        const remaining = getPermissionQueue(props.instanceId)
        if (remaining.length === 0) {
          props.onClose()
        }
      }, 100)
    } catch (err) {
      log.error("Failed to send permission response", err)
      setError(err instanceof Error ? err.message : "Failed to send response")
    } finally {
      setSubmitting(false)
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      props.onClose()
    }
  }

  const diffPayload = createMemo(() => {
    const permission = activePermission()
    if (!permission) return null

    const metadata = ((permission as any).metadata || {}) as Record<string, unknown>
    const diffValue = typeof metadata.diff === "string" ? metadata.diff : null
    if (!diffValue || diffValue.trim().length === 0) return null

    const diffPath =
      typeof metadata.filePath === "string" ? metadata.filePath :
        typeof metadata.path === "string" ? metadata.path :
          undefined

    return { diffText: diffValue, filePath: diffPath }
  })

  return (
    <Show when={props.isOpen}>
      <div class="permission-approval-modal-backdrop" onClick={handleBackdropClick}>
        <div class="permission-approval-modal" role="dialog" aria-modal="true" aria-labelledby="permission-modal-title">
          <Show when={hasActivePermission()} fallback={
            <div class="permission-modal-empty">
              <p class="text-center text-gray-500">No pending permissions</p>
            </div>
          }>
            {/* Header */}
            <div class="permission-modal-header">
              <div class="permission-modal-header-left">
                <h2 id="permission-modal-title" class="permission-modal-title">
                  Permission Required
                </h2>
                <Show when={queue().length > 1}>
                  <span class="permission-modal-count">
                    {currentIndex() + 1} of {queue().length}
                  </span>
                </Show>
              </div>
              <div class="permission-modal-header-actions">
                <Show when={canGoToSession()}>
                  <button
                    type="button"
                    class="permission-modal-go-to-session"
                    onClick={handleGoToSession}
                    title="Go to the session where this permission was requested"
                  >
                    Go to Session ↗
                  </button>
                </Show>
                <button
                  type="button"
                  class="permission-modal-close"
                  onClick={props.onClose}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body - scrollable */}
            <div class="permission-modal-body">
              {/* Permission type badge */}
              <div class="permission-modal-type">
                {getPermissionKind(activePermission())}
              </div>

              {/* Tool details section */}
              <Show when={toolInfo()}>
                {(info) => (
                  <div class="permission-modal-tool-details">
                    <div class="permission-modal-tool-header">
                      <span class="permission-modal-tool-icon">🔧</span>
                      <span class="permission-modal-tool-name">Tool Call</span>
                      <code class="permission-modal-tool-badge">{info().toolName}</code>
                      <Show when={info().filePath}>
                        <span class="permission-modal-tool-path">{getRelativePath(info().filePath!)}</span>
                      </Show>
                    </div>
                    <Show when={info().command}>
                      <div class="permission-modal-tool-command">
                        <code>{info().command}</code>
                      </div>
                    </Show>
                  </div>
                )}
              </Show>

              {/* Permission message */}
              <div class="permission-modal-message">
                <code>{getPermissionDisplayTitle(activePermission())}</code>
              </div>

              {/* Diff viewer */}
              <Show when={diffPayload()}>
                {(payload) => (
                  <div class="permission-modal-diff">
                    <div class="permission-modal-diff-label">
                      Requested changes · {payload().filePath ? getRelativePath(payload().filePath!) : ""}
                    </div>
                    <div class="permission-modal-diff-viewer">
                      <ToolCallDiffViewer
                        diffText={payload().diffText}
                        filePath={payload().filePath}
                        theme={isDark() ? "dark" : "light"}
                        mode="split"
                        onRendered={() => { }}
                      />
                    </div>
                  </div>
                )}
              </Show>

              <Show when={error()}>
                <div class="permission-modal-error" role="alert">
                  {error()}
                </div>
              </Show>
            </div>

            {/* Footer - sticky */}
            <div class="permission-modal-footer">
              {/* Queue navigation */}
              <Show when={queue().length > 1}>
                <div class="permission-modal-nav">
                  <button
                    type="button"
                    class="permission-modal-nav-button"
                    disabled={!hasPrev() || submitting()}
                    onClick={navigatePrev}
                    aria-label="Previous permission"
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    class="permission-modal-nav-button"
                    disabled={!hasNext() || submitting()}
                    onClick={navigateNext}
                    aria-label="Next permission"
                  >
                    Next →
                  </button>
                </div>
              </Show>

              {/* Action buttons */}
              <div class="permission-modal-buttons">
                <button
                  type="button"
                  class="permission-modal-button permission-modal-button-once"
                  disabled={submitting()}
                  onClick={() => handleResponse("once")}
                >
                  Allow Once
                </button>
                <button
                  type="button"
                  class="permission-modal-button permission-modal-button-always"
                  disabled={submitting()}
                  onClick={() => handleResponse("always")}
                >
                  Always Allow
                </button>
                <button
                  type="button"
                  class="permission-modal-button permission-modal-button-deny"
                  disabled={submitting()}
                  onClick={() => handleResponse("reject")}
                >
                  Deny
                </button>
              </div>

              {/* Keyboard shortcuts - hide on small screens */}
              <div class="permission-modal-shortcuts">
                <span class="permission-modal-shortcut">
                  <kbd class="kbd">Enter</kbd> Allow once
                </span>
                <span class="permission-modal-shortcut">
                  <kbd class="kbd">A</kbd> Always
                </span>
                <span class="permission-modal-shortcut">
                  <kbd class="kbd">D</kbd> Deny
                </span>
                <span class="permission-modal-shortcut">
                  <kbd class="kbd">←→</kbd> Navigate
                </span>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  )
}

export default PermissionApprovalModal
