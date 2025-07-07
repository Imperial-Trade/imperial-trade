
import React, { useEffect } from 'react';
import { SendEmail } from '@/api/integrations';

export const sendWelcomeEmail = async (user, isFirstLogin = false) => {
  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    
    // Determine login method based on sessionStorage or user data patterns
    let loginMethod = null;
    if (typeof window !== 'undefined' && window.sessionStorage) {
        loginMethod = sessionStorage.getItem('loginMethod');
    }
    
    let loginMethodText = 'Google Social Login'; // Default value
    
    if (loginMethod === 'email') {
      loginMethodText = 'Email & Password';
    } else if (loginMethod === 'google') {
      loginMethodText = 'Google Social Login';
    }
    
    await SendEmail({
      to: user.email,
      subject: isFirstLogin ? "🎉 Welcome to Imperial Trading Community!" : "✅ Login Confirmation - Imperial Trading",
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <div style="display: inline-flex; align-items: center; gap: 15px;">
              <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #fbbf24; font-size: 24px;">👑</span>
              </div>
              <div>
                <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">IMPERIAL</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">Trading Community</p>
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px 30px; background: white; border-radius: 0 0 10px 10px;">
            <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 24px;">
              ${isFirstLogin ? `Welcome ${user.full_name || 'Trader'}! 🚀` : `Login Confirmed ✅`}
            </h2>
            
            <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
              ${isFirstLogin ? 
                `Congratulations! Your Imperial Trading account has been successfully created using ${loginMethodText}.` : 
                'You have successfully logged into your Imperial Trading account.'
              }
            </p>

            <!-- Account Details Box -->
            <div style="background: #f3f4f6; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
              <h3 style="color: #111827; margin: 0 0 15px 0; font-size: 18px;">📋 Your Account Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500; width: 35%;">Display Name:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600;">${user.full_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Email:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600;">${user.email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Login Method:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600;">${loginMethodText}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Access Level:</td>
                  <td style="padding: 8px 0;">
                    <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                      MEMBER
                    </span>
                  </td>
                </tr>
              </table>
              <p style="color: #6b7280; font-size: 12px; margin: 15px 0 0 0;">
                ${loginMethod === 'google' ? 
                  'Your name was automatically set from your Google account. You can change this anytime in <strong>Account Settings</strong>.' :
                  'Your account information can be updated anytime in <strong>Account Settings</strong>.'
                }
              </p>
            </div>

            <!-- Login Instructions -->
            <div style="background: #eff6ff; border: 1px solid #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;">🔐 How to Login Next Time:</h4>
              <ol style="color: #374151; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>Visit our website at <a href="${baseUrl}" style="color: #10b981; text-decoration: none;">${baseUrl}</a></li>
                <li>Click "Sign In" button</li>
                ${loginMethod === 'google' ? `
                <li>Choose "Continue with Google"</li>
                <li>Use this email: <strong>${user.email}</strong></li>
                <li>You'll be automatically logged in through Google</li>
                ` : `
                <li>Enter your email and password</li>
                <li>Or use "Continue with Google" for faster access</li>
                `}
              </ol>
              ${loginMethod === 'google' ? `
              <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">
                <strong>Note:</strong> No password needed - we use secure Google authentication for your safety.
              </p>
              ` : ''}
            </div>

            ${isFirstLogin ? `
            <!-- Features Access -->
            <h3 style="color: #111827; margin: 30px 0 15px 0;">🎯 What You Can Access Now:</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 3px solid #10b981;">
                <div style="color: #15803d; font-weight: 600; margin-bottom: 5px;">📚 Education</div>
                <div style="color: #374151; font-size: 14px;">500+ trading videos</div>
              </div>
              <div style="background: #fefce8; padding: 15px; border-radius: 8px; border-left: 3px solid #eab308;">
                <div style="color: #a16207; font-weight: 600; margin-bottom: 5px;">📈 Live Signals</div>
                <div style="color: #374151; font-size: 14px;">Real-time alerts</div>
              </div>
              <div style="background: #fdf2f8; padding: 15px; border-radius: 8px; border-left: 3px solid #ec4899;">
                <div style="color: #be185d; font-weight: 600; margin-bottom: 5px;">📺 Live Sessions</div>
                <div style="color: #374151; font-size: 14px;">Expert-led trading</div>
              </div>
              <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 3px solid #0ea5e9;">
                <div style="color: #0369a1; font-weight: 600; margin-bottom: 5px;">🤖 Athena AI</div>
                <div style="color: #374151; font-size: 14px;">Trading assistant</div>
              </div>
            </div>
            ` : ''}

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}" 
                 style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                ${isFirstLogin ? '🚀 Start Your Trading Journey' : '📈 Continue Trading'}
              </a>
            </div>

            <!-- Support -->
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                Need help? Email us at <a href="mailto:support@imperial-trading.com" style="color: #10b981;">support@imperial-trading.com</a><br>
                or visit our Community Forum for peer support.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">
              © 2024 Imperial Trading Community. All rights reserved.<br>
              This email was sent because you created an account or logged in.
            </p>
          </div>
        </div>
      `
    });
    console.log('Welcome email sent successfully to:', user.email);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
};

export const sendApprovalEmail = async (request) => {
  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    await SendEmail({
      to: request.email,
      subject: "✅ Your Imperial Trading Account Request is Approved!",
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎉 Approved!</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #111827;">Welcome, ${request.full_name}!</h2>
            <p style="color: #374151; line-height: 1.6;">
              Your request for a <strong>${request.account_type.toUpperCase()}</strong> account has been approved by an administrator. 
              You should receive a separate invitation email shortly to complete your registration.
            </p>
            <p style="color: #374151; line-height: 1.6;">
              Once you accept the invitation, you can log in using the button below.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px;">
                Login to Imperial Trading
              </a>
            </div>
            <p style="color: #6b7280; font-size: 12px; text-align: center;">
              If you don't receive an invitation email within an hour, please contact support.
            </p>
          </div>
        </div>
      `,
    });
    console.log('Approval email sent successfully to:', request.email);
  } catch (error) {
    console.error('Failed to send approval email:', error);
  }
};

