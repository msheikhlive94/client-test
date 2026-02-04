import { Resend } from 'resend'
import fs from 'fs'
import path from 'path'
import { appConfig } from '@/lib/config/theme'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}

export async function sendInvitationEmail(
  to: string,
  clientName: string,
  invitationLink: string,
  retries = 3
): Promise<void> {
  const emailTemplate = fs.readFileSync(
    path.join(process.cwd(), 'src/emails/client-invitation.html'),
    'utf-8'
  )

  const html = emailTemplate
    .replace(/{{CLIENT_NAME}}/g, clientName)
    .replace(/{{CLIENT_EMAIL}}/g, to)
    .replace(/{{INVITATION_LINK}}/g, invitationLink)
    .replace(/{{APP_NAME}}/g, appConfig.name)
    .replace(/{{SUPPORT_EMAIL}}/g, appConfig.supportEmail)
    .replace(/{{COPYRIGHT_YEAR}}/g, String(appConfig.copyrightYear))

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await getResend().emails.send({
        from: appConfig.emailFrom,
        to,
        subject: `You're invited to ${clientName} Client Portal`,
        html
      })
      
      // Success!
      return
    } catch (error) {
      lastError = error as Error
      console.error(`Email send attempt ${attempt}/${retries} failed:`, error)
      
      // Wait before retrying (exponential backoff)
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
      }
    }
  }

  // All retries failed
  throw new Error(`Failed to send email after ${retries} attempts: ${lastError?.message}`)
}

export async function sendWelcomeEmail(
  to: string,
  clientName: string
): Promise<void> {
  try {
    await getResend().emails.send({
      from: appConfig.emailFrom,
      to,
      subject: `Welcome to ${appConfig.name} Client Portal`,
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
                    <td style="background: linear-gradient(135deg, ${appConfig.accentColor} 0%, #047857 100%); padding: 40px;">
                      <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">${appConfig.name}</h1>
                      <p style="margin: 8px 0 0; font-size: 14px; color: #d1fae5;">Project Management Portal</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #fafafa;">Welcome to Your Portal!</h2>
                      <p style="margin: 0 0 24px; font-size: 16px; color: #a1a1aa; line-height: 1.6;">
                        Your access to the <strong style="color: #fafafa;">${clientName}</strong> client portal is now active.
                      </p>
                      <p style="margin: 0 0 32px; font-size: 16px; color: #a1a1aa; line-height: 1.6;">
                        You can now view your projects, track progress, and collaborate with your team.
                      </p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="${appConfig.url}/portal" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, ${appConfig.accentColor} 0%, #047857 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px;">
                              Go to Portal →
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 32px 40px; background-color: #09090b; border-top: 1px solid #27272a;">
                      <p style="margin: 0; font-size: 14px; color: #71717a; text-align: center;">
                        Need help? Contact us at <a href="mailto:${appConfig.supportEmail}" style="color: ${appConfig.primaryColor}; text-decoration: none;">${appConfig.supportEmail}</a>
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
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    // Don't throw - welcome email is nice-to-have, not critical
  }
}
