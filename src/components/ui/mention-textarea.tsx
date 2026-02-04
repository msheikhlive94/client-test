'use client'

import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { MentionableUser } from '@/lib/hooks/use-mention-users'

export interface SelectedMention {
  userId: string
  email: string
  name: string
}

interface MentionTextareaProps {
  value: string
  onChange: (value: string) => void
  onMentionsChange: (mentions: SelectedMention[]) => void
  users: MentionableUser[]
  placeholder?: string
  className?: string
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  disabled?: boolean
}

export function MentionTextarea({
  value,
  onChange,
  onMentionsChange,
  users,
  placeholder = 'Write a comment... (use @ to mention)',
  className,
  onKeyDown,
  disabled
}: MentionTextareaProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [trackedMentions, setTrackedMentions] = useState<SelectedMention[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter users based on mention query
  const filteredUsers = users.filter(u => {
    const query = mentionQuery.toLowerCase()
    const displayName = (u.name || u.email || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    return displayName.includes(query) || email.includes(query)
  })

  // Reset selected index when filtered users change
  useEffect(() => {
    setSelectedIndex(0)
  }, [mentionQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const insertMention = useCallback((user: MentionableUser) => {
    const displayName = user.name || user.email
    const before = value.slice(0, mentionStartIndex)
    const cursorPos = textareaRef.current?.selectionStart ?? (mentionStartIndex + mentionQuery.length + 1)
    const after = value.slice(cursorPos)
    // Use @[Name] format for unambiguous mention parsing
    const mentionText = `@[${displayName}]`
    const newValue = `${before}${mentionText} ${after}`

    onChange(newValue)
    setShowDropdown(false)
    setMentionQuery('')
    setMentionStartIndex(-1)

    // Track this mention (deduplicate by userId)
    const newMention: SelectedMention = {
      userId: user.id,
      email: user.email,
      name: displayName
    }

    setTrackedMentions(prev => {
      const updated = prev.some(m => m.userId === user.id)
        ? prev
        : [...prev, newMention]
      setTimeout(() => onMentionsChange(updated), 0)
      return updated
    })

    // Focus textarea after insertion
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = before.length + mentionText.length + 1 // +1 for space
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }, [value, mentionStartIndex, mentionQuery, onChange, onMentionsChange])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart

    onChange(newValue)

    // Detect @ trigger
    // Look backward from cursor to find @ that starts a mention
    let atIndex = -1
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (newValue[i] === '@') {
        // Check if it's at start or preceded by space/newline
        if (i === 0 || /\s/.test(newValue[i - 1])) {
          atIndex = i
        }
        break
      }
      // Stop if we hit a newline
      if (newValue[i] === '\n') break
    }

    if (atIndex >= 0) {
      const query = newValue.slice(atIndex + 1, cursorPos)
      // Only show dropdown if query doesn't contain [ (already inserted mention) and is reasonable length
      if (!query.includes('[') && !query.includes(']') && query.length <= 30) {
        setMentionStartIndex(atIndex)
        setMentionQuery(query)
        setShowDropdown(true)
        return
      }
    }

    setShowDropdown(false)
    setMentionQuery('')
    setMentionStartIndex(-1)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredUsers.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredUsers[selectedIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowDropdown(false)
        return
      }
    }

    // Pass through to parent handler
    onKeyDown?.(e)
  }

  // Reset tracked mentions when value is cleared (after submit)
  useEffect(() => {
    if (value === '') {
      setTrackedMentions([])
    }
  }, [value])

  return (
    <div className="relative flex-1">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />

      {/* Mention Dropdown */}
      {showDropdown && filteredUsers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 right-0 mb-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-[200px] overflow-y-auto"
        >
          {filteredUsers.map((user, index) => {
            const displayName = user.name || user.email
            const isAdmin = user.type === 'admin'

            return (
              <button
                key={user.id}
                type="button"
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                  index === selectedIndex
                    ? 'bg-emerald-600/20 text-white'
                    : 'text-zinc-300 hover:bg-zinc-700/50'
                )}
                onClick={() => insertMention(user)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div
                  className={cn(
                    'h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
                    isAdmin ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                  )}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{displayName}</span>
                  {user.email && (
                    <span className="text-xs text-zinc-500 truncate block">{user.email}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium uppercase px-1.5 py-0.5 rounded shrink-0',
                    isAdmin
                      ? 'bg-emerald-600/30 text-emerald-400'
                      : 'bg-blue-600/30 text-blue-400'
                  )}
                >
                  {isAdmin ? 'Team' : 'Client'}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {showDropdown && filteredUsers.length === 0 && mentionQuery.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 right-0 mb-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 p-3"
        >
          <p className="text-sm text-zinc-500 text-center">No users found</p>
        </div>
      )}
    </div>
  )
}

/**
 * Render comment text with @mentions styled distinctly.
 * Supports both @[Name] format (from dropdown) and simple @Word format.
 */
export function renderCommentWithMentions(content: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  // Match @[Name with spaces] or @SingleWord patterns
  const mentionRegex = /@\[([^\]]+)\]|@(\w+)/g

  let lastIndex = 0
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }

    // The display name is either from brackets or from word match
    const displayName = match[1] || match[2]

    // Add the mention as styled span (show without brackets for cleaner look)
    parts.push(
      <span
        key={`mention-${match.index}`}
        className="text-emerald-400 font-semibold"
      >
        @{displayName}
      </span>
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  // If no mentions found, return original content
  if (parts.length === 0) {
    return content
  }

  return <>{parts}</>
}
