import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useReport } from '@/hooks/useQueries'
import { cn } from '@/lib/utils'
import { AlertCircle, Download, DownloadCloud, Phone, Users, Target, TrendingUp, BarChart3 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/lib/api'
import { AnalyticsSkeleton } from '@/components/ui/PageSkeleton'

const periods = ['daily', 'weekly', 'monthly'] as const

export function Reports() {
  const [period, setPeriod] = useState<string>('daily')
  const { data: report, isPending, isError, error } = useReport(period)

  const handleDownload = useCallback(async () => {
    try {
      const token = localStorage.getItem('insforge_access_token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const API_URL = import.meta.env.VITE_API_URL
      const res = await fetch(`${API_URL}/reports/${period}?format=csv`, { headers })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error || 'Download failed')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${period}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Report downloaded')
    } catch (err: any) {
      toast.error(err.message || 'Failed to download report')
    }
  }, [period])

  if (isPending) {
    return <AnalyticsSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-amber-500/60" />
        <p className="text-lg font-medium">{error?.message || 'Failed to load report'}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <BarChart3 className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold">No report data yet</h2>
        <p className="text-muted-foreground text-sm max-w-md">Reports will appear here once you start making calls.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">Detailed reports on AI Employee performance and business outcomes.</p>
        </div>
        <Button onClick={handleDownload}>
          <DownloadCloud className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>

      <div className="flex gap-2">
        {periods.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              period === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {report.generatedAt && (
        <p className="text-xs text-muted-foreground">
          Generated: {new Date(report.generatedAt).toLocaleString()}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-sm">Calls</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">{report.calls.total}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span className="font-medium text-green-500">{report.calls.completed}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Failed</span><span className="font-medium text-red-500">{report.calls.failed}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">No Answer</span><span className="font-medium text-amber-500">{report.calls.noAnswer}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Avg Duration</span><span className="font-medium">{report.calls.avgDuration}s</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <CardTitle className="text-sm">Leads</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">{report.leads.total}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">New</span><span className="font-medium">{report.leads.new}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Interested</span><span className="font-medium text-green-500">{report.leads.interested}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Converted</span><span className="font-medium text-blue-500">{report.leads.converted}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Not Interested</span><span className="font-medium text-red-500">{report.leads.notInterested}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm">Campaigns</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">{report.campaigns.total}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span className="font-medium text-green-500">{report.campaigns.active}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Contacts</span><span className="font-medium">{report.campaigns.totalContacts}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Interested</span><span className="font-medium">{report.campaigns.totalInterested}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-500" />
              <CardTitle className="text-sm">Conversion Rate</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{report.conversionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Overall conversion rate</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
