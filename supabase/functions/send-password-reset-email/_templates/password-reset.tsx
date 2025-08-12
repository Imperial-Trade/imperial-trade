import React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface PasswordResetEmailProps {
  supabase_url: string
  redirect_to: string
  token_hash: string
  token: string
  email_action_type: string
  brand_name?: string
  support_email?: string
  logo_url?: string
}

export const PasswordResetEmail = ({
  supabase_url,
  redirect_to,
  token_hash,
  token,
  email_action_type,
  brand_name = 'Trade Imperial',
  support_email = 'tradeimperial2025@gmail.com',
  logo_url = 'https://www.tradeimperial.com/logo.png',
}: PasswordResetEmailProps) => {
  const resetUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=recovery&redirect_to=${encodeURIComponent(
    redirect_to
  )}`

  return (
    <Html>
      <Head />
      <Preview>Reset your {brand_name} account password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            {logo_url ? (
              <img src={logo_url} alt={`${brand_name} logo`} style={logo as any} />
            ) : null}
            <Heading style={title}>{brand_name}</Heading>
            <Text style={subtitle}>Secure Password Reset</Text>
          </Section>

          <Section style={card}>
            <Heading as="h2" style={h2}>
              Reset your password
            </Heading>
            <Text style={text}>
              We received a request to reset your password. Follow the steps below to secure your account.
            </Text>

            <ol style={list as any}>
              <li>Click the button below to open the secure reset page.</li>
              <li>Create a strong new password (at least 12 characters, mix upper/lowercase letters, numbers, and symbols).</li>
              <li>Confirm your new password and submit.</li>
            </ol>

            <Link href={resetUrl} target="_blank" style={button}>
              Reset Password Securely
            </Link>

            <Text style={{ ...text, marginTop: 16 }}>
              If the button doesn’t work, copy and paste this link into your
              browser:
            </Text>
            <Link href={resetUrl} target="_blank" style={link}>
              {resetUrl}
            </Link>

            <Hr style={hr} />

            <Text style={footnote}>
              For your security, this link expires in 60 minutes. Do not share it with anyone.
              If you didn’t request a password reset, you can safely ignore this email.
            </Text>
          </Section>

          <Text style={footer}>
            Need help? Contact our support team at {support_email}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default PasswordResetEmail

// Styles – black/gold brand-inspired
const main = {
  backgroundColor: '#0b0b0c',
  padding: '24px 0',
}

const container = {
  width: '100%',
  maxWidth: '560px',
  margin: '0 auto',
  backgroundColor: '#111214',
  border: '1px solid #1f2023',
  borderRadius: '12px',
  overflow: 'hidden',
}

const header = {
  background: 'linear-gradient(135deg, #16171a 0%, #0f1012 100%)',
  padding: '28px 28px 12px 28px',
  textAlign: 'center' as const,
}

const title = {
  color: '#e5e7eb',
  fontSize: '22px',
  margin: 0,
  letterSpacing: '0.4px',
}

const subtitle = {
  color: '#c5b36b',
  fontSize: '13px',
  marginTop: '6px',
}

const logo = {
  display: 'block',
  margin: '0 auto 8px auto',
  width: '56px',
  height: '56px',
}

const card = {
  padding: '24px 28px 28px 28px',
}

const h2 = {
  color: '#f3f4f6',
  fontSize: '18px',
  margin: '0 0 12px 0',
}

const text = {
  color: '#d1d5db',
  fontSize: '14px',
  lineHeight: '22px',
}

const link = {
  color: '#d4af37',
  fontSize: '12px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
}

const list = {
  color: '#d1d5db',
  fontSize: '14px',
  lineHeight: '22px',
  paddingLeft: '18px',
  margin: '6px 0 6px 0',
}


const button = {
  display: 'inline-block',
  marginTop: '12px',
  backgroundColor: '#d4af37',
  color: '#111214',
  padding: '12px 16px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: 600,
}

const hr = {
  borderColor: '#1f2023',
  margin: '18px 0',
}

const footnote = {
  color: '#9ca3af',
  fontSize: '12px',
}

const footer = {
  color: '#6b7280',
  fontSize: '12px',
  textAlign: 'center' as const,
  padding: '0 0 18px 0',
}
