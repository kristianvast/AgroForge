import type { Message, MessageDisplayParts } from "../types/message"
import { partHasRenderableText, type MessageInfo } from "../types/message"
import type { Provider } from "../types/session"

import { decodeHtmlEntities } from "../lib/markdown"
import { providers, sessions, sessionInfoByInstance, setSessionInfoByInstance } from "./session-state"
import { DEFAULT_MODEL_OUTPUT_LIMIT } from "./session-models"

interface SessionIndexCache {
  messageIndex: Map<string, number>
  partIndex: Map<string, Map<string, number>>
}

interface AssistantUsageEntry {
  info: MessageInfo
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
  combinedTokens: number
  cost: number
  hasContextUsage: boolean
  timestamp: number
}

interface SessionUsageState {
  entries: Map<string, AssistantUsageEntry>
  totalInputTokens: number
  totalOutputTokens: number
  totalReasoningTokens: number
  totalCost: number
  latestEntry: AssistantUsageEntry | null
}

const sessionIndexes = new Map<string, Map<string, SessionIndexCache>>()
const sessionUsageStates = new Map<string, Map<string, SessionUsageState>>()

function createEmptyUsageState(): SessionUsageState {
  return {
    entries: new Map(),
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalReasoningTokens: 0,
    totalCost: 0,
    latestEntry: null,
  }
}

function getUsageInstance(instanceId: string): Map<string, SessionUsageState> {
  let usageMap = sessionUsageStates.get(instanceId)
  if (!usageMap) {
    usageMap = new Map()
    sessionUsageStates.set(instanceId, usageMap)
  }
  return usageMap
}

function getSessionUsageState(instanceId: string, sessionId: string): SessionUsageState {
  const usageMap = getUsageInstance(instanceId)
  let state = usageMap.get(sessionId)
  if (!state) {
    state = createEmptyUsageState()
    usageMap.set(sessionId, state)
  }
  return state
}

function recomputeLatestEntry(state: SessionUsageState) {
  state.latestEntry = null
  for (const entry of state.entries.values()) {
    if (!state.latestEntry || entry.timestamp >= state.latestEntry.timestamp) {
      state.latestEntry = entry
    }
  }
}

function extractAssistantUsage(info: MessageInfo): AssistantUsageEntry | null {
  if (!info || info.role !== "assistant") return null
  if (!info.tokens) return null
  const tokens = info.tokens
  const inputTokens = tokens.input ?? 0
  const outputTokens = tokens.output ?? 0
  const reasoningTokens = tokens.reasoning ?? 0
  if (inputTokens === 0 && outputTokens === 0 && reasoningTokens === 0) {
    return null
  }
  const cacheReadTokens = tokens.cache?.read ?? 0
  const cacheWriteTokens = tokens.cache?.write ?? 0
  const combinedTokens = info.summary
    ? outputTokens
    : inputTokens + cacheReadTokens + cacheWriteTokens + outputTokens + reasoningTokens
  const cost = info.cost ?? 0
  const hasContextUsage = inputTokens + cacheReadTokens + cacheWriteTokens > 0
  return {
    info,
    inputTokens,
    outputTokens,
    reasoningTokens,
    combinedTokens,
    cost,
    hasContextUsage,
    timestamp: info.time?.created ?? 0,
  }
}

function removeUsageEntry(state: SessionUsageState, messageId: string | undefined) {
  if (!messageId) return
  const existing = state.entries.get(messageId)
  if (!existing) return
  state.entries.delete(messageId)
  state.totalInputTokens -= existing.inputTokens
  state.totalOutputTokens -= existing.outputTokens
  state.totalReasoningTokens -= existing.reasoningTokens
  state.totalCost -= existing.cost
  if (state.latestEntry?.info.id === messageId) {
    recomputeLatestEntry(state)
  }
}

function addUsageEntry(state: SessionUsageState, entry: AssistantUsageEntry) {
  state.entries.set(entry.info.id, entry)
  state.totalInputTokens += entry.inputTokens
  state.totalOutputTokens += entry.outputTokens
  state.totalReasoningTokens += entry.reasoningTokens
  state.totalCost += entry.cost
  if (!state.latestEntry || entry.timestamp >= state.latestEntry.timestamp) {
    state.latestEntry = entry
  }
}

function updateUsageFromMessageInfo(instanceId: string, sessionId: string, info: MessageInfo) {
  const messageId = typeof info.id === "string" ? info.id : undefined
  if (!messageId) return
  const state = getSessionUsageState(instanceId, sessionId)
  removeUsageEntry(state, messageId)
  const entry = extractAssistantUsage(info)
  if (entry) {
    addUsageEntry(state, entry)
  }
}

function rebuildSessionUsage(instanceId: string, sessionId: string, messagesInfo: Map<string, MessageInfo>) {
  const usageMap = getUsageInstance(instanceId)
  const nextState = createEmptyUsageState()
  for (const info of messagesInfo.values()) {
    const entry = extractAssistantUsage(info)
    if (entry) {
      addUsageEntry(nextState, entry)
    }
  }
  usageMap.set(sessionId, nextState)
}

