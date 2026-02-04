'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects, useTimeStats, useClients } from '@/lib/hooks'
import { Clock, DollarSign, FolderKanban, TrendingUp } from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'

type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'all'

const dateRanges: Record<DateRange, { label: string; getRange: () => { start: string; end: string } }> = {
  week: {
    label: 'Last 7 Days',
    getRange: () => ({
      start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    })
  },
  month: {
    label: 'This Month',
    getRange: () => ({
      start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })
  },
  quarter: {
    label: 'Last 3 Months',
    getRange: () => ({
      start: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    })
  },
  year: {
    label: 'This Year',
    getRange: () => ({
      start: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    })
  },
  all: {
    label: 'All Time',
    getRange: () => ({ start: '', end: '' })
  }
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('month')
  
  const range = dateRanges[dateRange].getRange()
  
  const { data: projects } = useProjects()
  const { data: clients } = useClients()
  const { data: stats } = useTimeStats(
    range.start || undefined,
    range.end || undefined
  )

  // Project breakdown
  const activeProjects = projects?.filter(p => p.status === 'active').length || 0
  const completedProjects = projects?.filter(p => p.status === 'completed').length || 0
  const totalProjects = projects?.length || 0

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Reports</h1>
          <p className="text-sm md:text-base text-zinc-400">Track your business performance</p>
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-full sm:w-40 bg-zinc-800 border-zinc-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {Object.entries(dateRanges).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-zinc-400">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-blue-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-white">
              {stats?.totalHours.toFixed(1) || '0'}h
            </div>
            <p className="text-xs text-zinc-500 hidden sm:block">
              {stats?.entriesCount || 0} time entries
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-zinc-400">Billable Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-white">
              €{stats?.billableAmount.toFixed(0) || '0'}
            </div>
            <p className="text-xs text-zinc-500 hidden sm:block">
              {stats?.billableHours.toFixed(1) || '0'}h billable
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-zinc-400">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-orange-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-white">{activeProjects}</div>
            <p className="text-xs text-zinc-500 hidden sm:block">
              {completedProjects} completed, {totalProjects} total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-zinc-400">Billable Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500 hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-white">
              {stats?.totalHours ? ((stats.billableHours / stats.totalHours) * 100).toFixed(0) : 0}%
            </div>
            <p className="text-xs text-zinc-500 hidden sm:block">
              of time is billable
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projects & Clients Summary */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Projects by Status */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="p-3 md:p-4">
            <CardTitle className="text-white text-base md:text-lg">Projects by Status</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="space-y-3 md:space-y-4">
              {[
                { status: 'active', label: 'Active', color: 'bg-emerald-500' },
                { status: 'on_hold', label: 'On Hold', color: 'bg-yellow-500' },
                { status: 'completed', label: 'Completed', color: 'bg-blue-500' },
                { status: 'draft', label: 'Draft', color: 'bg-zinc-500' },
                { status: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
              ].map(({ status, label, color }) => {
                const count = projects?.filter(p => p.status === status).length || 0
                const percentage = totalProjects > 0 ? (count / totalProjects) * 100 : 0
                return (
                  <div key={status} className="space-y-1 md:space-y-2">
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-zinc-300">{label}</span>
                      <span className="text-zinc-400">{count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-1.5 md:h-2 rounded-full bg-zinc-700">
                      <div 
                        className={`h-1.5 md:h-2 rounded-full ${color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="p-3 md:p-4">
            <CardTitle className="text-white text-base md:text-lg">Clients Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            {!clients?.length ? (
              <p className="text-zinc-400 text-center py-8 text-sm">No clients yet</p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {clients.slice(0, 5).map((client) => {
                  const clientProjects = projects?.filter(p => p.client_id === client.id) || []
                  const activeCount = clientProjects.filter(p => p.status === 'active').length
                  return (
                    <div 
                      key={client.id}
                      className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-zinc-900"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm md:text-base truncate">{client.name}</p>
                        <p className="text-xs md:text-sm text-zinc-400">
                          {clientProjects.length} project{clientProjects.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {activeCount > 0 && (
                        <span className="text-xs md:text-sm text-emerald-500 flex-shrink-0 ml-2">
                          {activeCount} active
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Section */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="p-3 md:p-4">
          <CardTitle className="text-white text-base md:text-lg">Export Data</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-0">
          <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-700 text-sm w-full sm:w-auto"
              onClick={() => {
                alert('CSV export coming soon!')
              }}
            >
              Export Time Entries (CSV)
            </Button>
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-700 text-sm w-full sm:w-auto"
              onClick={() => {
                alert('Invoice generation coming soon!')
              }}
            >
              Generate Invoice
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
