'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings, Database, Zap } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-zinc-400">Manage your workspace preferences</p>
      </div>

      {/* General Settings */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-white">General</CardTitle>
          </div>
          <CardDescription className="text-zinc-400">
            Basic workspace configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Hourly Rate (€)</Label>
              <Input
                type="number"
                defaultValue="85"
                className="bg-zinc-900 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                defaultValue="EUR"
                className="bg-zinc-900 border-zinc-700"
                disabled
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input
              defaultValue="z-flow"
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Database Info */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-zinc-400" />
            <CardTitle className="text-white">Database</CardTitle>
          </div>
          <CardDescription className="text-zinc-400">
            Supabase connection information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-zinc-400">Status</Label>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-white">Connected</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Project ID</Label>
              <code className="text-sm text-zinc-300 bg-zinc-900 px-2 py-1 rounded">
                gpsztpweqkqvalgsckdd
              </code>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400">URL</Label>
            <code className="text-sm text-zinc-300 bg-zinc-900 px-2 py-1 rounded block">
              https://gpsztpweqkqvalgsckdd.supabase.co
            </code>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-white">z-flow Project Management</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-zinc-400">
            A lightweight project management system built for z-flow agency. 
            Track projects, clients, time, and tasks in one place.
          </p>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-zinc-600 text-zinc-400">
              Next.js 15
            </Badge>
            <Badge variant="outline" className="border-zinc-600 text-zinc-400">
              Supabase
            </Badge>
            <Badge variant="outline" className="border-zinc-600 text-zinc-400">
              React Query
            </Badge>
            <Badge variant="outline" className="border-zinc-600 text-zinc-400">
              Tailwind CSS
            </Badge>
          </div>
          <p className="text-xs text-zinc-500">
            Built with ❤️ by Mike (Clawdbot)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
