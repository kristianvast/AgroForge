import { Component, createSignal, createEffect, For, Show, onMount } from "solid-js"
import { Dialog } from "@kobalte/core/dialog"

interface FileItem {
  path: string
  added?: number
  removed?: number
  isGitFile: boolean
}

interface FilePickerProps {
  open: boolean
  onClose: () => void
  onSelect: (path: string) => void
  instanceId: string
  instanceClient: any
  searchQuery?: string
}

const FilePicker: Component<FilePickerProps> = (props) => {
  const [files, setFiles] = createSignal<FileItem[]>([])
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [query, setQuery] = createSignal(props.searchQuery || "")
  const [loading, setLoading] = createSignal(false)

  let inputRef: HTMLInputElement | undefined

  async function fetchFiles(searchQuery: string) {
    if (!props.instanceClient) return

    setLoading(true)
    try {
      const gitFilesPromise = props.instanceClient.file.status()
      const searchFilesPromise = searchQuery
        ? props.instanceClient.find.files({ query: { query: searchQuery } })
        : Promise.resolve({ data: [] })

      const [gitResponse, searchResponse] = await Promise.all([gitFilesPromise, searchFilesPromise])

      const gitFiles: FileItem[] = (gitResponse.data || []).map((file: any) => ({
        path: file.path,
        added: file.added,
        removed: file.removed,
        isGitFile: true,
      }))

      const searchFiles: FileItem[] = (searchResponse.data || [])
        .filter((path: string) => !gitFiles.some((gf) => gf.path === path))
        .map((path: string) => ({
          path,
          isGitFile: false,
        }))

      const allFiles = searchQuery
        ? [...gitFiles.filter((f) => f.path.includes(searchQuery)), ...searchFiles]
        : gitFiles

      setFiles(allFiles)
      setSelectedIndex(0)
    } catch (error) {
      console.error("Failed to fetch files:", error)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  createEffect(() => {
    if (props.open) {
      fetchFiles(query())
    }
  })

  createEffect(() => {
    if (props.searchQuery !== undefined) {
      setQuery(props.searchQuery)
    }
  })

  onMount(() => {
    if (props.open && inputRef) {
      setTimeout(() => inputRef?.focus(), 50)
    }
  })

  function handleKeyDown(e: KeyboardEvent) {
    const fileList = files()
    if (fileList.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, fileList.length - 1))
        scrollToSelected()
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        scrollToSelected()
        break
      case "Enter":
        e.preventDefault()
        if (fileList[selectedIndex()]) {
          handleSelect(fileList[selectedIndex()].path)
        }
        break
      case "Escape":
        e.preventDefault()
        props.onClose()
        break
    }
  }

  function scrollToSelected() {
    setTimeout(() => {
      const selectedElement = document.querySelector('[data-file-selected="true"]')
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }
    }, 0)
  }

  function handleSelect(path: string) {
    props.onSelect(path)
    props.onClose()
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    fetchFiles(value)
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
        <div class="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <Dialog.Content
            class="w-full max-w-2xl rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
            onKeyDown={handleKeyDown}
          >
            <div class="border-b border-gray-200 p-4 dark:border-gray-700">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search files..."
                value={query()}
                onInput={(e) => handleQueryChange(e.currentTarget.value)}
                class="w-full border-0 bg-transparent text-base outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            <div class="max-h-96 overflow-y-auto">
              <Show
                when={!loading()}
                fallback={
                  <div class="p-8 text-center text-sm text-gray-500">
                    <div class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                    <span class="ml-2">Loading files...</span>
                  </div>
                }
              >
                <Show
                  when={files().length > 0}
                  fallback={<div class="p-8 text-center text-sm text-gray-500">No matching files</div>}
                >
                  <For each={files()}>
                    {(file, index) => (
                      <div
                        data-file-selected={index() === selectedIndex()}
                        class={`cursor-pointer border-b border-gray-100 px-4 py-2 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 ${
                          index() === selectedIndex() ? "bg-blue-50 dark:bg-blue-900/20" : ""
                        }`}
                        onClick={() => handleSelect(file.path)}
                      >
                        <div class="flex items-center justify-between">
                          <span class="font-mono text-sm text-gray-900 dark:text-gray-100">{file.path}</span>
                          <Show when={file.isGitFile && (file.added || file.removed)}>
                            <div class="flex gap-2 text-xs">
                              <Show when={file.added}>
                                <span class="text-green-600 dark:text-green-400">+{file.added}</span>
                              </Show>
                              <Show when={file.removed}>
                                <span class="text-red-600 dark:text-red-400">-{file.removed}</span>
                              </Show>
                            </div>
                          </Show>
                        </div>
                      </div>
                    )}
                  </For>
                </Show>
              </Show>
            </div>

            <div class="border-t border-gray-200 p-2 text-xs text-gray-500 dark:border-gray-700">
              <div class="flex items-center justify-between px-2">
                <span>↑↓ Navigate • Enter Select • Esc Close</span>
              </div>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}

export default FilePicker
