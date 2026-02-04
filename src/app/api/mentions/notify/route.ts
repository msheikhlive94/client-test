import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const TELEGRAM_BOT_TOKEN = '7775389753:AAGJpdZ8KK1cODTN2L42D_xyZWMCv8aRCPs'
const TELEGRAM_CHAT_ID = '6203550531'
const MCP_EMAIL = 'mcp@z-flow.de'

const resend = new Resend(process.env.RESEND_API_KEY)

interface MentionNotifyRequest {
  comment_id: string
  task_id: string
  mentioned_users: Array<{
    user_id: string
    email: string
    name: string
  }>
  author_name: string
  comment_content: string
}

interface TaskWithProject {
  id: string
  title: string
  description: string | null
  projects: { id: string; name: string; client_id: string | null } | null
}

interface CommentRow {
  author_name: string | null
  content: string
  created_at: string
  author_type: string
}

export async function POST(request: NextRequest) {
  try {
    const body: MentionNotifyRequest = await request.json()
    const { comment_id, task_id, mentioned_users, author_name, comment_content } = body

    if (!comment_id || !task_id || !mentioned_users?.length) {
      return NextResponse.json(
        { error: 'comment_id, task_id, and mentioned_users are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Fetch task details with project
    const { data: taskRaw, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, description, projects:project_id(id, name, client_id)')
      .eq('id', task_id)
      .single()

    if (taskError || !taskRaw) {
      console.error('Failed to fetch task:', taskError)
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    const task = taskRaw as unknown as TaskWithProject

    // Fetch all comments on this task for context
    const { data: commentsRaw } = await supabase
      .from('task_comments')
      .select('author_name, content, created_at, author_type')
      .eq('task_id', task_id)
      .order('created_at', { ascending: true })

    const allComments = (commentsRaw || []) as unknown as CommentRow[]
    const projectName = task.projects?.name || 'Unknown Project'

    // Resolve emails for users who don't have one (client users)
    for (const mention of mentioned_users) {
      if (!mention.email && mention.user_id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(mention.user_id)
        if (authUser?.user?.email) {
          mention.email = authUser.user.email
        }
      }
    }

    // Store mentions in the database
    const mentionInserts = mentioned_users
      .filter(m => m.email)
      .map(m => ({
        comment_id,
        task_id,
        mentioned_user_id: m.user_id || null,
        mentioned_email: m.email,
        notified: false
      }))

    if (mentionInserts.length > 0) {
      await (supabase as any)
        .from('task_comment_mentions')
        .insert(mentionInserts)
    }

    // Process notifications
    const results: Array<{ email: string; status: string; error?: string }> = []

    // Deduplicate by email
    const uniqueEmails = [...new Set(mentioned_users.map(m => m.email).filter(Boolean))]

    for (const email of uniqueEmails) {
      try {
        if (email.toLowerCase() === MCP_EMAIL) {
          // Send Telegram notification
          await sendTelegramNotification({
            taskTitle: task.title,
            taskDescription: task.description || '',
            projectName,
            authorName: author_name,
            commentContent: comment_content,
            allComments,
            taskId: task_id
          })
          results.push({ email, status: 'telegram_sent' })
        } else {
          // Send email notification via Resend
          await sendEmailNotification({
            to: email,
            taskTitle: task.title,
            taskDescription: task.description || '',
            projectName,
            authorName: author_name,
            commentContent: comment_content,
            taskId: task_id
          })
          results.push({ email, status: 'email_sent' })
        }

        // Mark as notified
        if (mentionInserts.length > 0) {
          await (supabase as any)
            .from('task_comment_mentions')
            .update({ notified: true })
            .eq('comment_id', comment_id)
            .eq('mentioned_email', email)
        }
      } catch (error: any) {
        console.error(`Failed to notify ${email}:`, error)
        results.push({ email, status: 'failed', error: error.message })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Mention notification error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process mention notifications' },
      { status: 500 }
    )
  }
}

async function sendTelegramNotification({
  taskTitle,
  taskDescription,
  projectName,
  authorName,
  commentContent,
  allComments,
  taskId
}: {
  taskTitle: string
  taskDescription: string
  projectName: string
  authorName: string
  commentContent: string
  allComments: CommentRow[]
  taskId: string
}) {
  // Build a rich message with full context
  let message = `🔔 *You were mentioned in a comment*\n\n`
  message += `📋 *Project:* ${escapeMarkdown(projectName)}\n`
  message += `📌 *Task:* ${escapeMarkdown(taskTitle)}\n`

  if (taskDescription) {
    const desc = taskDescription.length > 200
      ? taskDescription.slice(0, 200) + '...'
      : taskDescription
    message += `📝 *Description:* ${escapeMarkdown(desc)}\n`
  }

  message += `\n👤 *Mentioned by:* ${escapeMarkdown(authorName)}\n`
  message += `💬 *Comment:* ${escapeMarkdown(commentContent)}\n`

  // Add recent comments for context (last 5)
  if (allComments.length > 1) {
    const recentComments = allComments.slice(-5)
    message += `\n📜 *Recent Comments:*\n`
    for (const c of recentComments) {
      const authorLabel = c.author_type === 'admin' ? '🟢' : '🔵'
      const name = c.author_name || 'Unknown'
      const content = c.content.length > 100 ? c.content.slice(0, 100) + '...' : c.content
      message += `${authorLabel} *${escapeMarkdown(name)}:* ${escapeMarkdown(content)}\n`
    }
  }

  message += `\n🔗 [Open Task](https://app.z-flow.de)`

  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Telegram API error: ${JSON.stringify(errorData)}`)
  }
}

function escapeMarkdown(text: string): string {
  // Escape special Markdown characters for Telegram
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1')
}

async function sendEmailNotification({
  to,
  taskTitle,
  taskDescription,
  projectName,
  authorName,
  commentContent,
  taskId
}: {
  to: string
  taskTitle: string
  taskDescription: string
  projectName: string
  authorName: string
  commentContent: string
  taskId: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.z-flow.de'

  await resend.emails.send({
    from: 'Z-Flow <no-reply@send.z-flow.de>',
    to,
    subject: `${authorName} mentioned you in "${taskTitle}" — Z-Flow`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #09090b;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                <tr>
                  <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 40px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">Z-Flow</h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #d1fae5;">You were mentioned in a comment</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 40px;">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #a1a1aa;">Project</p>
                    <p style="margin: 0 0 24px; font-size: 16px; color: #fafafa; font-weight: 600;">${projectName}</p>

                    <p style="margin: 0 0 8px; font-size: 14px; color: #a1a1aa;">Task</p>
                    <p style="margin: 0 0 24px; font-size: 16px; color: #fafafa; font-weight: 600;">${taskTitle}</p>

                    ${taskDescription ? `
                    <p style="margin: 0 0 8px; font-size: 14px; color: #a1a1aa;">Description</p>
                    <p style="margin: 0 0 24px; font-size: 14px; color: #d4d4d8; line-height: 1.6;">${taskDescription}</p>
                    ` : ''}

                    <div style="background-color: #27272a; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                      <p style="margin: 0 0 8px; font-size: 13px; color: #10b981; font-weight: 600;">${authorName} wrote:</p>
                      <p style="margin: 0; font-size: 14px; color: #e4e4e7; line-height: 1.6; white-space: pre-wrap;">${commentContent}</p>
                    </div>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${appUrl}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 10px;">
                            View in Z-Flow →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color: #09090b; border-top: 1px solid #27272a; border-radius: 0 0 16px 16px;">
                    <p style="margin: 0; font-size: 12px; color: #52525b; text-align: center;">
                      This email was sent because you were @mentioned in a comment on Z-Flow.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  })
}
