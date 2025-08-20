export function getPasswordResetEmailTemplate(resetUrl: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - Imperial Trading</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #0a0a0a; color: #ffffff;">
      <div style="max-width: 600px; margin: 0 auto; background: #0a0a0a;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #c09a58, #e6d3b3); padding: 40px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #0a0a0a;">Imperial Trading</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; color: #333;">Elite Trading Community</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #c09a58; font-size: 24px; margin-bottom: 20px;">🔐 Password Reset Request</h2>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            We received a request to reset your Imperial Trading account password. If you made this request, click the button below to create a new password.
          </p>
          
          <!-- Alert Box -->
          <div style="background: #1a1a1a; border-left: 4px solid #c09a58; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #e6d3b3;">
              <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour for your security. If you didn't request this reset, you can safely ignore this email.
            </p>
          </div>
          
          <!-- Reset Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #c09a58; color: #0a0a0a; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
              Reset Your Password
            </a>
          </div>
          
          <!-- Alternative Link -->
          <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #c09a58; font-weight: bold;">
              Can't click the button? Copy and paste this link:
            </p>
            <p style="margin: 0; font-size: 12px; color: #e6d3b3; word-break: break-all; font-family: monospace; background: #0a0a0a; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>
          </div>
          
          <!-- Help Section -->
          <div style="border-top: 1px solid #333; padding-top: 20px; margin-top: 30px;">
            <p style="font-size: 14px; color: #888; margin-bottom: 10px;">
              Need help? Contact our support team:
            </p>
            <p style="font-size: 14px; color: #c09a58; margin: 0;">
              📧 support@tradeimperial.com
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1a1a1a; padding: 20px; text-align: center; border-top: 1px solid #333;">
          <p style="margin: 0; color: #888; font-size: 14px;">
            © ${new Date().getFullYear()} Imperial Trading. All rights reserved.
          </p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">
            This is an automated security email. Please do not reply to this address.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}