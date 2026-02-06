import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "fs"
import { spawnSync } from "child_process"
import os from "os"
import path from "path"
import type { Logger } from "./logger"

const PID_DIR = path.join(os.homedir(), ".config", "codenomad", "pids")
const SERVER_PID_FILENAME = "server.pid"
const WORKSPACE_PREFIX = "workspace-"
const PID_SUFFIX = ".pid"

export class PidTracker {
  private readonly pidDir: string

  constructor(private readonly logger: Logger) {
    this.pidDir = PID_DIR
  }

  writeServerPid(): void {
    this.ensureDir()
    writeFileSync(path.join(this.pidDir, SERVER_PID_FILENAME), String(process.pid), "utf-8")
    this.logger.debug({ pid: process.pid }, "Wrote server PID file")
  }

  removeServerPid(): void {
    this.safeUnlink(path.join(this.pidDir, SERVER_PID_FILENAME))
  }

  writeWorkspacePid(workspaceId: string, pid: number): void {
    this.ensureDir()
    writeFileSync(path.join(this.pidDir, `${WORKSPACE_PREFIX}${workspaceId}${PID_SUFFIX}`), String(pid), "utf-8")
    this.logger.debug({ workspaceId, pid }, "Wrote workspace PID file")
  }

  removeWorkspacePid(workspaceId: string): void {
    this.safeUnlink(path.join(this.pidDir, `${WORKSPACE_PREFIX}${workspaceId}${PID_SUFFIX}`))
  }

  reapOrphans(): { reaped: number; cleaned: number } {
    let reaped = 0
    let cleaned = 0

    if (!existsSync(this.pidDir)) {
      return { reaped, cleaned }
    }

    let files: string[]
    try {
      files = readdirSync(this.pidDir)
    } catch {
      return { reaped, cleaned }
    }

    for (const file of files) {
      if (!file.startsWith(WORKSPACE_PREFIX) || !file.endsWith(PID_SUFFIX)) {
        continue
      }

      const filePath = path.join(this.pidDir, file)
      const pid = this.readPidFile(filePath)

      if (pid === null) {
        this.safeUnlink(filePath)
        cleaned++
        continue
      }

      if (!this.isProcessAlive(pid)) {
        this.logger.debug({ pid, file }, "Stale PID file (process dead), removing")
        this.safeUnlink(filePath)
        cleaned++
        continue
      }

      if (!this.looksLikeOpenCode(pid)) {
        this.logger.debug({ pid, file }, "PID reused by unrelated process, removing stale file")
        this.safeUnlink(filePath)
        cleaned++
        continue
      }

      this.logger.warn({ pid, file }, "Found orphaned OpenCode process, killing")
      this.killOrphan(pid)
      this.safeUnlink(filePath)
      reaped++
    }

    this.cleanStaleServerPid()

    return { reaped, cleaned }
  }

  private cleanStaleServerPid(): void {
    const filePath = path.join(this.pidDir, SERVER_PID_FILENAME)
    if (!existsSync(filePath)) return

    const pid = this.readPidFile(filePath)
    if (pid !== null && pid !== process.pid) {
      this.safeUnlink(filePath)
    }
  }

  private readPidFile(filePath: string): number | null {
    try {
      const raw = readFileSync(filePath, "utf-8").trim()
      const pid = parseInt(raw, 10)
      return isNaN(pid) || pid <= 0 ? null : pid
    } catch {
      return null
    }
  }

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }

  private looksLikeOpenCode(pid: number): boolean {
    if (process.platform === "win32") {
      return this.looksLikeOpenCodeWindows(pid)
    }
    return this.looksLikeOpenCodeUnix(pid)
  }

  private looksLikeOpenCodeUnix(pid: number): boolean {
    try {
      const result = spawnSync("ps", ["-p", String(pid), "-o", "args="], {
        encoding: "utf-8",
        timeout: 3000,
      })
      const cmdline = (result.stdout ?? "").trim().toLowerCase()
      return cmdline.includes("opencode") && cmdline.includes("serve")
    } catch {
      return false
    }
  }

  private looksLikeOpenCodeWindows(pid: number): boolean {
    try {
      const result = spawnSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], {
        encoding: "utf-8",
        timeout: 3000,
      })
      return (result.stdout ?? "").toLowerCase().includes("opencode")
    } catch {
      return false
    }
  }

  private killOrphan(pid: number): void {
    if (process.platform === "win32") {
      try {
        spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", timeout: 5000 })
      } catch (error) {
        this.logger.debug({ pid, err: error }, "Failed to taskkill orphan")
      }
      return
    }

    // Prefer process-group kill so opencode's children (if any) are also cleaned up.
    // OpenCode is spawned with detached:true, making it the group leader.
    try {
      process.kill(-pid, "SIGTERM")
    } catch {
      try {
        process.kill(pid, "SIGTERM")
      } catch (error) {
        this.logger.debug({ pid, err: error }, "Failed to SIGTERM orphan")
      }
    }
  }

  private ensureDir(): void {
    if (!existsSync(this.pidDir)) {
      mkdirSync(this.pidDir, { recursive: true })
    }
  }

  private safeUnlink(filePath: string): void {
    try {
      unlinkSync(filePath)
    } catch {
    }
  }
}
