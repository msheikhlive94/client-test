'use client'

import { useState } from 'react'
import { useTaskComments, useCreateTaskComment, useDeleteTaskComment, useRealtimeTaskComments, useMentionUsers } from '@/lib/hooks'
import { TaskComment } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { MentionTextarea, SelectedMention, renderCommentWithMentions } from '@/components/ui/mention-textarea'

interface PortalTaskCommentsProps {
  taskId: string
  taskTitle: string
  projectId: string
  currentUserId: string
  currentUserName: string
}

export function PortalTaskComments({
  taskId,
  taskTitle,
  projectId,
  currentUserId,
  currentUserName
}: PortalTaskCommentsProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [pendingMentions, setPendingMentions] = useState<SelectedMention[]>([])

  const { data: comments, isLoading } = useTaskComments(taskId)
  const createComment = useCreateTaskComment()
  const { data: mentionUsers } = useMentionUsers(projectId)

  // Subscribe to realtime comment updates for this task
  useRealtimeTaskComments(taskId)
  const deleteComment = useDeleteTaskComment()

  const handleSubmit = async () => {
    if (!newComment.trim()) return

    const commentContent = newComment.trim()
    const mentions = [...pendingMentions]

    try {
      const result = await createComment.mutateAsync({
        task_id: taskId,
        user_id: currentUserId,
        content: commentContent,
        author_type: 'client',
        author_name: currentUserName
      })
      setNewComment('')
      setPendingMentions([])

      // Send mention notifications if there are mentions
      if (mentions.length > 0 && result?.id) {
        try {
          await fetch('/api/mentions/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              comment_id: result.id,
              task_id: taskId,
              mentioned_users: mentions.map(m => ({
                user_id: m.userId,
                email: m.email,
                name: m.name
              })),
              author_name: currentUserName,
              comment_content: commentContent
            })
          })
        } catch (notifyError) {
          console.error('Failed to send mention notifications:', notifyError)
        }
      }
    } catch {
      toast.error('Failed to add comment')
    }
  }

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync({ id: commentId, taskId })
      toast.success('Comment deleted')
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const commentCount = comments?.length || 0

  return (
    <div className="border-t border-zinc-700/50 mt-2">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-2 px-1 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
      >
        <span>
          {commentCount} comment{commentCount !== 1 ? 's' : ''}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="pb-3 space-y-3">
          {/* Comments List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />
            </div>
          ) : !comments?.length ? (
            <p className="text-xs text-zinc-500 text-center py-2">
              No comments yet
            </p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto overflow-x-hidden">
              {comments.map((comment) => {
                const isOwn = comment.user_id === currentUserId
                const isAdmin = comment.author_type === 'admin'

                return (
                  <div
                    key={comment.id}
                    className={cn(
                      'group flex gap-2 p-2 rounded-md text-sm',
                      isAdmin ? 'bg-emerald-950/30' : 'bg-zinc-700/30'
                    )}
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback
                        className={cn(
                          'text-[10px] font-medium',
                          isAdmin
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 text-white'
                        )}
                      >
                        {getInitials(comment.author_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-xs font-medium text-zinc-300 truncate max-w-[120px] sm:max-w-none">
                          {comment.author_name || 'Unknown'}
                        </span>
                        {isAdmin && (
                          <span className="text-[9px] font-medium uppercase px-1 py-0.5 rounded bg-emerald-600/30 text-emerald-400 shrink-0">
                            Team
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                        {renderCommentWithMentions(comment.content)}
                      </p>
                    </div>

                    {isOwn && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(comment.id)}
                        disabled={deleteComment.isPending}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* New Comment Input with Mentions */}
          <div className="flex gap-2">
            <MentionTextarea
              value={newComment}
              onChange={setNewComment}
              onMentionsChange={setPendingMentions}
              users={mentionUsers || []}
              placeholder="Add a comment... (use @ to mention)"
              className="bg-zinc-900 border-zinc-700 text-xs min-h-[50px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim() || createComment.isPending}
              size="sm"
              className="h-auto bg-emerald-600 hover:bg-emerald-700 px-2"
            >
              {createComment.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
