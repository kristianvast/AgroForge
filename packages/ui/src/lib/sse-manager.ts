import { createSignal, batch } from "solid-js"
import {
  MessageUpdateEvent,
  MessageRemovedEvent,
  MessagePartUpdatedEvent,
  MessagePartRemovedEvent,
} from "../types/message"
import type {
  EventLspUpdated,

  EventSessionCompacted,
  EventSessionError,
  EventSessionIdle,
  EventSessionUpdated,
  EventSessionStatus,
} from "@opencode-ai/sdk"
import { serverEvents } from "./server-events"
import type {
  BackgroundProcess,
  InstanceStreamEvent,
  InstanceStreamStatus,
  WorkspaceEventPayload,
} from "../../../server/src/api-types"
import { getLogger } from "./logger"

const log = getLogger("sse")

// Simple fixed-interval batching - most robust approach for streaming
// 50ms = ~20 updates/sec, smooth enough for text streaming
const BATCH_INTERVAL_MS = 50

// Pending part updates to batch
interface PendingPartUpdate {
  instanceId: string
  event: MessagePartUpdatedEvent
}

type InstanceEventPayload = Extract<WorkspaceEventPayload, { type: "instance.event" }>
type InstanceStatusPayload = Extract<WorkspaceEventPayload, { type: "instance.eventStatus" }>

interface TuiToastEvent {
  type: "tui.toast.show"
  properties: {
    title?: string
    message: string
    variant: "info" | "success" | "warning" | "error"
    duration?: number
  }
}

interface BackgroundProcessUpdatedEvent {
  type: "background.process.updated"
  properties: {
    process: BackgroundProcess
  }
}

interface BackgroundProcessRemovedEvent {
  type: "background.process.removed"
  properties: {
    processId: string
  }
}

type SSEEvent =
  | MessageUpdateEvent
  | MessageRemovedEvent
  | MessagePartUpdatedEvent
  | MessagePartRemovedEvent
  | EventSessionUpdated
  | EventSessionCompacted
  | EventSessionError
  | EventSessionIdle
  | { type: "permission.updated" | "permission.asked"; properties?: any }
  | { type: "permission.replied"; properties?: any }
  | { type: "question.asked"; properties?: any }
  | { type: "question.replied" | "question.rejected"; properties?: any }
  | EventLspUpdated
  | TuiToastEvent
  | BackgroundProcessUpdatedEvent
  | BackgroundProcessRemovedEvent
  | { type: string; properties?: Record<string, unknown> }

type ConnectionStatus = InstanceStreamStatus

const [connectionStatus, setConnectionStatus] = createSignal<Map<string, ConnectionStatus>>(new Map())

class SSEManager {
  // Simple coalescing: Map keeps only latest update per unique part
  private coalescedUpdates: Map<string, PendingPartUpdate> = new Map()
  // Fixed-interval timer (more predictable than RAF for batching)
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    serverEvents.on("instance.eventStatus", (event) => {
      const payload = event as InstanceStatusPayload
      this.updateConnectionStatus(payload.instanceId, payload.status)
      if (payload.status === "disconnected") {
        if (payload.reason === "workspace stopped") {
          return
        }
        const reason = payload.reason ?? "Instance disconnected"
        void this.onConnectionLost?.(payload.instanceId, reason)
      }
    })