function clearSessionUsage(instanceId: string, sessionId: string) {
  const usageMap = sessionUsageStates.get(instanceId)
  if (!usageMap) return
  usageMap.delete(sessionId)
  if (usageMap.size === 0) {
    sessionUsageStates.delete(instanceId)
  }
}

function decodeTextSegment(segment: any): any {
  if (typeof segment === "string") {
    return decodeHtmlEntities(segment)
  }

  if (segment && typeof segment === "object") {
    const updated: Record<string, any> = { ...segment }

    if (typeof updated.text === "string") {
      updated.text = decodeHtmlEntities(updated.text)
    }

    if (typeof updated.value === "string") {
      updated.value = decodeHtmlEntities(updated.value)
    }

    if (Array.isArray(updated.content)) {
      updated.content = updated.content.map((item: any) => decodeTextSegment(item))
    }

    return updated
  }

  return segment
}

function normalizeMessagePart(part: any): any {
  if (!part || typeof part !== "object") {
    return part
  }

  if (part.type !== "text") {
    return part
  }

  const normalized: Record<string, any> = { ...part, renderCache: undefined }

  if (typeof normalized.text === "string") {
    normalized.text = decodeHtmlEntities(normalized.text)
  } else if (normalized.text && typeof normalized.text === "object") {
    const textObject: Record<string, any> = { ...normalized.text }

    if (typeof textObject.value === "string") {
      textObject.value = decodeHtmlEntities(textObject.value)
    }

    if (Array.isArray(textObject.content)) {
      textObject.content = textObject.content.map((item: any) => decodeTextSegment(item))
    }

    if (typeof textObject.text === "string") {
      textObject.text = decodeHtmlEntities(textObject.text)
    }

    normalized.text = textObject
  }

  if (Array.isArray(normalized.content)) {
    normalized.content = normalized.content.map((item: any) => decodeTextSegment(item))
  }

  if (normalized.thinking && typeof normalized.thinking === "object") {
    const thinking: Record<string, any> = { ...normalized.thinking }
    if (Array.isArray(thinking.content)) {
      thinking.content = thinking.content.map((item: any) => decodeTextSegment(item))
    }
    normalized.thinking = thinking
  }

  return normalized
}

function computeDisplayParts(message: Message, showThinking: boolean): MessageDisplayParts {
  const text: any[] = []
  const tool: any[] = []
  const reasoning: any[] = []

  for (const part of message.parts) {
    if (part.type === "text" && !part.synthetic && partHasRenderableText(part)) {
      text.push(part)
    } else if (part.type === "tool") {
      tool.push(part)
    } else if (part.type === "reasoning" && showThinking && partHasRenderableText(part)) {
      reasoning.push(part)
    }
  }

  const combined = reasoning.length > 0 ? [...text, ...reasoning] : [...text]
  const version = typeof message.version === "number" ? message.version : 0

  return { text, tool, reasoning, combined, showThinking, version }
}

function initializePartVersion(part: any, version = 0) {
  if (!part || typeof part !== "object") return
  const partAny = part as any
  if (typeof partAny.version !== "number") {
    partAny.version = version
  }
}

function bumpPartVersion(previousPart: any, nextPart: any): number {
  const prevVersion = typeof previousPart?.version === "number" ? previousPart.version : -1
  const nextVersion = prevVersion + 1
  nextPart.version = nextVersion
  return nextVersion
}

function getSessionIndex(instanceId: string, sessionId: string) {
  let instanceMap = sessionIndexes.get(instanceId)
  if (!instanceMap) {
    instanceMap = new Map()
    sessionIndexes.set(instanceId, instanceMap)
  }

  let sessionMap = instanceMap.get(sessionId)
  if (!sessionMap) {
    sessionMap = { messageIndex: new Map(), partIndex: new Map() }
    instanceMap.set(sessionId, sessionMap)
  }

  return sessionMap
}

function rebuildSessionIndex(instanceId: string, sessionId: string, messages: Message[]) {
  const index = getSessionIndex(instanceId, sessionId)
  index.messageIndex.clear()
  index.partIndex.clear()

  messages.forEach((message, messageIdx) => {
    index.messageIndex.set(message.id, messageIdx)

    const partMap = new Map<string, number>()
    message.parts.forEach((part, partIdx) => {
      if (part.id && typeof part.id === "string") {
        partMap.set(part.id, partIdx)
      }
    })
    index.partIndex.set(message.id, partMap)
  })
}

function clearSessionIndex(instanceId: string, sessionId: string) {
  const instanceMap = sessionIndexes.get(instanceId)
  if (instanceMap) {
    instanceMap.delete(sessionId)
    if (instanceMap.size === 0) {
      sessionIndexes.delete(instanceId)
    }
  }
  clearSessionUsage(instanceId, sessionId)
}

