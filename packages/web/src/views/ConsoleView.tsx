import React, { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import {
  Terminal as TerminalIcon,
  Trash2,
  Download,
  Send,
  Sparkles,
  Command,
  ArrowDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useServerStore } from '@/stores/serverStore'
import { toast } from 'sonner'

const QUICK_COMMANDS = [
  'help',
  'list',
  'time set day',
  'weather clear',
  'save hold',
  'save query',
  'save resume',
  'whitelist on',
  'gamemode survival @a',
]

export const ConsoleView: React.FC = () => {
  const { logs, sendCommand, serverState } = useServerStore()
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermInstance = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  const [inputVal, setInputVal] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState<number>(-1)

  // Initialize xterm
  useEffect(() => {
    if (!terminalRef.current) return

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.3,
      theme: {
        background: '#09090b',
        foreground: '#e4e4e7',
        cursor: '#fafafa',
        selectionBackground: 'rgba(255, 255, 255, 0.2)',
        black: '#18181b',
        red: '#f43f5e',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#d946ef',
        cyan: '#06b6d4',
        white: '#fafafa',
      },
      convertEol: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(terminalRef.current)
    fitAddon.fit()

    xtermInstance.current = term
    fitAddonRef.current = fitAddon

    // Write initial welcome banner
    term.writeln('\x1b[1;37m=== Minecraft Bedrock Dedicated Server Console ===\x1b[0m')
    term.writeln('\x1b[90mPowered by BDS Native Process Supervisor (RakNet UDP 19132)\x1b[0m')
    term.writeln('')

    // Render existing logs
    logs.forEach((log) => {
      formatAndWriteLine(term, log)
    })

    const handleResize = () => {
      try {
        fitAddon.fit()
      } catch {}
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      term.dispose()
    }
  }, [])

  // Stream new logs to xterm
  const prevLogsLength = useRef(logs.length)
  useEffect(() => {
    if (!xtermInstance.current) return

    if (logs.length > prevLogsLength.current) {
      const newItems = logs.slice(prevLogsLength.current)
      newItems.forEach((log) => {
        formatAndWriteLine(xtermInstance.current!, log)
      })
    }
    prevLogsLength.current = logs.length
  }, [logs])

  const formatAndWriteLine = (term: XTerm, line: string) => {
    if (line.startsWith('>')) {
      term.writeln(`\x1b[1;36m${line}\x1b[0m`)
    } else if (line.includes('[WARN]')) {
      term.writeln(`\x1b[33m${line}\x1b[0m`)
    } else if (line.includes('[ERROR]')) {
      term.writeln(`\x1b[1;31m${line}\x1b[0m`)
    } else if (line.includes('[Player]')) {
      term.writeln(`\x1b[32m${line}\x1b[0m`)
    } else if (line.includes('[RakNet]')) {
      term.writeln(`\x1b[35m${line}\x1b[0m`)
    } else {
      term.writeln(`\x1b[37m${line}\x1b[0m`)
    }
  }

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputVal.trim()) return

    sendCommand(inputVal)
    setHistory((prev) => [...prev, inputVal])
    setHistoryIdx(-1)
    setInputVal('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length === 0) return
      const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1)
      setHistoryIdx(nextIdx)
      setInputVal(history[nextIdx])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIdx === -1) return
      const nextIdx = historyIdx + 1
      if (nextIdx >= history.length) {
        setHistoryIdx(-1)
        setInputVal('')
      } else {
        setHistoryIdx(nextIdx)
        setInputVal(history[nextIdx])
      }
    }
  }

  const clearConsole = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear()
      xtermInstance.current.writeln('\x1b[90mConsole cleared.\x1b[0m')
      toast.info('Console cleared')
    }
  }

  const downloadLog = () => {
    const text = logs.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bds-console-${new Date().toISOString().slice(0, 10)}.log`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Console log exported')
  }

  const scrollToBottom = () => {
    if (xtermInstance.current) {
      xtermInstance.current.scrollToBottom()
    }
  }

  return (
    <div className="h-full min-h-0 flex flex-col p-4 gap-3 max-w-7xl mx-auto">
      {/* Console Top Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-muted text-foreground border border-border">
            <TerminalIcon className="size-4 text-foreground stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold flex items-center gap-2">
              <span>Interactive Server Console</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {serverState === 'online' ? 'PTY Attached' : 'Offline'}
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">Standard input/output stream to bedrock_server binary</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button size="xs" variant="outline" onClick={scrollToBottom} className="gap-1 text-xs">
            <ArrowDown className="size-3 text-foreground stroke-[2]" /> Bottom
          </Button>
          <Button size="xs" variant="outline" onClick={clearConsole} className="gap-1 text-xs">
            <Trash2 className="size-3 text-foreground stroke-[2]" /> Clear
          </Button>
          <Button size="xs" variant="outline" onClick={downloadLog} className="gap-1 text-xs">
            <Download className="size-3 text-foreground stroke-[2]" /> Export
          </Button>
        </div>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 min-h-0 rounded-xl border border-border/80 bg-[#09090b] p-3 shadow-inner overflow-hidden flex flex-col">
        <div ref={terminalRef} className="flex-1 w-full h-full" />
      </div>

      {/* Quick Command Suggestions Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
          <Command className="size-3" /> Quick:
        </span>
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            onClick={() => {
              setInputVal(cmd)
            }}
            className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground font-mono text-[11px] border border-border/40 whitespace-nowrap transition-colors"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Command Input Bar */}
      <form onSubmit={handleSend} className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-foreground text-xs font-bold select-none">
            &gt;
          </span>
          <Input
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={serverState !== 'online'}
            placeholder={
              serverState === 'online'
                ? "Enter command (e.g. 'say Hello Bedrock', 'save hold', 'time set day')..."
                : "Server is offline. Start the server to send console commands."
            }
            className="pl-6 font-mono text-xs h-9 bg-card/60 border-border/80 focus-visible:ring-ring/50"
          />
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={serverState !== 'online' || !inputVal.trim()}
          className="h-9 px-3.5 gap-1.5 shadow-sm"
        >
          <Send className="size-3.5 text-primary-foreground stroke-[2]" />
          <span>Execute</span>
        </Button>
      </form>
    </div>
  )
}
