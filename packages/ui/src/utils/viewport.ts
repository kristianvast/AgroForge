/**
 * Viewport Utilities for Mobile Browser UI
 *
 * Handles dynamic viewport height detection for mobile browsers where:
 * - iOS Safari: Address bar shrinks/expands on scroll
 * - Chrome Mobile: Bottom navigation appears/disappears
 * - 100vh is broken on mobile (includes browser chrome, causing content cutoff)
 *
 * This module provides:
 * - CSS custom properties: --vh, --dvh, --svh for accurate viewport heights
 * - Keyboard detection for layout-aware input handling
 * - Visual viewport API integration for keyboard-aware layouts
 */

type ViewportListener = () => void

let isInitialized = false
let updateScheduled = false
const listeners: Set<ViewportListener> = new Set()

/**
 * Updates CSS custom properties for viewport height
 * Sets --vh, --dvh, --svh on document root
 */
function updateViewportVariables(): void {
  const root = document.documentElement

  // Standard vh unit (1% of inner height)
  const vh = window.innerHeight * 0.01
  root.style.setProperty("--vh", `${vh}px`)

  // Dynamic viewport height (accounts for browser UI changes)
  // On mobile, visualViewport gives us the "true" visible area
  if (window.visualViewport) {
    const dvh = window.visualViewport.height * 0.01
    root.style.setProperty("--dvh", `${dvh}px`)

    // Small viewport height (minimum visible area - always safe)
    // This is the height when all browser UI is visible
    // Approximate by using the smaller of current visual viewport and inner height
    const svh = Math.min(window.visualViewport.height, window.innerHeight) * 0.01
    root.style.setProperty("--svh", `${svh}px`)
  } else {
    // Fallback for browsers without visualViewport API
    root.style.setProperty("--dvh", `${vh}px`)
    root.style.setProperty("--svh", `${vh}px`)
  }

  // Full 100% values for convenience
  root.style.setProperty("--viewport-height", `${window.innerHeight}px`)

  if (window.visualViewport) {
    root.style.setProperty("--visual-viewport-height", `${window.visualViewport.height}px`)
  } else {
    root.style.setProperty("--visual-viewport-height", `${window.innerHeight}px`)
  }

  // Notify all listeners
  listeners.forEach((listener) => listener())
}

/**
 * Schedules viewport update on next animation frame
 * Prevents excessive updates during rapid resize/scroll events
 */
function scheduleUpdate(): void {
  if (updateScheduled) return
  updateScheduled = true
  requestAnimationFrame(() => {
    updateScheduled = false
    updateViewportVariables()
  })
}

/**
 * Handles keyboard appearance/disappearance on mobile
 * Updates a data attribute on body for CSS targeting
 */
function updateKeyboardState(): void {
  if (!window.visualViewport) return

  const root = document.documentElement
  const viewportHeight = window.visualViewport.height
  const windowHeight = window.innerHeight

  // If visual viewport is significantly smaller than window,
  // keyboard is likely visible (threshold: 150px difference)
  const keyboardVisible = windowHeight - viewportHeight > 150

  if (keyboardVisible) {
    root.dataset.keyboardOpen = "true"
    document.body.classList.add("mobile-keyboard-open")
  } else {
    delete root.dataset.keyboardOpen
    document.body.classList.remove("mobile-keyboard-open")
  }

  // Set keyboard height as CSS variable
  const keyboardHeight = keyboardVisible ? windowHeight - viewportHeight : 0
  root.style.setProperty("--keyboard-height", `${keyboardHeight}px`)
}

/**
 * Handles visual viewport resize (keyboard, zoom, etc.)
 */
function handleVisualViewportResize(): void {
  scheduleUpdate()
  updateKeyboardState()
}

/**
 * Handles orientation change
 */
function handleOrientationChange(): void {
  // Delay update to allow browser to settle after orientation change
  setTimeout(() => {
    updateViewportVariables()
    updateKeyboardState()
  }, 100)
}

/**
 * Scrolls focused input into view, accounting for keyboard
 */
function handleInputFocus(event: FocusEvent): void {
  const target = event.target as HTMLElement
  if (!target || !window.visualViewport) return

  // Only handle input elements
  const isInput =
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.getAttribute("contenteditable") === "true"

  if (!isInput) return

  // Wait for keyboard to appear
  setTimeout(() => {
    if (!window.visualViewport) return

    const rect = target.getBoundingClientRect()
    const viewportBottom = window.visualViewport.height + window.visualViewport.offsetTop

    // If input is below the visible viewport, scroll it into view
    if (rect.bottom > viewportBottom - 50) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, 300)
}

/**
 * Initializes viewport detection
 * Call this once in your app entry point
 */
export function initViewport(): () => void {
  if (isInitialized) {
    // Already initialized, just return cleanup function
    return () => {}
  }

  isInitialized = true

  // Initial update
  updateViewportVariables()
  updateKeyboardState()

  // Listen to window resize
  window.addEventListener("resize", scheduleUpdate, { passive: true })

  // Listen to orientation change
  window.addEventListener("orientationchange", handleOrientationChange, { passive: true })

  // Listen to visual viewport changes (keyboard, zoom, etc.)
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleVisualViewportResize, { passive: true })
    window.visualViewport.addEventListener("scroll", scheduleUpdate, { passive: true })
  }

  // Handle input focus for keyboard scrolling
  document.addEventListener("focusin", handleInputFocus, { passive: true })

  // Return cleanup function
  return () => {
    isInitialized = false
    window.removeEventListener("resize", scheduleUpdate)
    window.removeEventListener("orientationchange", handleOrientationChange)

    if (window.visualViewport) {
      window.visualViewport.removeEventListener("resize", handleVisualViewportResize)
      window.visualViewport.removeEventListener("scroll", scheduleUpdate)
    }

    document.removeEventListener("focusin", handleInputFocus)
  }
}

/**
 * Subscribe to viewport changes
 */
export function onViewportChange(listener: ViewportListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Get current viewport dimensions
 */
export function getViewportDimensions(): {
  vh: number
  dvh: number
  svh: number
  keyboardHeight: number
  keyboardOpen: boolean
} {
  const windowHeight = window.innerHeight
  const visualHeight = window.visualViewport?.height ?? windowHeight
  const keyboardHeight = windowHeight - visualHeight

  return {
    vh: windowHeight,
    dvh: visualHeight,
    svh: Math.min(visualHeight, windowHeight),
    keyboardHeight: keyboardHeight > 150 ? keyboardHeight : 0,
    keyboardOpen: keyboardHeight > 150,
  }
}

/**
 * Force an immediate viewport update
 */
export function forceViewportUpdate(): void {
  updateViewportVariables()
  updateKeyboardState()
}
