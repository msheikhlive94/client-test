'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'

export type ThemeMode = 'dark' | 'light' | 'system'

interface ThemeContextValue {
  mode: ThemeMode
  resolvedTheme: 'dark' | 'light'
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'taskflow-theme-mode'

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'dark' | 'light') {
  const root = document.documentElement
  root.classList.add('theme-transition')
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  // Remove transition class after animation completes
  setTimeout(() => root.classList.remove('theme-transition'), 350)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark')
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')

  // Initialize from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    const initialMode = stored || 'dark'
    setModeState(initialMode)
    const resolved = initialMode === 'system' ? getSystemTheme() : initialMode
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [])

  // Listen for system theme changes
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (mode === 'system') {
        const resolved = getSystemTheme()
        setResolvedTheme(resolved)
        applyTheme(resolved)
      }
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [mode])

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem(STORAGE_KEY, newMode)
    const resolved = newMode === 'system' ? getSystemTheme() : newMode
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }, [])

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return { mode: 'dark', resolvedTheme: 'dark', setMode: () => {} }
  }
  return ctx
}
