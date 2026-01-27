import type { NativeDialogOptions } from "../types"
import { getLogger } from "../../logger"

const log = getLogger("actions")

/**
 * Type declarations for the File System Access API.
 * These APIs are available in Chromium-based browsers (Chrome, Edge, Opera).
 * @see https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
 */
interface FileSystemHandle {
  kind: "file" | "directory"
  name: string
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: "file"
  getFile(): Promise<File>
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: "directory"
}

interface DirectoryPickerOptions {
  id?: string
  mode?: "read" | "readwrite"
  startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos" | FileSystemHandle
}

interface OpenFilePickerOptions {
  multiple?: boolean
  excludeAcceptAllOption?: boolean
  types?: Array<{
    description?: string
    accept: Record<string, string[]>
  }>
  startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos" | FileSystemHandle
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>
    showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>
  }
}

/**
 * Checks if the Web File System Access API is available in the current browser.
 * This API is supported in Chromium-based browsers (Chrome 86+, Edge 86+, Opera 72+).
 *
 * Note: Firefox and Safari do not support this API as of 2026.
 *
 * @returns true if showDirectoryPicker is available
 */
export function webFileSystemApiAvailable(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window
}

/**
 * Result from the Web File System Access API dialog.
 *
 * IMPORTANT LIMITATION: The File System Access API operates within a security sandbox
 * and does NOT provide access to the full filesystem path. We can only get:
 * - handle.name: The name of the selected file/directory (e.g., "my-project")
 * - The handle itself: Can be used to read/write files within the selected directory
 *
 * This means we CANNOT get paths like "/home/user/projects/my-project" which are
 * required for workspace selection in AgroForge (the server needs real paths).
 *
 * For workspace selection, the app must fall back to DirectoryBrowserDialog which
 * communicates with the server to browse the actual filesystem.
 *
 * Potential future solutions:
 * 1. Server-side handle resolution (if browser APIs ever support it)
 * 2. Using the handle for file operations directly in the browser
 * 3. Asking users to paste/type the path after selection (poor UX)
 */
export interface WebFileSystemResult {
  /** The name of the selected file or directory (NOT the full path) */
  name: string
  /** The handle for file operations (can read/write within the selection) */
  handle: FileSystemHandle
}

/**
 * Opens the browser's native directory picker dialog using the File System Access API.
 *
 * @returns The directory handle and name, or null if cancelled/unsupported
 */
export async function openWebDirectoryPicker(): Promise<WebFileSystemResult | null> {
  if (!webFileSystemApiAvailable()) {
    return null
  }

  try {
    const handle = await window.showDirectoryPicker!({
      mode: "read",
    })
    return {
      name: handle.name,
      handle,
    }
  } catch (error) {
    // User cancelled the dialog (AbortError) or permission denied (NotAllowedError)
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        // User cancelled - this is expected, not an error
        return null
      }
      log.warn("[native] web directory picker failed", error.name, error.message)
    }
    return null
  }
}

/**
 * Opens the browser's native file picker dialog using the File System Access API.
 *
 * @param options - Dialog options (filters are converted to accept types)
 * @returns The file handle and name, or null if cancelled/unsupported
 */
export async function openWebFilePicker(
  options?: Pick<NativeDialogOptions, "filters">,
): Promise<WebFileSystemResult | null> {
  if (typeof window === "undefined" || !("showOpenFilePicker" in window)) {
    return null
  }

  try {
    // Convert our filter format to File System Access API format
    const types = options?.filters?.map((filter) => ({
      description: filter.name,
      accept: {
        // Create a generic MIME type mapping for the extensions
        "application/octet-stream": filter.extensions.map((ext) => `.${ext}`),
      },
    }))

    const handles = await window.showOpenFilePicker!({
      multiple: false,
      types: types?.length ? types : undefined,
    })

    if (handles.length === 0) {
      return null
    }

    const handle = handles[0]
    return {
      name: handle.name,
      handle,
    }
  } catch (error) {
    // User cancelled the dialog (AbortError) or permission denied (NotAllowedError)
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        // User cancelled - this is expected, not an error
        return null
      }
      log.warn("[native] web file picker failed", error.name, error.message)
    }
    return null
  }
}

/**
 * Opens a web native dialog using the File System Access API.
 *
 * WARNING: This function returns only the NAME of the selected item, not the full path.
 * This is a fundamental limitation of the browser security sandbox.
 *
 * For use cases requiring full paths (like workspace selection), use the
 * DirectoryBrowserDialog component which communicates with the server.
 *
 * @param options - Dialog options
 * @returns The name of the selected file/directory, or null if cancelled
 */
export async function openWebNativeDialog(options: NativeDialogOptions): Promise<string | null> {
  const result =
    options.mode === "directory"
      ? await openWebDirectoryPicker()
      : await openWebFilePicker({ filters: options.filters })

  // Return only the name since we can't get the full path
  return result?.name ?? null
}
