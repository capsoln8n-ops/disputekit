'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export function Header() {
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <header className="header">
      <div className="header-content">
        <Link href="/" className="logo">DisputeKit</Link>
        <nav className="nav">
          {user ? (
            <>
              <Link href="/dashboard" className="nav-link">Dashboard</Link>
              <button onClick={handleLogout} className="nav-link btn-link">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-link">Login</Link>
              <Link href="/signup" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}