function removeSessionIndexes(instanceId: string) {
  sessionIndexes.delete(instanceId)
  sessionUsageStates.delete(instanceId)
}

function updateSessionInfo(instanceId: string, sessionId: string) {
  const instanceSessions = sessions().get(instanceId)
  if (!instanceSessions) return

  const session = instanceSessions.get(sessionId)
  if (!session) return

  let contextWindow = 0
  let isSubscriptionModel = false
  let modelID = ""
  let providerID = ""
  let actualUsageTokens = 0

  const usageState = getSessionUsageState(instanceId, sessionId)
  const hasUsageEntries = usageState.entries.size > 0

  let totalInputTokens = hasUsageEntries ? usageState.totalInputTokens : 0
  let totalOutputTokens = hasUsageEntries ? usageState.totalOutputTokens : 0
  let totalReasoningTokens = hasUsageEntries ? usageState.totalReasoningTokens : 0
  let totalCost = hasUsageEntries ? usageState.totalCost : 0

  let latestAssistantInfo: MessageInfo | null = usageState.latestEntry?.info ?? null
  let latestHasContextUsage = usageState.latestEntry?.hasContextUsage ?? false
  const previousInfo = sessionInfoByInstance().get(instanceId)?.get(sessionId)
  let contextAvailableTokens: number | null = null
  let contextAvailableFromPrevious = false

  if (latestAssistantInfo) {
    const infoAny = latestAssistantInfo as any
    actualUsageTokens = usageState.latestEntry?.combinedTokens ?? 0
    modelID = infoAny.modelID || ""
    providerID = infoAny.providerID || ""
  } else if (previousInfo) {
    totalInputTokens = previousInfo.inputTokens
    totalOutputTokens = previousInfo.outputTokens
    totalReasoningTokens = previousInfo.reasoningTokens
    totalCost = previousInfo.cost
    actualUsageTokens = previousInfo.actualUsageTokens

    const previousContextWindow = previousInfo.contextWindow
    const previousContextAvailable = previousInfo.contextAvailableTokens ?? null
    const previousHasContextUsage =
      previousContextAvailable !== null && previousContextWindow > 0
        ? previousContextAvailable < previousContextWindow
        : false

    if (contextWindow === 0) {
      contextWindow = previousContextWindow
    }

    if (contextWindow !== previousContextWindow) {
      contextAvailableTokens = null
      contextAvailableFromPrevious = false
      latestHasContextUsage = previousHasContextUsage
    } else {
      contextAvailableTokens = previousContextAvailable
      contextAvailableFromPrevious = true
      latestHasContextUsage = previousHasContextUsage
    }

    isSubscriptionModel = previousInfo.isSubscriptionModel
  }

  const instanceProviders = providers().get(instanceId) || []




  const sessionModel = session.model
  let selectedModel: Provider["models"][number] | undefined

  if (sessionModel?.providerId && sessionModel?.modelId) {
    const provider = instanceProviders.find((p) => p.id === sessionModel.providerId)
    selectedModel = provider?.models.find((m) => m.id === sessionModel.modelId)
  }

  if (!selectedModel && modelID && providerID) {
    const provider = instanceProviders.find((p) => p.id === providerID)
    selectedModel = provider?.models.find((m) => m.id === modelID)
  }

  let modelOutputLimit = DEFAULT_MODEL_OUTPUT_LIMIT

  if (selectedModel) {
    if (selectedModel.limit?.context) {
      contextWindow = selectedModel.limit.context
    }

    if (selectedModel.limit?.output && selectedModel.limit.output > 0) {
      modelOutputLimit = selectedModel.limit.output
    }

    if (selectedModel.cost?.input === 0 && selectedModel.cost?.output === 0) {
      isSubscriptionModel = true
    }
  }

  const outputBudget = Math.min(modelOutputLimit, DEFAULT_MODEL_OUTPUT_LIMIT)

  if (!contextAvailableFromPrevious) {
    if (contextWindow > 0) {
      if (latestHasContextUsage && actualUsageTokens > 0) {
        contextAvailableTokens = Math.max(contextWindow - (actualUsageTokens + outputBudget), 0)
      } else {
        contextAvailableTokens = contextWindow
      }
    } else {
      contextAvailableTokens = null
    }
  }

  setSessionInfoByInstance((prev) => {
    const next = new Map(prev)
    const instanceInfo = new Map(prev.get(instanceId))
    instanceInfo.set(sessionId, {
      cost: totalCost,
      contextWindow,
      isSubscriptionModel,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      reasoningTokens: totalReasoningTokens,
      actualUsageTokens,
      modelOutputLimit,
      contextAvailableTokens,
    })
    next.set(instanceId, instanceInfo)
    return next
  })
}

export {
  bumpPartVersion,
  clearSessionIndex,
  computeDisplayParts,
  getSessionIndex,
  initializePartVersion,
  normalizeMessagePart,
  rebuildSessionIndex,
  rebuildSessionUsage,
  removeSessionIndexes,
  updateSessionInfo,
  updateUsageFromMessageInfo,
}
