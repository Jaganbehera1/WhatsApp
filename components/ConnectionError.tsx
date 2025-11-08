'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ConnectionError() {
  const [isChecking, setIsChecking] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    setIsChecking(true)
    setError(null)

    try {
      // Try to fetch from the Supabase URL directly
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) {
        setError('connection')
        setIsChecking(false)
        return
      }

      // Test if the Supabase endpoint is reachable
      const testUrl = `${supabaseUrl}/rest/v1/`
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
      }).catch(() => null)

      if (response && response.status !== 0) {
        // Any response (even 401/404) means the server is reachable
        setIsConnected(true)
      } else {
        setError('connection')
      }
    } catch (err: any) {
      setError('connection')
    } finally {
      setIsChecking(false)
    }
  }

  if (isChecking) {
    return null // Don't show anything while checking
  }

  if (isConnected) {
    return null // Connection is fine
  }

  if (error === 'connection') {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8 border-2 border-red-200">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Cannot Connect to Supabase
            </h1>
            <p className="text-gray-600">
              Your Supabase project is not accessible. This usually means the project is paused or the URL is incorrect.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-yellow-800 mb-2">Quick Fix Steps:</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-700">
              <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Supabase Dashboard</a></li>
              <li>Find your project (ID: <code className="bg-yellow-100 px-1 rounded">sonjulufvkeqtlsywopy</code>)</li>
              <li>If it shows "Paused", click <strong>"Restore"</strong> to reactivate it</li>
              <li>If the project doesn't exist, create a new one</li>
              <li>Go to <strong>Settings → API</strong> and copy the correct Project URL</li>
              <li>Update your <code className="bg-yellow-100 px-1 rounded">.env</code> file with the correct URL</li>
              <li>Restart the development server</li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-800 mb-2">Your Current Configuration:</h2>
            <div className="text-sm text-blue-700 space-y-1 font-mono">
              <div>URL: <code className="bg-blue-100 px-1 rounded">{process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}</code></div>
              <div>Key: <code className="bg-blue-100 px-1 rounded">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
                  ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` 
                  : 'Not set'}
              </code></div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={checkConnection}
              className="flex-1 bg-whatsapp-green text-white py-3 px-4 rounded-lg font-semibold hover:bg-whatsapp-dark transition-colors"
            >
              Retry Connection
            </button>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-center"
            >
              Open Supabase Dashboard
            </a>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Need help? Check <code className="bg-gray-100 px-1 rounded">TROUBLESHOOTING.md</code> for detailed instructions.</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

