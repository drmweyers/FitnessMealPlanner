# Email Service Setup with Resend

This guide explains how to set up email notifications for customer invitations using Resend.

## Prerequisites

- A Resend account (free tier available)
- Domain verification (optional but recommended)

## Setup Steps

### 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get API Key

1. Log into your Resend dashboard
2. Navigate to **API Keys** section
3. Click **Create API Key**
4. Give it a name like "FitnessMealPlanner"
5. Select appropriate permissions (Send emails)
6. Copy the generated API key

### 3. Configure Environment Variables

Add these to your `.env` file:

```bash
# Email Configuration (Resend)
RESEND_API_KEY=re_your_actual_api_key_here
FROM_EMAIL=FitnessMealPlanner <noreply@yourdomain.com>
```

**Important Notes:**
- Replace `your_actual_api_key_here` with your real API key
- Replace `yourdomain.com` with your actual domain
- Without domain verification, you can only send FROM resend.dev addresses

### 4. Domain Verification (Recommended)

For production use, verify your domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `fitnessmealplanner.com`)
4. Add the required DNS records to your domain provider
5. Wait for verification (usually 24-48 hours)

### 5. Testing

To test email functionality:

1. Start your development server: `npm run dev`
2. Use the test endpoint:

```bash
curl -X POST http://localhost:4000/api/invitations/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"email": "your-test-email@example.com"}'
```

## Free Tier Limits

Resend free tier includes:
- **3,000 emails per month**
- **100 emails per day**
- Basic analytics
- Email templates

## Email Templates

The system includes:
- ✅ **HTML template** - Rich formatting with styling
- ✅ **Plain text fallback** - For email clients that don't support HTML
- ✅ **Responsive design** - Works on mobile and desktop
- ✅ **Professional branding** - FitnessMealPlanner branded

## Features Included

### Customer Invitation Emails
When a trainer invites a customer:
- ✅ Professional welcome email
- ✅ Trainer information included
- ✅ Clear call-to-action button
- ✅ Expiration date warning
- ✅ Fallback link for accessibility

### Development Features
- ✅ Test email endpoint for admins
- ✅ Development-only invitation link in response
- ✅ Console logging for debugging
- ✅ Graceful fallback if email service unavailable

## Security Considerations

- 🔒 API key stored in environment variables (not in code)
- 🔒 Production email links don't include invitation link in API response
- 🔒 Email service errors don't expose sensitive information
- 🔒 Test endpoint only available in development mode

## Troubleshooting

### Common Issues

1. **"Email service not configured" error**
   - Check that `RESEND_API_KEY` is set in `.env`
   - Restart your server after updating environment variables

2. **"Authentication failed" error**
   - Verify your API key is correct
   - Check if the API key has proper permissions

3. **Emails going to spam**
   - Set up domain verification
   - Configure SPF/DKIM records
   - Use a professional FROM address

4. **Rate limiting errors**
   - Check your daily/monthly limits in Resend dashboard
   - Consider upgrading if needed

### Debug Steps

1. Check server logs for email sending errors
2. Use the test email endpoint to verify basic functionality
3. Check Resend dashboard for delivery status
4. Verify DNS records if using custom domain

## Production Deployment

For production:

1. ✅ Set up domain verification
2. ✅ Configure proper DNS records (SPF, DKIM)
3. ✅ Use environment variables for all credentials
4. ✅ Monitor email delivery rates
5. ✅ Set up bounce/complaint handling

## Support

- Resend Documentation: [resend.com/docs](https://resend.com/docs)
- Email best practices: [resend.com/best-practices](https://resend.com/best-practices)
- This project's email service: `server/services/emailService.ts`