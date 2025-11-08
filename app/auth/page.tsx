'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LoginForm from '@/components/auth/LoginForm'
import SignupForm from '@/components/auth/SignupForm'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-whatsapp-dark to-whatsapp-green p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-whatsapp-green mb-2">WhatApp</h1>
          <p className="text-gray-600">Connect with your friends</p>
        </div>

        {isLogin ? (
          <LoginForm onSwitchToSignup={() => setIsLogin(false)} onSuccess={() => router.push('/chat')} />
        ) : (
          <SignupForm onSwitchToLogin={() => setIsLogin(true)} onSuccess={() => router.push('/chat')} />
        )}
      </div>
    </div>
  )
}

