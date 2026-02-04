# Email Templates

## Client Invitation Email

Professional HTML email template for inviting clients to the Z-Flow project portal.

### Template Variables

Replace these placeholders before sending:

- `{{CLIENT_NAME}}` - The client's company/organization name
- `{{CLIENT_EMAIL}}` - The email address of the recipient
- `{{INVITATION_LINK}}` - Full URL to the invitation acceptance page

### Example Usage

```javascript
const invitationEmail = fs.readFileSync('./client-invitation.html', 'utf8')
  .replace('{{CLIENT_NAME}}', clientName)
  .replace('{{CLIENT_EMAIL}}', clientEmail)
  .replace(/{{INVITATION_LINK}}/g, invitationUrl); // Replace all occurrences

// Send via your email service (SendGrid, Resend, AWS SES, etc.)
await sendEmail({
  to: clientEmail,
  subject: `You're invited to ${clientName} Client Portal`,
  html: invitationEmail
});
```

### Integration with Invitation Hook

You can integrate this with the `useCreateInvitation` hook:

```typescript
// In src/lib/hooks/use-client-portal.ts
export function useCreateInvitation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ clientId, email, role = 'viewer' }: { clientId: string; email: string; role?: 'viewer' | 'admin' }) => {
      const supabase = createClient()
      const token = generateToken()
      const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await supabase
        .from('client_invitations')
        .insert({ client_id: clientId, email, token, role, expires_at })
        .select()
        .single()
      
      if (error) throw error
      
      // Send email here
      const invitationUrl = `${window.location.origin}/portal/invite/${token}`
      await sendInvitationEmail(email, clientId, invitationUrl)
      
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client_invitations', data.client_id] })
    }
  })
}
```

### Features

✅ **Dark theme** matching Z-Flow brand (emerald green accent)  
✅ **Responsive design** works on all devices  
✅ **Professional layout** with clear call-to-action  
✅ **Feature highlights** explaining portal benefits  
✅ **Expiry warning** to encourage quick action  
✅ **Alternative link** for copy/paste if button doesn't work  
✅ **Footer help text** with contact information

### Email Service Recommendations

For production deployment, use:

1. **Resend** - Simple, developer-friendly, great for transactional emails
2. **SendGrid** - Enterprise-grade, reliable delivery
3. **AWS SES** - Cost-effective for high volume
4. **Postmark** - Fast, reliable transactional email

### Testing

Before going live, test the email template:
- Send test emails to multiple providers (Gmail, Outlook, Yahoo)
- Check rendering on mobile devices
- Verify all links work correctly
- Test expiry notice timing