export const sendRejectionEmail = async (request) => {
  try {
    await SendEmail({
      to: request.email,
      subject: "❌ Regarding Your Imperial Trading Account Request",
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Request Update</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #111827;">Hello ${request.full_name},</h2>
            <p style="color: #374151; line-height: 1.6;">
              Thank you for your interest in Imperial Trading Community. After reviewing your request, we are unable to grant access at this time.
            </p>
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
              <h4 style="color: #991b1b; margin: 0 0 10px 0;">Reason for Rejection:</h4>
              <p style="color: #374151;">${request.rejection_reason || 'No reason provided.'}</p>
            </div>
            <p style="color: #6b7280; font-size: 12px;">
              If you believe this is a mistake or have additional information to provide, please contact our support team.
            </p>
          </div>
        </div>
      `,
    });
    console.log('Rejection email sent successfully to:', request.email);
  } catch (error) {
    console.error('Failed to send rejection email:', error);
  }
};

export const sendSecurityNotification = async (user, loginDetails) => {
  try {
    await SendEmail({
      to: user.email,
      subject: "🔐 Imperial Trading - Login Security Alert",
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f59e0b; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🔐 Security Alert</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #111827;">New Login Detected</h2>
            <p style="color: #374151;">
              A new login was detected on your Imperial Trading account:
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Method:</strong> Google Social Login</p>
              <p><strong>IP Address:</strong> ${loginDetails.ip || 'Hidden for privacy'}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              If this wasn't you, please contact our support team immediately at support@imperial-trading.com
            </p>
          </div>
        </div>
      `
    });
    console.log('Security notification email sent successfully to:', user.email);
  } catch (error) {
    console.error('Failed to send security notification:', error);
  }
};

export default function AuthNotifications() {
  return null; // This is a utility component
}
