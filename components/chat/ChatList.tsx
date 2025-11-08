'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Chat, User } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface ChatListProps {
  userId: string
  onSelectChat: (chatId: string) => void
  selectedChatId: string | null
}

export default function ChatList({ userId, onSelectChat, selectedChatId }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [databaseError, setDatabaseError] = useState<string | null>(null)

  useEffect(() => {
    fetchChats()
    fetchAllUsers()
  }, [userId])

  useEffect(() => {
    // Subscribe to new messages
    const messageSubscription = supabase
      .channel('messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchChats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageSubscription)
    }
  }, [])

  async function fetchChats() {
    // Get all chats where user is a participant
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', userId)

    if (participantsError) {
      console.error('Error fetching chat participants:', participantsError)
      // If table doesn't exist, show helpful message
      if (participantsError.code === 'PGRST205' || 
          participantsError.code === 'PGRST116' || 
          participantsError.message.includes('does not exist') ||
          participantsError.message.includes('schema cache')) {
        setDatabaseError('Database tables not set up. Please run the database.sql script in Supabase SQL Editor.')
        setChats([])
        return
      }
    }
    
    setDatabaseError(null)

    if (!participants || participants.length === 0) {
      setChats([])
      return
    }

    const chatIds = participants.map((p) => p.chat_id)

    // Get chat details
    const { data: chatsData } = await supabase
      .from('chats')
      .select('*')
      .in('id', chatIds)
      .order('updated_at', { ascending: false })

    if (!chatsData) return

    // Get last message for each chat
    const chatsWithMessages = await Promise.all(
      chatsData.map(async (chat) => {
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('*, sender:profiles!sender_id(*)')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // For direct chats, get the other user
        let otherUser = null
        if (chat.type === 'direct') {
          // First get the other participant's user_id
          const { data: otherParticipant, error: participantError } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chat.id)
            .neq('user_id', userId)
            .single()

          if (participantError) {
            console.error(`Error fetching other participant for chat ${chat.id}:`, participantError)
          }

          // Then fetch the profile separately
          if (otherParticipant && otherParticipant.user_id) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', otherParticipant.user_id)
              .single()

            if (profileError) {
              console.error(`Error fetching profile for user ${otherParticipant.user_id}:`, profileError)
            }

            if (profile) {
              // Map profile data to User interface format
              otherUser = {
                id: profile.id,
                email: profile.email || '',
                mobile: profile.mobile || profile.phone || '',
                full_name: profile.full_name || profile.name || '',
                avatar_url: profile.avatar_url || profile.profile_pic || null,
              }
              console.log(`Found other user for chat ${chat.id}:`, otherUser)
            }
          }
        }

        return {
          ...chat,
          last_message: lastMessage || undefined,
          other_user: otherUser || undefined,
        }
      })
    )

    setChats(chatsWithMessages)
  }

  async function fetchAllUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', userId)

    if (error) {
      console.error('Error fetching users:', error)
      return
    }

    if (data) {
      // Sort client-side to handle NULL values
      const sortedUsers = [...data].sort((a, b) => {
        const nameA = (a.full_name || a.email || '').toLowerCase()
        const nameB = (b.full_name || b.email || '').toLowerCase()
        return nameA.localeCompare(nameB)
      })
      setAllUsers(sortedUsers as User[])
    }
  }

  const handleStartChat = async (otherUserId: string) => {
    // Optimize: Check if chat already exists - get both users' chats and find intersection
    const [myChatsResult, otherChatsResult] = await Promise.all([
      supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', userId),
      supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', otherUserId)
    ])

    // Find common chat (chat that both users are in)
    if (myChatsResult.data && otherChatsResult.data) {
      const myChatIds = new Set(myChatsResult.data.map(c => c.chat_id))
      const sharedChat = otherChatsResult.data.find(c => myChatIds.has(c.chat_id))
      
      if (sharedChat) {
        // Chat exists, select it immediately for instant response
        onSelectChat(sharedChat.chat_id)
        // Refresh chat list in background
        fetchChats()
        return
      }
    }

    // Verify user is authenticated before creating chat
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      console.error('Not authenticated:', sessionError)
      alert('You must be logged in to create a chat. Please refresh the page.')
      return
    }

    console.log('Creating chat as user:', session.user.id)
    console.log('Session token exists:', !!session.access_token)

    // Test: Try a simple query first to verify auth is working
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .single()
    
    if (testError) {
      console.error('Auth test failed:', testError)
      alert('Authentication issue. Please refresh the page and try again.')
      return
    }
    
    console.log('Auth test passed, user can query database')

    // Create new chat with explicit error handling
    console.log('Attempting to create chat...')
    let newChat = null
    let chatError = null
    
    // Try direct insert first
    const insertResult = await supabase
      .from('chats')
      .insert({ type: 'direct' })
      .select()
      .single()
    
    newChat = insertResult.data
    chatError = insertResult.error
    
    // If direct insert fails with RLS error, try using database function (bypasses RLS)
    if (chatError && chatError.code === '42501') {
      console.log('RLS blocked direct insert, trying database function...')
      const { data: functionResult, error: functionError } = await supabase
        .rpc('create_chat', { chat_type: 'direct' })
      
      console.log('Function result:', { functionResult, functionError })
      
      if (!functionError && functionResult && Array.isArray(functionResult) && functionResult.length > 0) {
        // Function returns an array with the chat record
        newChat = functionResult[0]
        chatError = null
        console.log('Chat created successfully using database function:', newChat)
      } else if (!functionError && functionResult && typeof functionResult === 'object') {
        // Function might return a single object
        newChat = functionResult
        chatError = null
        console.log('Chat created successfully using database function:', newChat)
      } else {
        // Function failed or doesn't exist
        if (functionError) {
          console.error('Database function error:', functionError)
          if (functionError.code === '42883' || functionError.message?.includes('does not exist')) {
            chatError = {
              ...functionError,
              message: 'Database function not found. Please run BYPASS_RLS_WITH_FUNCTION.sql in Supabase SQL Editor.'
            }
          } else {
            chatError = functionError
          }
        } else {
          chatError = {
            code: 'PGRST116',
            message: 'Function returned no result. Please check if the function was created correctly.'
          }
        }
        console.log('Database function failed:', chatError)
      }
    }
    
    console.log('Chat creation result:', { newChat, chatError })

    if (chatError) {
      console.error('Error creating chat:', chatError)
      console.error('Error details:', {
        code: chatError.code,
        message: chatError.message,
        details: chatError.details,
        hint: chatError.hint
      })
      alert(`Failed to create chat: ${chatError.message}\n\nError code: ${chatError.code}\n\nIf this is an RLS error, please run the BYPASS_RLS_WITH_FUNCTION.sql script in Supabase SQL Editor.`)
      return
    }

    if (newChat) {
      // Add both participants
      const { error: participantsError } = await supabase.from('chat_participants').insert([
        { chat_id: newChat.id, user_id: userId },
        { chat_id: newChat.id, user_id: otherUserId },
      ])

      if (participantsError) {
        console.error('Error adding participants:', participantsError)
        alert(`Failed to add participants: ${participantsError.message}`)
        return
      }

      onSelectChat(newChat.id)
      fetchChats()
    }
  }

  const filteredUsers = allUsers.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.mobile?.includes(searchQuery)
  )

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 md:p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search or start new chat"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 md:px-4 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-green focus:border-transparent"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {databaseError ? (
          <div className="p-6 text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 font-semibold mb-2">⚠️ Database Setup Required</p>
              <p className="text-yellow-700 text-sm mb-3">{databaseError}</p>
              <div className="text-left text-xs text-yellow-600 bg-yellow-100 p-3 rounded">
                <p className="font-semibold mb-2">Quick Fix:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to Supabase Dashboard → SQL Editor</li>
                  <li>Open <code className="bg-yellow-200 px-1 rounded">lib/database.sql</code></li>
                  <li>Copy and paste entire file</li>
                  <li>Click "Run"</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            </div>
          </div>
        ) : searchQuery ? (
          <div>
            <div className="p-2 text-xs md:text-sm text-gray-500 font-semibold">Start new chat</div>
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleStartChat(user.id)}
                className="p-3 md:p-4 hover:bg-gray-100 cursor-pointer flex items-center gap-2 md:gap-3 border-b border-gray-100 active:bg-gray-200"
              >
                <img
                  src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.email)}&background=25D366&color=fff`}
                  alt={user.full_name || user.email}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm md:text-base text-gray-800 truncate">{user.full_name || user.email}</p>
                  <p className="text-xs md:text-sm text-gray-500 truncate">{user.mobile}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {chats.length === 0 ? (
              <div className="p-4 md:p-8 text-center text-gray-500">
                <p className="text-sm md:text-base">No chats yet. Search for a user to start chatting!</p>
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`p-3 md:p-4 hover:bg-gray-100 cursor-pointer flex items-center gap-2 md:gap-3 border-b border-gray-100 active:bg-gray-200 ${
                    selectedChatId === chat.id ? 'bg-gray-100' : ''
                  }`}
                >
                  <img
                    src={
                      chat.other_user?.avatar_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.other_user?.full_name || chat.name || 'Chat')}&background=25D366&color=fff`
                    }
                    alt={chat.other_user?.full_name || chat.name || 'Chat'}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm md:text-base text-gray-800 truncate">
                        {chat.other_user?.full_name || chat.name || 'Chat'}
                      </p>
                      {chat.last_message && (
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatDistanceToNow(new Date(chat.last_message.created_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    {chat.last_message && (
                      <p className="text-xs md:text-sm text-gray-500 truncate">{chat.last_message.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

