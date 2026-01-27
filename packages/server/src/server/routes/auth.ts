import type { FastifyInstance } from "fastify"
import rateLimit from "@fastify/rate-limit"
import fs from "fs"
import { z } from "zod"
import type { AuthManager } from "../../auth/manager"
import { isLoopbackAddress } from "../../auth/http-auth"

interface RouteDeps {
  authManager: AuthManager
}

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

const TokenSchema = z.object({
  token: z.string().min(1),
})

const PasswordSchema = z.object({
  password: z.string().min(8),
})

const LOGIN_TEMPLATE_URL = new URL("./auth-pages/login.html", import.meta.url)
const TOKEN_TEMPLATE_URL = new URL("./auth-pages/token.html", import.meta.url)

let cachedLoginTemplate: string | null = null
let cachedTokenTemplate: string | null = null

function readTemplate(url: URL, cache: string | null): string {
  if (cache) return cache
  const content = fs.readFileSync(url, "utf-8")
  return content
}

function getLoginHtml(defaultUsername: string): string {
  if (!cachedLoginTemplate) {
    cachedLoginTemplate = readTemplate(LOGIN_TEMPLATE_URL, null)
  }

  const escapedUsername = escapeHtml(defaultUsername)
  return cachedLoginTemplate.replace(/\{\{DEFAULT_USERNAME\}\}/g, escapedUsername)
}

function getTokenHtml(): string {
  if (!cachedTokenTemplate) {
    cachedTokenTemplate = readTemplate(TOKEN_TEMPLATE_URL, null)
  }

  return cachedTokenTemplate
}

/** Rate limit config for brute-force sensitive endpoints */
const AUTH_RATE_LIMIT = {
  max: 10,
  timeWindow: "1 minute",
  errorResponseBuilder: () => ({
    error: "Too many requests",
    message: "Rate limit exceeded. Please try again later.",
  }),
}

export async function registerAuthRoutes(app: FastifyInstance, deps: RouteDeps) {
  // Register rate limiting plugin scoped to this plugin instance
  await app.register(rateLimit, {
    global: false, // Don't apply globally, only to routes with config
  })

  app.get("/login", async (_request, reply) => {
    const status = deps.authManager.getStatus()
    reply.type("text/html").send(getLoginHtml(status.username))
  })

  app.get("/auth/token", async (request, reply) => {
    if (!deps.authManager.isTokenBootstrapEnabled()) {
      reply.code(404).send({ error: "Not found" })
      return
    }

    if (!isLoopbackAddress(request.socket.remoteAddress)) {
      reply.code(404).send({ error: "Not found" })
      return
    }

    reply.type("text/html").send(getTokenHtml())
  })

  app.get("/api/auth/status", async (request, reply) => {
    const session = deps.authManager.getSessionFromRequest(request)
    if (!session) {
      reply.send({ authenticated: false })
      return
    }
    reply.send({ authenticated: true, ...deps.authManager.getStatus() })
  })

  // Rate-limited: brute-force target
  app.post("/api/auth/login", { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) => {
    const body = LoginSchema.parse(request.body ?? {})
    const ok = deps.authManager.validateLogin(body.username, body.password)
    if (!ok) {
      reply.code(401).send({ error: "Invalid credentials" })
      return
    }

    const session = deps.authManager.createSession(body.username)
    deps.authManager.setSessionCookie(reply, session.id)
    reply.send({ ok: true })
  })

  // Rate-limited: brute-force target
  app.post("/api/auth/token", { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) => {
    if (!deps.authManager.isTokenBootstrapEnabled()) {
      reply.code(404).send({ error: "Not found" })
      return
    }

    if (!isLoopbackAddress(request.socket.remoteAddress)) {
      reply.code(404).send({ error: "Not found" })
      return
    }

    const body = TokenSchema.parse(request.body ?? {})
    const ok = deps.authManager.consumeBootstrapToken(body.token)
    if (!ok) {
      reply.code(401).send({ error: "Invalid token" })
      return
    }

    const username = deps.authManager.getStatus().username
    const session = deps.authManager.createSession(username)
    deps.authManager.setSessionCookie(reply, session.id)
    reply.send({ ok: true })
  })

  app.post("/api/auth/logout", async (_request, reply) => {
    deps.authManager.clearSessionCookie(reply)
    reply.send({ ok: true })
  })

  app.post("/api/auth/password", async (request, reply) => {
    const session = deps.authManager.getSessionFromRequest(request)
    if (!session) {
      reply.code(401).send({ error: "Unauthorized" })
      return
    }

    const body = PasswordSchema.parse(request.body ?? {})
    try {
      const status = deps.authManager.setPassword(body.password)
      reply.send({ ok: true, ...status })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      reply.code(409).type("text/plain").send(message)
    }
  })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;"
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case '"':
        return "&quot;"
      default:
        return char
    }
  })
}
