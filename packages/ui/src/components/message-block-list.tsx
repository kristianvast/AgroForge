import { Index, Show, type Accessor } from "solid-js"
import VirtualItem from "./virtual-item"
import MessageBlock from "./message-block"
import type { InstanceMessageStore } from "../stores/message-v2/instance-store"

export function getMessageAnchorId(messageId: string) {
  return `message-anchor-${messageId}`
}

const VIRTUAL_ITEM_MARGIN_PX = 800

interface MessageBlockListProps {
  instanceId: string
  sessionId: string
  store: () => InstanceMessageStore
  messageIds: () => string[]
  lastAssistantIndex: () => number
  showThinking: () => boolean
  thinkingDefaultExpanded: () => boolean
  showUsageMetrics: () => boolean
  scrollContainer: Accessor<HTMLDivElement | undefined>
  loading?: boolean
  onRevert?: (messageId: string) => void
  onFork?: (messageId?: string) => void
  onContentRendered?: () => void
  setBottomSentinel: (element: HTMLDivElement | null) => void
  suspendMeasurements?: () => boolean
  showPendingIndicator?: () => boolean
}

export default function MessageBlockList(props: MessageBlockListProps) {
  // Keep virtualization always enabled - toggling it based on loading causes re-render storms
  // The VirtualItem handles visibility internally and doesn't need to be disabled during loads
  return (
    <>
      <Index each={props.messageIds()}>
        {(messageId, index) => (
          <VirtualItem
            id={getMessageAnchorId(messageId())}
            cacheKey={messageId()}
            scrollContainer={props.scrollContainer}
            threshold={VIRTUAL_ITEM_MARGIN_PX}
            placeholderClass="message-stream-placeholder"
            virtualizationEnabled={() => true}
            suspendMeasurements={props.suspendMeasurements}
          >
            <MessageBlock
              messageId={messageId()}
              instanceId={props.instanceId}
              sessionId={props.sessionId}
              store={props.store}
              messageIndex={index}
              lastAssistantIndex={props.lastAssistantIndex}
              showThinking={props.showThinking}
              thinkingDefaultExpanded={props.thinkingDefaultExpanded}
              showUsageMetrics={props.showUsageMetrics}
              onRevert={props.onRevert}
              onFork={props.onFork}
              onContentRendered={props.onContentRendered}
            />
          </VirtualItem>
        )}
      </Index>

      {/* Pending response indicator - shows when session is working but no streaming message yet */}
      <Show when={props.showPendingIndicator?.()}>
        <div class="message-pending-indicator">
          <div class="message-thinking" role="status" aria-live="polite">
            <div class="message-thinking-visual" aria-hidden="true">
              <span class="message-thinking-ring" />
              <span class="message-thinking-dot message-thinking-dot-1" />
              <span class="message-thinking-dot message-thinking-dot-2" />
              <span class="message-thinking-dot message-thinking-dot-3" />
            </div>
            <div class="message-thinking-text">
              <span class="message-thinking-title">Agent thinking</span>
              <span class="message-thinking-subtitle">Preparing response...</span>
            </div>
          </div>
        </div>
      </Show>

      <div ref={props.setBottomSentinel} aria-hidden="true" style={{ height: "1px" }} />
    </>
  )
}
