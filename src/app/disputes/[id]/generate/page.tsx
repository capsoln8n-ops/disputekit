'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function GenerateResponse() {
  const [dispute, setDispute] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [response, setResponse] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    async function loadDispute() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        router.push('/dashboard')
        return
      }

      setDispute(data)
      setLoading(false)
    }

    loadDispute()
  }, [params.id, router, supabase])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispute })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate')
      }

      setResponse(data.response)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!response.trim()) return

    setSaving(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('evidence')
        .insert({
          dispute_id: dispute.id,
          user_id: user.id,
          content: response
        })

      if (error) throw error

      setSuccess('Response saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitToStripe = async () => {
    if (!response.trim()) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/disputes/${dispute.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit')
      }

      setSuccess('Response submitted to Stripe!')
      setTimeout(() => {
        router.push(`/disputes/${dispute.id}`)
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>
        Loading...
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '900px' }}>
      <Link href={`/disputes/${dispute.id}`} style={{ color: 'var(--color-text-muted)', display: 'inline-block', marginBottom: '1rem' }}>
        ← Back to Dispute
      </Link>

      <h1 style={{ marginBottom: '0.5rem' }}>Generate Response</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Let AI help you craft a winning dispute response
      </p>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem' }}>Dispute: {dispute.reason?.replace(/_/g, ' ')}</h3>
            <span style={{ color: 'var(--color-text-muted)' }}>
              ${(dispute.amount / 100).toFixed(2)} • {dispute.charge_id}
            </span>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn btn-primary"
          >
            {generating ? 'Generating...' : 'Generate AI Response'}
          </button>
        </div>
      </div>

      {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}
      {success && <p className="success" style={{ marginBottom: '1rem' }}>{success}</p>}

      {response && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Generated Response</h3>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            className="form-input"
            rows={15}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-secondary"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handleSubmitToStripe}
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? 'Submitting...' : 'Submit to Stripe'}
            </button>
          </div>
        </div>
      )}

      {!response && !generating && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          Click "Generate AI Response" to create a compelling response for this dispute.
        </div>
      )}
    </div>
  )
}