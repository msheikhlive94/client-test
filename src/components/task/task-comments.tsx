'use client'

import { useState } from 'react'
import { useTaskComments, useCreateTaskComment, useUpdateTaskComment, useDeleteTaskComment, useRealtimeTaskComments, useMentionUsers } from '@/lib/hooks'
import { TaskComment, CommentAuthorType } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageSquare, Send, Pencil, Trash2, X, Check, Loader2, Paperclip } from 'lucide-react'
import { TaskAttachments } from '@/components/task/task-attachments'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { MentionTextarea, SelectedMention, renderCommentWithMentions } from '@/components/ui/mention-textarea'

interface TaskCommentsProps {
  taskId: string
  projectId: string
  workspaceId: string
  currentUserId: string
  currentUserName: string
  authorType: CommentAuthorType
  maxHeight?: string
}

export function TaskComments({
  taskId,
  projectId,
  workspaceId,
  currentUserId,
  currentUserName,
  authorType,
  maxHeight = '300px'
}: TaskCommentsProps) {
  const [newComment, setNewComment] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [pendingMentions, setPendingMentions] = useState<SelectedMention[]>([])

  const { data: comments, isLoading } = useTaskComments(taskId)
  const createComment = useCreateTaskComment()
  const { data: mentionUsers } = useMentionUsers(projectId)

  // Subscribe to realtime comment updates for this task
  useRealtimeTaskComments(taskId)
  const updateComment = useUpdateTaskComment()
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
        author_type: authorType,
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

  const handleEdit = (comment: TaskComment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return

    try {
      await updateComment.mutateAsync({
        id: editingId,
        taskId,
        content: editContent.trim()
      })
      setEditingId(null)
      setEditContent('')
    } catch {
      toast.error('Failed to update comment')
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

  return (
    <div className="space-y-4 w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 text-text-secondary">
        <MessageSquare className="h-4 w-4" />
        <span className="text-sm font-medium">
          Comments {comments?.length ? `(${comments.length})` : ''}
        </span>
      </div>

      {/* Comments List */}
      <div style={{ maxHeight }} className="pr-4 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 text-text-muted animate-spin" />
          </div>
        ) : !comments?.length ? (
          <div className="text-center py-8 text-text-muted text-sm">
            No comments yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const isOwn = comment.user_id === currentUserId
              const isEditing = editingId === comment.id
              const isAdmin = comment.author_type === 'admin'

              return (
                <div
                  key={comment.id}
                  className={cn(
                    'group flex gap-3 p-3 rounded-lg',
                    isAdmin ? 'bg-brand-muted' : 'bg-surface'
                  )}
                >
                  {/* Avatar */}
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback
                      className={cn(
                        'text-xs font-medium',
                        isAdmin
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 text-white'
                      )}
                    >
                      {getInitials(comment.author_name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-text-primary truncate max-w-[150px] sm:max-w-none">
                        {comment.author_name || 'Unknown'}
                      </span>
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
                      <span className="text-xs text-text-muted shrink-0">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Body */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="bg-input-bg border-border-default text-sm min-h-[60px]"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={updateComment.isPending}
                            className="h-7 bg-brand hover:bg-brand-hover text-white"
                          >
                            {updateComment.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            <span className="ml-1">Save</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            className="h-7 text-text-secondary"
                          >
                            <X className="h-3 w-3" />
                            <span className="ml-1">Cancel</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-text-secondary whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {renderCommentWithMentions(comment.content)}
                        </p>
                        {/* Comment Attachments */}
                        <TaskAttachments 
                          taskId={taskId}
                          workspaceId={workspaceId}
                          currentUserId={currentUserId}
                          commentId={comment.id}
                          compact
                        />
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {isOwn && !isEditing && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(comment)}
                        className="h-7 w-7 p-0 text-text-muted hover:text-text-primary"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(comment.id)}
                        disabled={deleteComment.isPending}
                        className="h-7 w-7 p-0 text-text-muted hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New Comment Input with Mentions */}
      <div className="flex gap-2">
        <MentionTextarea
          value={newComment}
          onChange={setNewComment}
          onMentionsChange={setPendingMentions}
          users={mentionUsers || []}
          placeholder="Write a comment... (use @ to mention)"
          className="bg-input-bg border-border-default text-sm min-h-[60px] resize-none"
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
          className="h-auto bg-brand hover:bg-brand-hover text-white px-3"
        >
          {createComment.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <p className="text-[10px] text-text-muted">
        Press Cmd+Enter to send • Type @ to mention someone
      </p>
    </div>
  )
}
