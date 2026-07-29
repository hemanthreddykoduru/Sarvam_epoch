import type { Contact, Call, Campaign } from '@/types'

function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function escapeCSV(value: string | number | undefined | null): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportContactsToCSV(contacts: Contact[]) {
  const headers = ['Name', 'Phone', 'Status', 'Attempts', 'Last Called', 'Created At']
  const rows = contacts.map(c => [
    escapeCSV(c.name),
    escapeCSV(c.phone),
    escapeCSV(c.status),
    escapeCSV(c.call_attempts),
    escapeCSV(c.last_called_at),
    escapeCSV(c.created_at),
  ].join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  downloadCSV(`contacts-${Date.now()}.csv`, csv)
}

export function exportCallsToCSV(calls: Call[]) {
  const headers = ['Contact', 'Phone', 'Campaign', 'Status', 'Duration (s)', 'Direction', 'Started At', 'Created At']
  const rows = calls.map(c => [
    escapeCSV(c.contact?.name),
    escapeCSV(c.contact?.phone),
    escapeCSV(c.campaign?.name),
    escapeCSV(c.status),
    escapeCSV(c.duration_seconds),
    escapeCSV(c.direction),
    escapeCSV(c.started_at),
    escapeCSV(c.created_at),
  ].join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  downloadCSV(`calls-${Date.now()}.csv`, csv)
}

export function exportCampaignReport(
  campaign: Campaign,
  contacts: Contact[],
  calls: Call[]
) {
  const completedCalls = calls.filter(c => c.status === 'completed')
  const failedCalls = calls.filter(c => c.status === 'failed')
  const avgDuration = completedCalls.length > 0
    ? Math.round(completedCalls.reduce((sum, c) => sum + c.duration_seconds, 0) / completedCalls.length)
    : 0

  const lines = [
    `Campaign Report: ${campaign.name}`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    '--- Summary ---',
    `Status,${campaign.status}`,
    `Total Contacts,${campaign.total_contacts}`,
    `Called,${campaign.called_count}`,
    `Connected,${campaign.connected_count}`,
    `Interested,${campaign.interested_count}`,
    `Total Calls,${calls.length}`,
    `Completed,${completedCalls.length}`,
    `Failed,${failedCalls.length}`,
    `Avg Duration (s),${avgDuration}`,
    '',
    '--- Contacts ---',
    'Name,Phone,Status,Attempts',
    ...contacts.map(c => [
      escapeCSV(c.name),
      escapeCSV(c.phone),
      escapeCSV(c.status),
      escapeCSV(c.call_attempts),
    ].join(',')),
    '',
    '--- Calls ---',
    'Contact,Phone,Status,Duration (s),Date',
    ...calls.map(c => [
      escapeCSV(c.contact?.name),
      escapeCSV(c.contact?.phone),
      escapeCSV(c.status),
      escapeCSV(c.duration_seconds),
      escapeCSV(c.created_at),
    ].join(',')),
  ]

  downloadCSV(`campaign-${campaign.name.replace(/\s+/g, '-').toLowerCase()}-report-${Date.now()}.csv`, lines.join('\n'))
}
