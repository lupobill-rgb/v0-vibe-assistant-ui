'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); return }
    if (data.session) {
      localStorage.setItem('sb-session', JSON.stringify(data.session))
    }
    router.push('/select-team')
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); return }
    if (data.session) {
      localStorage.setItem('sb-session', JSON.stringify(data.session))
      router.push('/select-team')
    } else {
      setMessage('Check your email for a confirmation link.')
    }
  }

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode)
    setError('')
    setMessage('')
    setConfirmPassword('')
  }

  const isSignup = mode === 'signup'

  return (
    <div style={{ background: '#020617', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={isSignup ? handleSignup : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '320px' }}>
        <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
          {isSignup ? 'Create your UbiVibe account' : 'Sign in to UbiVibe'}
        </h1>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
        {isSignup && (
          <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
        )}
        {error && <p style={{ color: '#ef4444' }}>{error}</p>}
        {message && <p style={{ color: '#22c55e' }}>{message}</p>}
        <button type="submit"
          style={{ padding: '12px', borderRadius: '8px', background: '#7c3aed', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
          {isSignup ? 'Sign Up' : 'Sign In'}
        </button>
        <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '14px' }}>
          {isSignup ? (
            <>Already have an account?{' '}
              <span onClick={() => switchMode('signin')} style={{ color: '#7c3aed', cursor: 'pointer' }}>Sign in</span>
            </>
          ) : (
            <>Don&apos;t have an account?{' '}
              <span onClick={() => switchMode('signup')} style={{ color: '#7c3aed', cursor: 'pointer' }}>Sign up</span>
            </>
          )}
        </p>
      </form>
    </div>
  )
}
