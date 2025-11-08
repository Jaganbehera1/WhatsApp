'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface SignupFormProps {
  onSwitchToLogin: () => void
  onSuccess: () => void
}

export default function SignupForm({ onSwitchToLogin, onSuccess }: SignupFormProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Sign up with Supabase Auth first
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            mobile: mobile,
          },
        },
      })

      if (signUpError) {
        // Handle specific Supabase errors
        if (signUpError.message.includes('already registered') || 
            signUpError.message.includes('already exists') ||
            signUpError.message.includes('User already registered')) {
          throw new Error('Email already registered')
        }
        throw signUpError
      }

      if (data.user) {
        // Wait for the session to be established
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Wait for the trigger to create the profile
        let retries = 5
        let profileExists = false
        
        while (retries > 0 && !profileExists) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .maybeSingle()
          
          if (profile) {
            profileExists = true
            // Update profile with mobile and full name
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                mobile: mobile,
                full_name: fullName,
              })
              .eq('id', data.user.id)
            
            if (updateError) {
              console.error('Profile update error:', updateError)
              // Don't throw - profile exists, update is optional
            }
            break
          }
          
          await new Promise(resolve => setTimeout(resolve, 500))
          retries--
        }

        // If profile still doesn't exist, try to create it manually
        if (!profileExists) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: email,
              mobile: mobile,
              full_name: fullName,
              is_online: false,
              last_seen: new Date().toISOString(),
            })

          if (insertError) {
            console.error('Profile creation error:', insertError)
            console.error('Error details:', {
              code: insertError.code,
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint
            })
            
            // Show user-friendly error message
            if (insertError.code === '23505') { // Unique constraint violation
              if (insertError.message.includes('email')) {
                throw new Error('Email already registered. Please use a different email.')
              } else if (insertError.message.includes('mobile')) {
                throw new Error('Mobile number already registered. Please use a different number.')
              }
            }
            
            throw new Error(`Database error saving new user: ${insertError.message}`)
          }
        }

        // Verify we have a session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('Session not established. Please try logging in.')
        }

        onSuccess()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-green focus:border-transparent"
          placeholder="Enter your full name"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-green focus:border-transparent"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-1">
          Mobile Number
        </label>
        <input
          id="mobile"
          type="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          required
          pattern="[0-9]{10,15}"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-green focus:border-transparent"
          placeholder="Enter your mobile number"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-green focus:border-transparent"
          placeholder="Enter your password (min 6 characters)"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-whatsapp-green text-white py-2 rounded-lg font-semibold hover:bg-whatsapp-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Signing up...' : 'Sign Up'}
      </button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-whatsapp-green font-semibold hover:underline"
        >
          Login
        </button>
      </p>
    </form>
  )
}

