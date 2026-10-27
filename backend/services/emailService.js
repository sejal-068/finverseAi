const { Resend } = require('resend');
const nodemailer = require('nodemailer');

/**
 * Checks whether an actual email provider is configured via environment variables.
 * Supports:
 *   1. Resend (RESEND_API_KEY)
 *   2. SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS)
 *
 * NOTE: Ethereal and fake/ephemeral test email fallbacks have been completely removed.
 */
function isEmailConfigured() {
  const hasResend = !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim());
  const hasSmtp = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_HOST.trim() &&
    process.env.SMTP_USER.trim() &&
    process.env.SMTP_PASS.trim()
  );

  return hasResend || hasSmtp;
}

/**
 * Returns which active email provider is configured.
 * Supports EMAIL_PROVIDER env var ('resend' or 'smtp') to override auto-selection.
 */
function getActiveProvider() {
  const providerChoice = (process.env.EMAIL_PROVIDER || '').toLowerCase().trim();
  const hasResend = !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim());
  const hasSmtp = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_HOST.trim() &&
    process.env.SMTP_USER.trim() &&
    process.env.SMTP_PASS.trim()
  );

  if (providerChoice === 'smtp' && hasSmtp) return 'smtp';
  if (providerChoice === 'resend' && hasResend) return 'resend';

  if (hasResend) return 'resend';
  if (hasSmtp) return 'smtp';

  return 'none';
}

/**
 * Builds the branded HTML email template for password reset.
 */
function buildPasswordResetHtml({ displayName, resetUrl }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - FinverseAI</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0B0F19;
      color: #E2E8F0;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 580px;
      margin: 40px auto;
      background: #111827;
      border: 1px solid #1E293B;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .email-header {
      background: linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%);
      padding: 32px 40px;
      text-align: center;
      border-bottom: 1px solid #1E293B;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-title span {
      color: #10B981;
    }
    .email-body {
      padding: 36px 40px;
      color: #94A3B8;
      font-size: 15px;
      line-height: 1.6;
    }
    .email-body h2 {
      color: #F8FAFC;
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn-reset {
      display: inline-block;
      background: #10B981;
      color: #FFFFFF !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 700;
      padding: 14px 32px;
      border-radius: 8px;
      letter-spacing: 0.2px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
    }
    .expiry-note {
      background: rgba(245, 158, 11, 0.1);
      border-left: 4px solid #F59E0B;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 13px;
      color: #FBBF24;
      margin: 24px 0;
    }
    .link-fallback {
      font-size: 12px;
      color: #64748B;
      word-break: break-all;
      margin-top: 20px;
    }
    .link-fallback a {
      color: #38BDF8;
    }
    .email-footer {
      background: #0B0F19;
      padding: 24px 40px;
      text-align: center;
      font-size: 12px;
      color: #64748B;
      border-top: 1px solid #1E293B;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1 class="brand-title">Finverse<span>AI</span></h1>
    </div>
    <div class="email-body">
      <h2>Reset Your Password</h2>
      <p>Hello ${displayName},</p>
      <p>You requested a password reset for your FinverseAI account. Click the button below to choose a new password:</p>
      
      <div class="button-container">
        <a href="${resetUrl}" target="_blank" class="btn-reset">Reset Password</a>
      </div>

      <div class="expiry-note">
        ⏱️ <strong>Security Notice:</strong> This password reset link is valid for <strong>15 minutes</strong> and can only be used once.
      </div>

      <p>If you did not request this, you can safely ignore this email. Your password will remain unchanged.</p>

      <div class="link-fallback">
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <a href="${resetUrl}">${resetUrl}</a>
      </div>
    </div>
    <div class="email-footer">
      &copy; ${new Date().getFullYear()} FinverseAI Financial Intelligence. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Builds the plain text fallback for the password reset email.
 */
function buildPasswordResetText({ displayName, resetUrl }) {
  return `
Hello ${displayName},

You requested a password reset for your FinverseAI account.
Use the link below to set a new password:

${resetUrl}

This link is valid for 15 minutes and can only be used once.

If you did not request this password reset, please ignore this email.
- The FinverseAI Team
  `;
}

/**
 * Send real Password Reset Email using the configured provider (Resend or SMTP).
 * Throws a clear error if no email provider is configured in environment variables.
 *
 * @param {Object} options - { to, name, resetUrl }
 */
async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const provider = getActiveProvider();

  if (provider === 'none') {
    console.error('❌ [EmailService] Email service is not configured.');
    throw new Error('Email service is not configured. Please set RESEND_API_KEY or SMTP credentials in .env.');
  }

  const displayName = name ? name.split(' ')[0] : 'Finverse User';
  const subject = 'FinverseAI - Reset Your Password';
  const html = buildPasswordResetHtml({ displayName, resetUrl });
  const text = buildPasswordResetText({ displayName, resetUrl });

  // 1. Resend API
  if (provider === 'resend') {
    const resend = new Resend(process.env.RESEND_API_KEY.trim());
    // Resend free tier sends from 'onboarding@resend.dev' if custom domain is not yet verified
    let fromAddress = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'FinverseAI <onboarding@resend.dev>';

    let resendResponse = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject,
      html,
      text,
    });

    if (resendResponse.error) {
      // If custom domain is unverified, fallback to onboarding@resend.dev
      if (
        resendResponse.error.message &&
        resendResponse.error.message.includes('domain is not verified') &&
        fromAddress !== 'FinverseAI <onboarding@resend.dev>'
      ) {
        console.warn('⚠️ [EmailService] Custom domain unverified on Resend. Falling back to onboarding@resend.dev');
        resendResponse = await resend.emails.send({
          from: 'FinverseAI <onboarding@resend.dev>',
          to: [to],
          subject,
          html,
          text,
        });
      }
    }

    if (resendResponse.error) {
      console.error('❌ [EmailService] Resend API error:', resendResponse.error.message || resendResponse.error);
      throw new Error(`Resend email delivery failed: ${resendResponse.error.message || 'API error'}`);
    }

    console.log(`📧 [EmailService] Password reset email sent via Resend to: ${to} (ID: ${resendResponse.data?.id})`);
    return {
      success: true,
      provider: 'resend',
      messageId: resendResponse.data?.id,
    };
  }

  // 2. SMTP (Gmail SMTP, Brevo, Sendgrid SMTP, etc.)
  if (provider === 'smtp') {
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST.trim(),
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: process.env.SMTP_USER.trim(),
        pass: process.env.SMTP_PASS.trim(),
      },
    });

    const fromAddress = process.env.EMAIL_FROM || `"${process.env.FROM_NAME || 'FinverseAI'}" <${process.env.SMTP_USER.trim()}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });

    console.log(`📧 [EmailService] Password reset email sent via SMTP to: ${to} (MessageID: ${info.messageId})`);
    return {
      success: true,
      provider: 'smtp',
      messageId: info.messageId,
    };
  }
}

module.exports = {
  isEmailConfigured,
  getActiveProvider,
  sendPasswordResetEmail,
};
