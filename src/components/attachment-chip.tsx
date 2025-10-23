import { Component } from "solid-js"
import type { Attachment } from "../types/attachment"

interface AttachmentChipProps {
  attachment: Attachment
  onRemove: () => void
}

const AttachmentChip: Component<AttachmentChipProps> = (props) => {
  return (
    <div
      class="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      title={props.attachment.source.type === "file" ? props.attachment.source.path : undefined}
    >
      <span class="font-mono">{props.attachment.display}</span>
      <button
        onClick={props.onRemove}
        class="flex h-4 w-4 items-center justify-center rounded hover:bg-blue-200 dark:hover:bg-blue-800"
        aria-label="Remove attachment"
      >
        ×
      </button>
    </div>
  )
}

export default AttachmentChip
