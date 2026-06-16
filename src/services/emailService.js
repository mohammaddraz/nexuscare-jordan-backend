const nodemailer = require('nodemailer');

/**
 * Email Service for SehaGrid Jordan
 * Uses Nodemailer with SMTP transport (Gmail, Outlook, or any SMTP provider)
 * 
 * In development mode, uses Ethereal (fake SMTP) so no real emails are sent.
 */

let transporter;

/**
 * Initialize the email transporter
 * Uses real SMTP in production, Ethereal (test) in development
 */
const initTransporter = async () => {
  if (process.env.NODE_ENV === 'production' && process.env.EMAIL_HOST) {
    // Production: use real SMTP credentials from .env
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    // Development: Mock transporter to prevent ETIMEDOUT crashes
    transporter = {
      sendMail: async (mailOptions) => {
        console.log(`[Mock Email] Sending to ${mailOptions.to}: ${mailOptions.subject}`);
        return { messageId: 'mock-id' };
      }
    };
    console.log(`📧 Mock Email Transporter Initialized`);
  }
};

// Initialize on module load
initTransporter().catch(e => console.error('Email Init Error:', e.message));

/**
 * Send a Welcome Email after consumer registration is approved
 */
const sendWelcomeEmail = async (toEmail, consumerName, planType) => {
  if (!transporter) await initTransporter();

  const info = await transporter.sendMail({
    from: '"SehaGrid Jordan" <noreply@sehagrid.jo>',
    to: toEmail,
    subject: '🎉 Welcome to SehaGrid Jordan — Your Account is Approved!',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h1 style="color: #131b2e;">Welcome, ${consumerName}!</h1>
        <p style="color: #64748b; font-size: 15px;">
          Your SehaGrid Jordan account has been <strong style="color: #10b981;">approved</strong> by the Ministry of Health.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #334155; font-size: 14px;"><strong>Plan:</strong> ${planType}</p>
        <p style="color: #334155; font-size: 14px;">You can now log in, assign a Primary Care Provider for your family, and manage your coverage.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
           style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #131b2e; color: #34d399; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Log in to SehaGrid
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
          Ministry of Health — Kingdom of Jordan
        </p>
      </div>
    `,
  });

  console.log(`📧 Welcome email sent to ${toEmail} — Preview: ${nodemailer.getTestMessageUrl(info) || 'N/A'}`);
  return info;
};

/**
 * Send PCP Assignment Status Update Email
 */
const sendPCPStatusEmail = async (toEmail, patientName, providerName, status) => {
  if (!transporter) await initTransporter();

  const statusColor = status === 'Approved' ? '#10b981' : '#ef4444';
  const statusEmoji = status === 'Approved' ? '✅' : '❌';

  const info = await transporter.sendMail({
    from: '"SehaGrid Jordan" <noreply@sehagrid.jo>',
    to: toEmail,
    subject: `${statusEmoji} PCP Assignment ${status} — SehaGrid Jordan`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #131b2e;">PCP Assignment Update</h2>
        <p style="color: #64748b; font-size: 15px;">
          The PCP assignment for <strong>${patientName}</strong> has been 
          <strong style="color: ${statusColor};">${status}</strong>.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #334155; font-size: 14px;"><strong>Provider:</strong> ${providerName}</p>
        <p style="color: #334155; font-size: 14px;"><strong>Status:</strong> ${status}</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/consumer/family-hub" 
           style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #131b2e; color: #34d399; text-decoration: none; border-radius: 8px; font-weight: 600;">
          View in Family Hub
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
          Ministry of Health — Kingdom of Jordan
        </p>
      </div>
    `,
  });

  console.log(`📧 PCP status email sent to ${toEmail} — Preview: ${nodemailer.getTestMessageUrl(info) || 'N/A'}`);
  return info;
};

module.exports = {
  sendWelcomeEmail,
  sendPCPStatusEmail,
};
