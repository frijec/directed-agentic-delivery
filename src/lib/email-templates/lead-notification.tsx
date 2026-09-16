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
  company?: string
  source?: string
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const label = { fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#8a7c74', margin: '16px 0 2px' }
const value = { fontSize: '15px', color: '#2b1d18', margin: '0' }
const heading = { fontSize: '20px', color: '#492A34', margin: '0 0 4px' }

const Email = ({ name, email, company, source }: Props) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>{`Ny playbook-anmodning fra ${name || 'ukendt'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Ny playbook-anmodning</Heading>
        <Text style={{ ...value, color: '#8a7c74', fontSize: '13px' }}>
          Directed Agentic Delivery — AI-playbook
        </Text>
        <Hr style={{ borderColor: '#eee3dd', margin: '20px 0' }} />
        <Section>
          <Text style={label}>Navn</Text>
          <Text style={value}>{name || '—'}</Text>
          <Text style={label}>E-mail</Text>
          <Text style={value}>{email || '—'}</Text>
          <Text style={label}>Virksomhed</Text>
          <Text style={value}>{company || '—'}</Text>
          <Text style={label}>Kom fra</Text>
          <Text style={value}>{source || '—'}</Text>
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
    `${data['name'] || 'En besøgende'}${data['company'] ? ` (${data['company']})` : ''} vil gerne have AI-playbooken`,
  displayName: 'AI-playbook — notifikation',
  previewData: {
    name: 'Mette Hansen',
    email: 'mette@example.com',
    company: 'Eksempel A/S',
    source: 'velformuleret-er-ikke-laengere-et-kvalitetstegn',
  },
  to: 'anders.bendtsen@consid.com',
} satisfies TemplateEntry