    serverEvents.on("instance.event", (event) => {
      const payload = event as InstanceEventPayload
      this.updateConnectionStatus(payload.instanceId, "connected")
      this.handleEvent(payload.instanceId, payload.event as SSEEvent)
    })
  }

  seedStatus(instanceId: string, status: ConnectionStatus) {
    this.updateConnectionStatus(instanceId, status)
  }

  private handleEvent(instanceId: string, event: SSEEvent | InstanceStreamEvent): void {
    if (!event || typeof event !== "object" || typeof (event as { type?: unknown }).type !== "string") {
      log.warn("Dropping malformed event", event)
      return
    }

    // Skip verbose logging for high-frequency events
    if (event.type !== "message.part.updated") {
      log.info("Received event", { type: event.type, event })
    }

    switch (event.type) {
      case "message.updated":
        this.onMessageUpdate?.(instanceId, event as MessageUpdateEvent)
        break
      case "message.part.updated":
        // Batch part updates to reduce state churn during streaming
        this.queuePartUpdate(instanceId, event as MessagePartUpdatedEvent)
        break
      case "message.removed":
        this.onMessageRemoved?.(instanceId, event as MessageRemovedEvent)
        break
      case "message.part.removed":
        this.onMessagePartRemoved?.(instanceId, event as MessagePartRemovedEvent)
        break
      case "session.updated":
        this.onSessionUpdate?.(instanceId, event as EventSessionUpdated)
        break
      case "session.compacted":
        this.onSessionCompacted?.(instanceId, event as EventSessionCompacted)
        break
      case "session.error":
        this.onSessionError?.(instanceId, event as EventSessionError)
        break
      case "tui.toast.show":
        this.onTuiToast?.(instanceId, event as TuiToastEvent)
        break
      case "session.idle":
        this.onSessionIdle?.(instanceId, event as EventSessionIdle)
        break
      case "session.status":
        this.onSessionStatus?.(instanceId, event as EventSessionStatus)
        break
      case "permission.updated":
      case "permission.asked":
        this.onPermissionUpdated?.(instanceId, event as any)
        break
      case "permission.replied":
        this.onPermissionReplied?.(instanceId, event as any)
        break
      case "question.asked":
        this.onQuestionAsked?.(instanceId, event as any)
        break
      case "question.replied":
      case "question.rejected":
        this.onQuestionAnswered?.(instanceId, event as any)
        break
      case "lsp.updated":
        this.onLspUpdated?.(instanceId, event as EventLspUpdated)
        break
      case "background.process.updated":
        this.onBackgroundProcessUpdated?.(instanceId, event as BackgroundProcessUpdatedEvent)
        break
      case "background.process.removed":
        this.onBackgroundProcessRemoved?.(instanceId, event as BackgroundProcessRemovedEvent)
        break
      default:
        log.warn("Unknown SSE event type", { type: event.type })
    }
  }

  private queuePartUpdate(instanceId: string, event: MessagePartUpdatedEvent): void {
    // Extract identifiers for coalescing key
    const part = event.properties?.part
    const props = event.properties as { messageID?: string; part?: { id?: string; messageID?: string } } | undefined
    const messageId = props?.messageID ?? props?.part?.messageID ?? 'unknown'
    const partId = part?.id ?? `temp-${Date.now()}`
    const key = `${instanceId}:${messageId}:${partId}`

    // COALESCE: Keep only latest update per part (critical for smooth streaming)
    this.coalescedUpdates.set(key, { instanceId, event })

    // Schedule flush with fixed interval (simpler and more predictable than RAF)
    if (this.flushTimer === null) {
      this.flushTimer = setTimeout(() => this.flushPartUpdates(), BATCH_INTERVAL_MS)
    }
  }

  private flushPartUpdates(): void {
    this.flushTimer = null

    if (this.coalescedUpdates.size === 0) {
      return
    }

    // Collect all coalesced updates
    const updates = Array.from(this.coalescedUpdates.values())
    this.coalescedUpdates.clear()

    // Use batch to group all state updates into a single reactive transaction
    batch(() => {
      for (const { instanceId, event } of updates) {
        this.onMessagePartUpdated?.(instanceId, event)
      }
    })
  }

  private updateConnectionStatus(instanceId: string, status: ConnectionStatus): void {
    setConnectionStatus((prev) => {
      const next = new Map(prev)
      next.set(instanceId, status)
      return next
    })
  }

  onMessageUpdate?: (instanceId: string, event: MessageUpdateEvent) => void
  onMessageRemoved?: (instanceId: string, event: MessageRemovedEvent) => void
  onMessagePartUpdated?: (instanceId: string, event: MessagePartUpdatedEvent) => void
  onMessagePartRemoved?: (instanceId: string, event: MessagePartRemovedEvent) => void
  onSessionUpdate?: (instanceId: string, event: EventSessionUpdated) => void
  onSessionCompacted?: (instanceId: string, event: EventSessionCompacted) => void
  onSessionError?: (instanceId: string, event: EventSessionError) => void
  onTuiToast?: (instanceId: string, event: TuiToastEvent) => void
  onSessionIdle?: (instanceId: string, event: EventSessionIdle) => void
  onSessionStatus?: (instanceId: string, event: EventSessionStatus) => void
  onPermissionUpdated?: (instanceId: string, event: any) => void
  onPermissionReplied?: (instanceId: string, event: any) => void
  onQuestionAsked?: (instanceId: string, event: any) => void
  onQuestionAnswered?: (instanceId: string, event: any) => void
  onLspUpdated?: (instanceId: string, event: EventLspUpdated) => void
  onBackgroundProcessUpdated?: (instanceId: string, event: BackgroundProcessUpdatedEvent) => void
  onBackgroundProcessRemoved?: (instanceId: string, event: BackgroundProcessRemovedEvent) => void
  onConnectionLost?: (instanceId: string, reason: string) => void | Promise<void>

  getStatus(instanceId: string): ConnectionStatus | null {
    return connectionStatus().get(instanceId) ?? null
  }

  getStatuses() {
    return connectionStatus()
  }
}

export const sseManager = new SSEManager()
