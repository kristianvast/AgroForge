import type { EventBus } from "../events/bus"
import type { WorkspaceManager } from "../workspaces/manager"
import type { Logger } from "../logger"
import type { PluginOutboundEvent } from "./channel"

export interface PluginInboundEvent {
  type: string
  properties?: Record<string, unknown>
}

interface HandlerDeps {
  workspaceManager: WorkspaceManager
  eventBus: EventBus
  logger: Logger
}

export function handlePluginEvent(workspaceId: string, event: PluginInboundEvent, deps: HandlerDeps) {
  switch (event.type) {
    case "codenomad.pong":
      deps.logger.debug({ workspaceId, properties: event.properties }, "Plugin pong received")
      return

    case "opencode.session.idle": {
      const workspace = deps.workspaceManager.get(workspaceId)
      const title = workspace?.name || workspace?.path?.split(/[\\/]/).filter(Boolean).pop() || "CodeNomad"

      const sessionId = readString(event.properties?.sessionID)
      const message = sessionId ? `Session ${sessionId} is idle` : "Session is idle"

      deps.eventBus.publish({
        type: "instance.event",
        instanceId: workspaceId,
        event: {
          type: "tui.toast.show",
          properties: {
            title,
            message,
            variant: "info",
            duration: 8000,
          },
        },
      })
      return
    }

    default:
      deps.logger.debug({ workspaceId, eventType: event.type }, "Unhandled plugin event")
  }
}

export function buildPingEvent(): PluginOutboundEvent {
  return {
    type: "codenomad.ping",
    properties: {
      ts: Date.now(),
    },
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}
