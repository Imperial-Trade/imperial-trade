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
}

export const PasswordResetEmail = ({
  supabase_url,
  redirect_to,
  token_hash,
  token,
  email_action_type,
  brand_name = 'Imperial Trading',
  support_email = 'support@tradeimperial.com',
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
            <Heading style={title}>{brand_name}</Heading>
            <Text style={subtitle}>Secure Password Reset</Text>
          </Section>

          <Section style={card}>
            <Heading as="h2" style={h2}>
              Reset your password
            </Heading>
            <Text style={text}>
              We received a request to reset your password. Click the button
              below to choose a new password.
            </Text>

            <Link href={resetUrl} target="_blank" style={button}>
              Reset Password
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
              This link will expire shortly for security. If you didn’t request
              a password reset, you can safely ignore this email.
            </Text>
          </Section>

          <Text style={footer}>
            Need help? Contact us at {support_email}
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
