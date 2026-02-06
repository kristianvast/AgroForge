import type { PluginInput } from "@opencode-ai/plugin"
import { createAgroForgeClient, getAgroForgeConfig } from "./lib/client"
import { createBackgroundProcessTools } from "./lib/background-process"

export async function AgroForgePlugin(input: PluginInput) {
  const config = getAgroForgeConfig()
  const client = createAgroForgeClient(config)
  const backgroundProcessTools = createBackgroundProcessTools(config, { baseDir: input.directory })

  await client.startEvents((event) => {
    if (event.type === "agroforge.ping") {
      void client.postEvent({
        type: "agroforge.pong",
        properties: {
          ts: Date.now(),
          pingTs: (event.properties as any)?.ts,
        },
      }).catch(() => {})
    }
  })

  return {
    tool: {
      ...backgroundProcessTools,
    },
    async event(input: { event: any }) {
      const opencodeEvent = input?.event
      if (!opencodeEvent || typeof opencodeEvent !== "object") return

    },
  }
}
