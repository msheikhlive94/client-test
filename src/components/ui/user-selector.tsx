'use client'

import { useAdminUsers } from '@/lib/hooks'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User } from 'lucide-react'

interface UserSelectorProps {
  value: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  className?: string
}

export function UserSelector({ 
  value, 
  onValueChange, 
  placeholder = "Select user...",
  className 
}: UserSelectorProps) {
  const { data: users, isLoading } = useAdminUsers()

  const handleValueChange = (newValue: string) => {
    // If "unassigned" is selected, pass null
    if (newValue === '__unassigned__') {
      onValueChange(null)
    } else {
      onValueChange(newValue)
    }
  }

  const displayValue = value || '__unassigned__'

  return (
    <Select value={displayValue} onValueChange={handleValueChange}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-zinc-500" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-zinc-800 border-zinc-700">
        <SelectItem value="__unassigned__" className="text-zinc-400">
          Unassigned
        </SelectItem>
        {isLoading ? (
          <SelectItem value="__loading__" disabled>
            Loading users...
          </SelectItem>
        ) : (
          users?.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name || user.email}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
