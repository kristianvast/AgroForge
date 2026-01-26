/**
 * Hook to auto-copy text selection to clipboard (like terminal behavior)
 * Shows a brief toast notification on successful copy
 */
import { onMount, onCleanup } from "solid-js"
import { copyToClipboard } from "../clipboard"
import { showToastNotification } from "../notifications"

export function useSelectionCopy() {
  onMount(() => {
    let lastCopiedText = ""

    const handleMouseUp = async () => {
      const selection = window.getSelection()
      if (!selection) return

      const selectedText = selection.toString().trim()
      
      // Skip if no text, empty selection, or same as last copied
      if (!selectedText || selectedText === lastCopiedText) return
      
      // Skip if selection is inside an input, textarea, or contenteditable
      const anchorNode = selection.anchorNode
      if (anchorNode) {
        const element = anchorNode.nodeType === Node.ELEMENT_NODE 
          ? anchorNode as Element 
          : anchorNode.parentElement
        
        if (element) {
          const tagName = element.tagName?.toLowerCase()
          if (
            tagName === "input" || 
            tagName === "textarea" ||
            element.closest("[contenteditable=\"true\"]") ||
            element.closest("input") ||
            element.closest("textarea")
          ) {
            return
          }
        }
      }

      const success = await copyToClipboard(selectedText)
      
      if (success) {
        lastCopiedText = selectedText
        
        // Clear the "last copied" after a short delay to allow re-copying same text
        setTimeout(() => {
          lastCopiedText = ""
        }, 500)

        // Show brief toast notification
        const charCount = selectedText.length
        const preview = selectedText.length > 50 
          ? selectedText.slice(0, 50) + "..." 
          : selectedText
        
        showToastNotification({
          message: `Copied ${charCount} character${charCount === 1 ? "" : "s"}`,
          variant: "success",
          duration: 1500,
          position: "bottom-center",
        })
      }
    }

    document.addEventListener("mouseup", handleMouseUp)
    
    onCleanup(() => {
      document.removeEventListener("mouseup", handleMouseUp)
    })
  })
}
