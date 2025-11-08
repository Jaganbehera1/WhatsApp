'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ChatList from '@/components/chat/ChatList'
import ChatWindow from '@/components/chat/ChatWindow'
import ProfileModal from '@/components/profile/ProfileModal'
import { User } from '@/types'

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
    
    // Set user as online when page loads
    const setOnline = async () => {
      if (user) {
        await supabase
          .from('profiles')
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq('id', user.id)
      }
    }
    
    // Update online status periodically
    const interval = setInterval(() => {
      if (user) {
        supabase
          .from('profiles')
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq('id', user.id)
      }
    }, 20000) // Every 20 seconds
    
    // Update on window focus
    const handleFocus = () => {
      if (user) {
        supabase
          .from('profiles')
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq('id', user.id)
      }
    }
    window.addEventListener('focus', handleFocus)
    
    // Set offline when page unloads
    const handleBeforeUnload = () => {
      if (user) {
        // Use sendBeacon for reliability
        navigator.sendBeacon(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
          JSON.stringify({ is_online: false, last_seen: new Date().toISOString() })
        )
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    if (user) {
      setOnline()
    }
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Set offline on unmount
      if (user) {
        supabase
          .from('profiles')
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq('id', user.id)
      }
    }
  }, [user])

  async function checkUser() {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      router.push('/auth')
      return
    }

    if (!session) {
      console.log('No session found, redirecting to auth')
      router.push('/auth')
      return
    }

    console.log('Session found, user ID:', session.user.id)

    // Fetch user profile with error handling
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      console.error('Error details:', {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code
      })
      
      // If profile doesn't exist, try to create it
      if (profileError.code === 'PGRST116') {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email || '',
            mobile: '',
            full_name: session.user.user_metadata?.full_name || session.user.email || 'User',
          })
          .select()
          .single()

        if (insertError) {
          console.error('Failed to create profile:', insertError)
          alert('Failed to load profile. Please try logging out and back in.')
          return
        }

        if (newProfile) {
          setUser({
            id: newProfile.id,
            email: newProfile.email,
            mobile: newProfile.mobile,
            full_name: newProfile.full_name || '',
            avatar_url: newProfile.avatar_url || null,
          })
          return
        }
      } else {
        alert('Failed to load profile. Please check your Supabase RLS policies.')
      }
      return
    }

    if (profile) {
      setUser({
        id: profile.id,
        email: profile.email,
        mobile: profile.mobile,
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url || null,
      })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-whatsapp-green"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] w-full bg-gray-100 overflow-hidden">
      {/* Chat List - Hidden on mobile when chat is selected */}
      <div
        className={`${
          selectedChatId ? 'hidden md:flex' : 'flex'
        } w-full md:w-1/3 border-r border-gray-300 bg-white flex-col flex-shrink-0`}
        style={{
          height: '100dvh',
          minHeight: '100dvh',
          WebkitOverflowScrolling: 'touch', // ✅ smooth scroll for iPhone
        }}
      >
        <div className="bg-whatsapp-dark text-white p-3 md:p-4 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-semibold">WhatApp</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfile(true)}
              className="p-1.5 md:p-2 hover:bg-whatsapp-green rounded-full transition-colors"
            >
              <img
                src={
                  user.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user.full_name || user.email
                  )}&background=25D366&color=fff`
                }
                alt="Profile"
                className="w-7 h-7 md:w-8 md:h-8 rounded-full cursor-pointer"
              />
            </button>
            <button
              onClick={handleLogout}
              className="px-2 py-1 md:px-3 text-xs md:text-sm hover:bg-whatsapp-green rounded transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        <ChatList
          userId={user.id}
          onSelectChat={setSelectedChatId}
          selectedChatId={selectedChatId}
        />
      </div>
  
      {/* Chat Window - Full width on mobile, flex-1 on desktop */}
      <div
        className={`${
          selectedChatId ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col h-full overflow-hidden relative`}
        style={{
          height: '100dvh',
          minHeight: '100dvh',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {selectedChatId ? (
          <ChatWindow
            chatId={selectedChatId}
            currentUser={user}
            onBack={() => setSelectedChatId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-whatsapp-light">
            <div className="text-center text-gray-500 px-4">
              <p className="text-lg md:text-xl">Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>
  
      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onUpdate={(updatedUser) => setUser(updatedUser)}
        />
      )}
    </div>
  )
  
}