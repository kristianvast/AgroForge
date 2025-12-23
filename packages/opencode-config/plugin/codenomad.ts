import { createCodeNomadClient, getCodeNomadConfig } from "./lib/client"

export async function CodeNomadPlugin() {
  const config = getCodeNomadConfig()
  const client = createCodeNomadClient(config)

  await client.startEvents((event) => {
    if (event.type === "codenomad.ping") {
      void client.postEvent({
        type: "codenomad.pong",
        properties: {
          ts: Date.now(),
          pingTs: (event.properties as any)?.ts,
        },
      }).catch(() => {})
    }
  })

  return {
    async event(input: { event: any }) {
      const opencodeEvent = input?.event
      if (!opencodeEvent || typeof opencodeEvent !== "object") return

      if (opencodeEvent.type === "session.idle") {
        const sessionID = (opencodeEvent as any).properties?.sessionID
        void client.postEvent({
          type: "opencode.session.idle",
          properties: {
            sessionID,
          },
        }).catch(() => {})
      }
    },
  }
}
