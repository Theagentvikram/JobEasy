import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, RefreshCw, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui'
import { cn } from '../components/ui'
import { getApiBase } from '../services/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const STARTERS = [
  'Help me prep for a system design interview',
  'Review my resume summary and suggest improvements',
  'How should I negotiate a job offer?',
  'Write a cold message to a recruiter on LinkedIn',
  'What skills should I learn to switch to product management?',
  'Help me answer "Tell me about yourself" for a frontend role',
]

// ─── Markdown renderer ───────────────────────────────────────────────────────

function renderInline(text: string, isUser: boolean): React.ReactNode[] {
  // Split on **bold**, *italic*, `code`
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={i}>{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return (
        <code
          key={i}
          className={cn(
            'px-1.5 py-0.5 rounded text-[11px] font-mono',
            isUser ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
          )}
        >
          {part.slice(1, -1)}
        </code>
      )
    return part
  })
}

function renderMarkdown(content: string, isUser: boolean): React.ReactNode {
  const lines = content.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const trimmed = lines[i].trim()

    if (!trimmed) { i++; continue }

    // Numbered list  1. / 1)
    const numMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/)
    if (numMatch) {
      const items: string[] = [numMatch[2]]
      i++
      while (i < lines.length) {
        const m = lines[i].trim().match(/^\d+[.)]\s+(.+)/)
        if (!m) break
        items.push(m[1]); i++
      }
      nodes.push(
        <ol key={`ol${i}`} className="list-decimal list-outside ml-5 mt-2 space-y-1">
          {items.map((item, j) => <li key={j}>{renderInline(item, isUser)}</li>)}
        </ol>
      )
      continue
    }

    // Bullet list  - / •
    const bulletMatch = trimmed.match(/^[-•*]\s+(.+)/)
    if (bulletMatch) {
      const items: string[] = [bulletMatch[1]]
      i++
      while (i < lines.length) {
        const m = lines[i].trim().match(/^[-•*]\s+(.+)/)
        if (!m) break
        items.push(m[1]); i++
      }
      nodes.push(
        <ul key={`ul${i}`} className="list-disc list-outside ml-5 mt-2 space-y-1">
          {items.map((item, j) => <li key={j}>{renderInline(item, isUser)}</li>)}
        </ul>
      )
      continue
    }

    // Heading  ### / ##
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)/)
    if (headingMatch) {
      nodes.push(
        <p key={i} className={cn('font-semibold', nodes.length > 0 && 'mt-3')}>
          {renderInline(headingMatch[1], isUser)}
        </p>
      )
      i++; continue
    }

    // Regular paragraph
    nodes.push(
      <p key={i} className={nodes.length > 0 ? 'mt-2' : ''}>
        {renderInline(trimmed, isUser)}
      </p>
    )
    i++
  }

  return <>{nodes}</>
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
          isUser ? 'bg-brand-700' : 'bg-slate-100 dark:bg-slate-700'
        )}
      >
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-slate-600 dark:text-slate-300" />}
      </div>
      <div
        className={cn(
          'max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-brand-700 text-white rounded-tr-sm'
            : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 rounded-tl-sm'
        )}
      >
        {renderMarkdown(msg.content, isUser)}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
        <Bot size={14} className="text-slate-600 dark:text-slate-300" />
      </div>
      <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center">
          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse-dot" />
          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse-dot delay-200" />
          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse-dot delay-400" />
        </div>
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<{ role: string; content: string }[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text?: string) => {
    const content = (text || input).trim()
    if (!content || loading) return

    const userMsg: Message = { role: 'user', content, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const newHistory = [...history, { role: 'user', content }]

    // Add empty assistant message that we'll stream into
    const assistantMsg: Message = { role: 'assistant', content: '', timestamp: new Date() }
    setMessages((prev) => [...prev, assistantMsg])

    let fullReply = ''

    try {
      const { auth } = await import('../firebase/config')
      const token = auth.currentUser
        ? await auth.currentUser.getIdToken()
        : localStorage.getItem('dev_token') || ''

      const res = await fetch(`${getApiBase()}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: content, history: newHistory }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let streamDone = false

      while (!streamDone) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { streamDone = true; break }
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.token) {
              fullReply += parsed.token
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullReply }
                return updated
              })
            }
          } catch (e) { console.error('Chat parse error:', e) }
        }
      }

      setHistory([...newHistory, { role: 'assistant', content: fullReply }])
    } catch (e) {
      console.error('Chat error:', e)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Sorry, something went wrong. Please try again.',
        }
        return updated
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const reset = () => {
    setMessages([])
    setHistory([])
    setInput('')
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50/30 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-50 dark:bg-brand-950 rounded-xl flex items-center justify-center">
            <Bot size={18} className="text-brand-700" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-50">AI Career Coach</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse-dot" />
              Powered by Gemini · Context-aware
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RefreshCw size={13} /> New conversation
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8">
            <div className="w-14 h-14 bg-brand-50 dark:bg-brand-950 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-brand-700" />
            </div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Hey{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}! I'm your AI career coach.
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
              Ask me anything about your resume, job search, interview prep, salary negotiation, or career growth.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-brand-300 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/50 hover:text-brand-800 dark:hover:text-brand-300 transition-all duration-150 cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && messages[messages.length - 1]?.content === '' && <TypingIndicator />}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
        <div className="flex gap-3 items-end max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Ask anything about your career, resume, or job search…"
            rows={1}
            className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-transparent resize-none"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <Button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            loading={loading}
            className="flex-shrink-0 h-11"
          >
            <Send size={15} />
            Send
          </Button>
        </div>
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
