import { Show, Match, Switch } from "solid-js"
import ToolCall from "./tool-call"
import { isItemExpanded, toggleItemExpanded } from "../stores/tool-call-state"

interface MessagePartProps {
  part: any
}

export default function MessagePart(props: MessagePartProps) {
  const partType = () => props.part?.type || ""
  const reasoningId = () => `reasoning-${props.part?.id || ""}`
  const isReasoningExpanded = () => isItemExpanded(reasoningId())

  function handleReasoningClick(e: Event) {
    e.preventDefault()
    toggleItemExpanded(reasoningId())
  }

  return (
    <Switch>
      <Match when={partType() === "text"}>
        <Show when={!props.part.synthetic && props.part.text}>
          <div class="message-text">{props.part.text}</div>
        </Show>
      </Match>

      <Match when={partType() === "tool"}>
        <ToolCall toolCall={props.part} toolCallId={props.part?.id} />
      </Match>

      <Match when={partType() === "error"}>
        <div class="message-error-part">⚠ {props.part.message}</div>
      </Match>

      <Match when={partType() === "reasoning"}>
        <div class="message-reasoning">
          <div class="reasoning-container">
            <div class="reasoning-header" onClick={handleReasoningClick}>
              <span class="reasoning-icon">{isReasoningExpanded() ? "▼" : "▶"}</span>
              <span class="reasoning-label">Reasoning</span>
            </div>
            <Show when={isReasoningExpanded()}>
              <div class="message-text mt-2">{props.part.text || ""}</div>
            </Show>
          </div>
        </div>
      </Match>
    </Switch>
  )
}
