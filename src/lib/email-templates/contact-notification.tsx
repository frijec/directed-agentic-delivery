import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  email?: string
  phone?: string
  message?: string
  source?: string
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const label = { fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#8a7c74', margin: '16px 0 2px' }
const value = { fontSize: '15px', color: '#2b1d18', margin: '0', whiteSpace: 'pre-wrap' as const }
const heading = { fontSize: '20px', color: '#492A34', margin: '0 0 4px' }

const Email = ({ name, email, phone, message, source }: Props) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>{`Ny henvendelse fra ${name || 'ukendt'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Ny henvendelse</Heading>
        <Text style={{ ...value, color: '#8a7c74', fontSize: '13px' }}>
          Directed Agentic Delivery — kontaktformular
        </Text>
        <Hr style={{ borderColor: '#eee3dd', margin: '20px 0' }} />
        <Section>
          <Text style={label}>Navn</Text>
          <Text style={value}>{name || '—'}</Text>
          <Text style={label}>E-mail</Text>
          <Text style={value}>{email || '—'}</Text>
          <Text style={label}>Telefon</Text>
          <Text style={value}>{phone || '—'}</Text>
          <Text style={label}>Besked</Text>
          <Text style={value}>{message || '(ingen besked)'}</Text>
          <Text style={label}>Kilde</Text>
          <Text style={value}>{source || 'homepage'}</Text>
        </Section>
        <Hr style={{ borderColor: '#eee3dd', margin: '20px 0' }} />
        <Text style={{ ...value, fontSize: '13px', color: '#8a7c74' }}>
          Svar direkte på denne mail for at svare afsenderen.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `${data['name'] || 'En besøgende'} har skrevet til jer${data['company'] ? ` (${data['company']})` : ''}`,
  displayName: 'Kontaktformular — notifikation',
  previewData: {
    name: 'Jens Jensen',
    email: 'jens@example.com',
    phone: '+45 12 34 56 78',
    message: 'Vi vil gerne høre mere om Directed Agentic Delivery.',
    source: 'homepage',
  },
  to: 'anders.bendtsen@consid.com',
} satisfies TemplateEntry
