# Deployment Guide

## 🚀 Vercel Deployment

### 1. Domain Configuration

Connect `app.z-flow.de` to your Vercel project:

1. In your domain registrar, add a CNAME record:
   ```
   Name: app
   Type: CNAME
   Value: cname.vercel-dns.com
   ```

2. In Vercel Dashboard:
   - Go to project Settings → Domains
   - Add domain: `app.z-flow.de`
   - Vercel will auto-provision SSL certificate

### 2. Environment Variables

Add these to Vercel (Settings → Environment Variables):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://gpsztpweqkqvalgsckdd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
RESEND_API_KEY=re_your_resend_api_key
NEXT_PUBLIC_APP_URL=https://app.z-flow.de
```

**Note:** Add these to all environments (Production, Preview, Development)

---

## 📧 Supabase Configuration

### 1. Authentication Settings

Go to Supabase Dashboard → Authentication → Providers → Email

**Enable Auto Confirm (Recommended):**
- ✅ **Enable email confirmations** → OFF (auto-confirm enabled)
- This allows invited users to sign up and immediately access the portal
- The invitation token itself validates their email address

**Why auto-confirm for client portal:**
- Users are invited (not self-registering)
- Invitation token provides email validation
- Better UX (immediate access after signup)
- No extra confirmation email step needed

### 2. URL Configuration

Go to Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://app.z-flow.de
```

**Redirect URLs (Add all of these):**
```
https://app.z-flow.de/portal
https://app.z-flow.de/portal/invite/*
https://app.z-flow.de/auth/callback
http://localhost:3000/portal
http://localhost:3000/portal/invite/*
http://localhost:3000/auth/callback
```

**Important:** The wildcard `*` allows dynamic invitation tokens to work.

### Email Templates

Update email templates in Supabase to use production URL:

1. Go to Authentication → Email Templates
2. Update all templates to use `https://app.z-flow.de`
3. Confirm email template (if enabled):
   ```
   {{ .ConfirmationURL }}
   ```
   Should redirect to: `https://app.z-flow.de/auth/callback`

---

## ✉️ Resend Email Service

### Setup

1. **Verify your domain** (already done for `send.z-flow.de`)
2. **Create API key** at https://resend.com/api-keys
3. **Add to Vercel** environment variables

### Sender Email

Using: `no-reply@send.z-flow.de`

Alternative options:
- `portal@send.z-flow.de`
- `team@send.z-flow.de`

All work since `send.z-flow.de` is already verified.

---

## ✅ Post-Deployment Checklist

- [ ] Domain `app.z-flow.de` is connected and SSL is active
- [ ] Environment variables are set in Vercel
- [ ] Supabase redirect URLs are configured
- [ ] Resend API key is working
- [ ] Test invitation email flow:
  - [ ] Create invitation
  - [ ] Receive email
  - [ ] Click invitation link
  - [ ] Sign up successfully
  - [ ] Access portal
- [ ] Test resend email functionality
- [ ] Verify welcome email after signup

---

## 🔧 Local Development

1. Copy `.env.local.example` to `.env.local`
2. Fill in your Supabase credentials
3. Add Resend API key
4. Run `npm run dev`
5. Test with `http://localhost:3000`

---

## 🐛 Troubleshooting

### Email not sending

1. Check Resend API key is correct in Vercel
2. Verify `send.z-flow.de` is verified in Resend dashboard
3. Check API route logs: Vercel Functions → Logs
4. Try resending from the UI (click refresh button)

### Invitation link doesn't work

1. Verify Supabase redirect URLs include `https://app.z-flow.de/portal/invite/*`
2. Check token hasn't expired (7 days)
3. Ensure invitation hasn't been accepted already

### "Invalid redirect URL" error

1. Go to Supabase → Authentication → URL Configuration
2. Add the exact URL showing in the error
3. Wait 1-2 minutes for cache to clear
4. Try again

---

## 📊 Monitoring

### Check email delivery

- Resend Dashboard: https://resend.com/emails
- Filter by status: delivered, bounced, failed

### Check API logs

- Vercel Dashboard → Functions → Logs
- Filter for `/api/invitations/send`

---

## 🔐 Security Notes

- Never commit `.env.local` to git
- Rotate API keys periodically
- Keep Supabase service key secure (not in client-side code)
- Monitor invitation email bounces
