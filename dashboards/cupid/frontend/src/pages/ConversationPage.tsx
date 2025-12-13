import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, User, Bot, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useDashboardStore } from '@/store/useDashboardStore'
import Badge from '@/components/shared/Badge'
import { formatCost, formatLatencyMs, formatDuration, formatRelativeTime, formatTokens } from '@/lib/format'
import { CHAPTER_NAMES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ConversationMessage } from '@/types'

// Agents to EXCLUDE from script view (UI widgets with JSON, routing checks)
const EXCLUDED_AGENTS = new Set([
  'DisplayMortal',
  'DisplayMatch',
  'DisplayCompatibilityCard',
  'DisplayChoices',  // JSON choice options
  'HasEnded',        // JSON status checks
])

function ChapterDivider({ chapter }: { chapter: string }) {
  const chapterNum = parseInt(chapter.replace('chapter_', ''))
  const chapterName = CHAPTER_NAMES[chapterNum] || chapter

  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-border" />
      <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-medium">
        {chapterName}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function MessageCard({ message }: { message: ConversationMessage }) {
  const [expanded, setExpanded] = useState(false)
  const isUser = message.type === 'user'

  return (
    <div
      className={cn(
        'rounded-lg p-4 mb-4',
        isUser ? 'bg-pink-500/10 border border-pink-500/20' : 'bg-card border border-border'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              isUser ? 'bg-pink-500/20' : 'bg-primary/20'
            )}
          >
            {isUser ? (
              <User className="w-4 h-4 text-pink-400" />
            ) : (
              <Bot className="w-4 h-4 text-primary" />
            )}
          </div>
          <div>
            <span className="font-medium text-sm">
              {isUser ? 'User' : message.agent || 'Agent'}
            </span>
            {!isUser && message.metadata && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatLatencyMs(message.metadata.latency_ms)}</span>
                <span>{formatCost(message.metadata.cost)}</span>
              </div>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(message.timestamp)}
        </span>
      </div>

      {/* Content */}
      <div className={cn('prose prose-invert prose-sm max-w-none', isUser && 'italic text-muted-foreground')}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown>{message.content}</ReactMarkdown>
        )}
      </div>

      {/* Expandable Details (agent only) */}
      {!isUser && message.metadata && (
        <div className="mt-3 pt-3 border-t border-border">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Details
          </button>
          {expanded && (
            <div className="grid grid-cols-4 gap-4 mt-3 text-xs">
              <div>
                <p className="text-muted-foreground">Total Tokens</p>
                <p className="font-medium">{formatTokens(message.metadata.total_tokens)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Prompt</p>
                <p className="font-medium">{formatTokens(message.metadata.prompt_tokens)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Completion</p>
                <p className="font-medium">{formatTokens(message.metadata.completion_tokens)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Model</p>
                <p className="font-medium font-mono">{message.metadata.model || '-'}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScriptView({ messages }: { messages: ConversationMessage[] }) {
  const [copied, setCopied] = useState(false)

  // Filter to agent messages, excluding UI/routing/control agents
  const scriptMessages = messages.filter(
    (m) => m.type === 'agent' && m.agent && !EXCLUDED_AGENTS.has(m.agent)
  )

  // Group by chapter
  const groupedByChapter: Record<string, ConversationMessage[]> = {}
  for (const msg of scriptMessages) {
    const chapter = msg.chapter || 'unknown'
    if (!groupedByChapter[chapter]) {
      groupedByChapter[chapter] = []
    }
    groupedByChapter[chapter].push(msg)
  }

  // Sort chapters
  const sortedChapters = Object.keys(groupedByChapter).sort((a, b) => {
    const numA = parseInt(a.replace('chapter_', ''))
    const numB = parseInt(b.replace('chapter_', ''))
    return numA - numB
  })

  // Build markdown string for copy
  const buildMarkdownScript = () => {
    const parts: string[] = []
    for (const chapter of sortedChapters) {
      const chapterNum = parseInt(chapter.replace('chapter_', ''))
      const chapterName = CHAPTER_NAMES[chapterNum] || chapter
      parts.push(`# ${chapterName}\n`)
      for (const msg of groupedByChapter[chapter]) {
        parts.push(msg.content)
      }
      parts.push('\n---\n')
    }
    return parts.join('\n').replace(/\n---\n$/, '') // Remove trailing divider
  }

  const handleCopy = async () => {
    const script = buildMarkdownScript()
    await navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      {/* Header with copy button */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="text-sm font-medium text-muted-foreground">Full Script</h3>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary rounded text-sm hover:bg-primary/30 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Script
            </>
          )}
        </button>
      </div>

      {/* Script content */}
      <div className="p-6 prose prose-invert prose-sm max-w-none">
        {sortedChapters.map((chapter, chapterIndex) => {
          const chapterNum = parseInt(chapter.replace('chapter_', ''))
          const chapterName = CHAPTER_NAMES[chapterNum] || chapter
          const chapterMessages = groupedByChapter[chapter]

          return (
            <div key={chapter}>
              <h2 className="text-primary mt-0">{chapterName}</h2>
              {chapterMessages.map((msg, msgIndex) => (
                <ReactMarkdown key={msgIndex}>{msg.content}</ReactMarkdown>
              ))}
              {chapterIndex < sortedChapters.length - 1 && (
                <hr className="my-8 border-border" />
              )}
            </div>
          )
        })}

        {sortedChapters.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No script content available
          </p>
        )}
      </div>
    </div>
  )
}

export default function ConversationPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { conversation, conversationLoading, fetchConversation } = useDashboardStore()
  const [activeTab, setActiveTab] = useState<'log' | 'script'>('log')

  useEffect(() => {
    if (sessionId) {
      fetchConversation(sessionId)
    }
  }, [sessionId, fetchConversation])

  if (conversationLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4" />
          <div className="h-4 bg-muted rounded w-96 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="p-8">
        <Link to="/sessions" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Sessions
        </Link>
        <p className="text-muted-foreground">Session not found</p>
      </div>
    )
  }

  const { session, messages } = conversation
  const progressLabel = session.is_complete
    ? 'Complete'
    : session.max_chapter >= 0
    ? `${CHAPTER_NAMES[session.max_chapter] || `Chapter ${session.max_chapter}`}`
    : 'Just Started'

  // Group messages by chapter
  let currentChapter: string | null = null

  return (
    <div className="p-8 max-w-4xl">
      {/* Back Link */}
      <Link to="/sessions" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Sessions
      </Link>

      {/* Header */}
      <div className="bg-card rounded-lg border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold font-mono text-blue-400">{session.id}</h1>
          <Badge variant={session.is_complete ? 'success' : 'warning'}>{progressLabel}</Badge>
        </div>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Characters</p>
            <p className="font-medium">
              {session.mortal_name && session.match_name
                ? `${session.mortal_name} & ${session.match_name}`
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Chapters</p>
            <p className="font-medium">
              {session.max_chapter >= 0 ? `0 - ${session.max_chapter}` : '-'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Cost</p>
            <p className="font-medium">{formatCost(session.total_cost)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Duration</p>
            <p className="font-medium">{formatDuration(session.duration_seconds)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab('log')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors relative',
            activeTab === 'log'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Log
          {activeTab === 'log' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('script')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors relative',
            activeTab === 'script'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Script
          {activeTab === 'script' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'log' ? (
        <div>
          {messages.map((message, index) => {
            const showChapterDivider = message.chapter && message.chapter !== currentChapter
            if (message.chapter) {
              currentChapter = message.chapter
            }

            return (
              <div key={index}>
                {showChapterDivider && <ChapterDivider chapter={message.chapter!} />}
                <MessageCard message={message} />
              </div>
            )
          })}

          {messages.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No messages in this conversation</p>
          )}
        </div>
      ) : (
        <ScriptView messages={messages} />
      )}
    </div>
  )
}
