'use client'

import { useState, useCallback } from 'react'
import { Paperclip, Upload, X, Download, Trash2, FileText, Image as ImageIcon, File, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface TaskAttachment {
  id: string
  task_id: string
  comment_id: string | null
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  uploaded_by: string
  created_at: string
}

interface TaskAttachmentsProps {
  taskId: string
  workspaceId: string
  currentUserId: string
  commentId?: string | null
  compact?: boolean
}

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon
  return FileText
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function TaskAttachments({
  taskId,
  workspaceId,
  currentUserId,
  commentId = null,
  compact = false,
}: TaskAttachmentsProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const queryClient = useQueryClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  // Fetch attachments
  const { data: attachments, isLoading } = useQuery({
    queryKey: ['task-attachments', taskId, commentId],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (commentId) {
        query = query.eq('comment_id', commentId)
      } else {
        query = query.is('comment_id', null)
      }

      const { data, error } = await query
      if (error) throw error
      return data as TaskAttachment[]
    },
  })

  // Upload mutation
  const uploadFile = useCallback(async (file: globalThis.File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Max size is ${formatFileSize(MAX_FILE_SIZE)}.`)
      return
    }

    setIsUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'bin'
      const storagePath = `${workspaceId}/${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type,
        })

      if (uploadError) throw uploadError

      // Create DB record
      const { error: dbError } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          comment_id: commentId,
          file_name: file.name,
          file_path: storagePath,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          uploaded_by: currentUserId,
        })

      if (dbError) throw dbError

      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] })
      toast.success(`Uploaded ${file.name}`)
    } catch (err: any) {
      console.error('Upload error:', err)
      toast.error(`Failed to upload ${file.name}: ${err.message || 'Unknown error'}`)
    } finally {
      setIsUploading(false)
    }
  }, [taskId, workspaceId, currentUserId, commentId, queryClient])

  // Delete mutation
  const deleteAttachment = useMutation({
    mutationFn: async (attachment: TaskAttachment) => {
      const supabase = createClient()
      
      // Delete from storage
      await supabase.storage
        .from('task-attachments')
        .remove([attachment.file_path])

      // Delete from DB
      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachment.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] })
      toast.success('Attachment deleted')
    },
    onError: () => {
      toast.error('Failed to delete attachment')
    },
  })

  // Download handler
  const handleDownload = async (attachment: TaskAttachment) => {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('task-attachments')
      .createSignedUrl(attachment.file_path, 3600)

    if (error || !data?.signedUrl) {
      toast.error('Failed to generate download link')
      return
    }

    window.open(data.signedUrl, '_blank')
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    files.forEach(uploadFile)
  }, [uploadFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(uploadFile)
    e.target.value = '' // Reset input
  }, [uploadFile])

  const getPublicUrl = (path: string) => {
    return `${supabaseUrl}/storage/v1/object/public/task-attachments/${path}`
  }

  return (
    <div className="space-y-3 w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 text-text-secondary">
        <Paperclip className="h-4 w-4" />
        <span className="text-sm font-medium">
          Attachments {attachments?.length ? `(${attachments.length})` : ''}
        </span>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-brand bg-brand-muted'
            : 'border-border-default hover:border-brand/50',
        )}
        onClick={() => document.getElementById(`file-upload-${taskId}-${commentId || 'task'}`)?.click()}
      >
        <input
          id={`file-upload-${taskId}-${commentId || 'task'}`}
          type="file"
          className="hidden"
          multiple
          onChange={handleFileSelect}
        />
        {isUploading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
            <span className="text-sm text-text-secondary">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload className="h-5 w-5 text-text-muted" />
            <span className="text-sm text-text-secondary">
              Drop files here or <span className="text-brand font-medium">browse</span>
            </span>
            <span className="text-xs text-text-muted">Max {formatFileSize(MAX_FILE_SIZE)} per file</span>
          </div>
        )}
      </div>

      {/* Attachment List */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : attachments && attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.mime_type)
            const isImg = isImage(attachment.mime_type)

            return (
              <div
                key={attachment.id}
                className="group flex items-center gap-3 p-2 rounded-lg bg-surface hover:bg-surface-hover transition-colors overflow-hidden"
              >
                {/* Thumbnail or icon */}
                {isImg ? (
                  <div className="h-10 w-10 rounded overflow-hidden bg-surface-hover flex-shrink-0">
                    <img
                      src={getPublicUrl(attachment.file_path)}
                      alt={attachment.file_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded bg-surface-hover flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-text-muted" />
                  </div>
                )}

                {/* File info */}
                <div className="flex-1 min-w-0 overflow-hidden max-w-[calc(100%-6rem)]">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(attachment)}
                    className="h-7 w-7 p-0 text-text-muted hover:text-text-primary"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {attachment.uploaded_by === currentUserId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteAttachment.mutate(attachment)}
                      disabled={deleteAttachment.isPending}
                      className="h-7 w-7 p-0 text-text-muted hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
