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
  company?: string
  role?: string
  orgSize?: string
  email?: string
  currentAiUsage?: string
  biggestChallenge?: string
  conversationValue?: string
  andelNiveau?: number
  strukturNiveau?: number
  samletNiveau?: number
  average?: number
  limitingDimension?: string | null
}

const LEVEL_LABELS = ['Værktøjsbruger', 'Assisteret', 'Forstærket', 'Autonom']

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const label = {
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: '#8a7c74',
  margin: '16px 0 2px',
}
const value = { fontSize: '15px', color: '#2b1d18', margin: '0' }
const heading = { fontSize: '20px', color: '#492A34', margin: '0 0 4px' }
const multiline = { ...value, whiteSpace: 'pre-wrap' as const }

function levelLabel(level?: number) {
  return typeof level === 'number' && LEVEL_LABELS[level] ? `Niveau ${level} — ${LEVEL_LABELS[level]}` : '—'
}

const Email = ({
  company,
  role,
  orgSize,
  email,
  currentAiUsage,
  biggestChallenge,
  conversationValue,
  andelNiveau,
  strukturNiveau,
  samletNiveau,
  average,
  limitingDimension,
}: Props) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>{`Niveau-tjek: ${levelLabel(samletNiveau)}${company ? ` — ${company}` : ''}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Ny besvarelse af Niveau-tjek</Heading>
        <Text style={{ ...value, color: '#8a7c74', fontSize: '13px' }}>
          Directed Agentic Delivery — Niveau-tjek
        </Text>
        <Hr style={{ borderColor: '#eee3dd', margin: '20px 0' }} />
        <Section>
          <Text style={label}>Samlet niveau</Text>
          <Text style={value}>{levelLabel(samletNiveau)}</Text>
          <Text style={label}>Andel / struktur</Text>
          <Text style={value}>
            Niveau {andelNiveau ?? '—'} / Niveau {strukturNiveau ?? '—'}
            {typeof average === 'number' ? ` · Gennemsnit ${average.toFixed(2)} af 3` : ''}
          </Text>
          {limitingDimension && (
            <>
              <Text style={label}>Begrænsning lige nu</Text>
              <Text style={value}>{limitingDimension}</Text>
            </>
          )}
        </Section>
        <Hr style={{ borderColor: '#eee3dd', margin: '20px 0' }} />
        <Section>
          <Text style={label}>Firma</Text>
          <Text style={value}>{company || '—'}</Text>
          <Text style={label}>Rolle</Text>
          <Text style={value}>{role || '—'}</Text>
          <Text style={label}>Org.størrelse</Text>
          <Text style={value}>{orgSize || '—'}</Text>
          <Text style={label}>E-mail</Text>
          <Text style={value}>{email || '—'}</Text>
        </Section>
        <Hr style={{ borderColor: '#eee3dd', margin: '20px 0' }} />
        <Section>
          <Text style={label}>Nuværende brug af AI-udviklingsværktøjer</Text>
          <Text style={multiline}>{currentAiUsage || '—'}</Text>
          <Text style={label}>Største udfordring</Text>
          <Text style={multiline}>{biggestChallenge || '—'}</Text>
          <Text style={label}>Hvad ville gøre en samtale værdifuld</Text>
          <Text style={multiline}>{conversationValue || '—'}</Text>
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
    `Niveau-tjek: ${levelLabel(data['samletNiveau'])}${data['company'] ? ` — ${data['company']}` : ''}`,
  displayName: 'Niveau-tjek — notifikation',
  previewData: {
    company: 'Eksempel A/S',
    role: 'CTO',
    orgSize: '50-150',
    email: 'mette@example.com',
    currentAiUsage: 'Et par teams bruger Copilot og Cursor ad hoc.',
    biggestChallenge: 'Ingen fælles specifikationsdisciplin på tværs af teams.',
    conversationValue: 'Konkret plan for at komme fra Niveau 1 til Niveau 2.',
    andelNiveau: 1,
    strukturNiveau: 1,
    samletNiveau: 1,
    average: 1.17,
    limitingDimension: 'Arkitekturbeslutninger',
  },
  to: 'anders.bendtsen@consid.com',
} satisfies TemplateEntry
