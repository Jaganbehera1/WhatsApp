'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Message, User } from '@/types'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { FiSend, FiCheck, FiCheckCircle, FiPaperclip, FiArrowLeft } from 'react-icons/fi'
import ProfileGallery from '@/components/profile/ProfileGallery'

interface ChatWindowProps {
  chatId: string
  currentUser: User
  onBack?: () => void
}

export default function ChatWindow({ chatId, currentUser, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatName, setChatName] = useState('')
  const [otherUser, setOtherUser] = useState<User | null>(null)
  const [showGallery, setShowGallery] = useState(false)
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
    fetchChatInfo()

    // Subscribe to new messages
    console.log('Setting up real-time subscription for chat:', chatId)
    const messageSubscription = supabase
      .channel(`chat:${chatId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          console.log('Real-time message received:', payload)
          // Check if message already exists (to avoid duplicates from immediate local state update)
          setMessages((prev) => {
            const messageExists = prev.some((msg) => msg.id === payload.new.id)
            if (messageExists) {
              return prev // Message already in state, don't add again
            }
            
            // Message doesn't exist, fetch it asynchronously
            // Note: We can't use await here, so we use .then()
            supabase
              .from('messages')
              .select('*, sender:profiles!sender_id(*)')
              .eq('id', payload.new.id)
              .single()
              .then(({ data: newMsg, error: fetchError }) => {
                if (fetchError) {
                  console.error('Error fetching new message:', fetchError)
                  // If fetch fails, try to construct message from payload
                  if (payload.new) {
                    const messageFromPayload: Message = {
                      id: payload.new.id,
                      chat_id: payload.new.chat_id,
                      sender_id: payload.new.sender_id,
                      content: payload.new.content,
                      message_type: payload.new.message_type || 'text',
                      created_at: payload.new.created_at,
                      updated_at: payload.new.updated_at,
                      read_at: payload.new.read_at || null,
                    }
                    setMessages((current) => {
                      const exists = current.some((msg) => msg.id === messageFromPayload.id)
                      if (exists) return current
                      return [...current, messageFromPayload]
                    })
                  }
                  return
                }
                
                if (newMsg) {
                  setMessages((current) => {
                    // Double-check it's not already there (race condition protection)
                    const exists = current.some((msg) => msg.id === newMsg.id)
                    if (exists) return current
                    return [...current, newMsg as Message]
                  })
                }
              })
              .catch((err) => {
                console.error('Error fetching new message:', err)
              })
            
            return prev // Return immediately, will update when fetch completes
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageSubscription)
    }
  }, [chatId, currentUser.id])

  // Setup online status subscription when otherUser is available
  useEffect(() => {
    if (!otherUser) return
    
    const cleanup = setupOnlineStatus()
    return () => {
      if (cleanup) cleanup()
    }
  }, [otherUser?.id])

  // Mark messages as read when chat is viewed and messages are loaded
  useEffect(() => {
    if (messages.length > 0 && otherUser) {
      // Small delay to ensure messages are rendered
      const timer = setTimeout(() => {
        markMessagesAsRead()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [messages.length, chatId, currentUser.id, otherUser?.id])

  // Update online status on mount and periodically
  useEffect(() => {
    // Set online immediately when component mounts
    updateOnlineStatus()
    
    // Update every 15 seconds to keep status fresh
    const interval = setInterval(updateOnlineStatus, 15000)
    
    // Also update on window focus (user came back to tab)
    const handleFocus = () => {
      updateOnlineStatus()
    }
    window.addEventListener('focus', handleFocus)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      // Set offline when component unmounts
      supabase
        .from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', currentUser.id)
    }
  }, [currentUser.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(*)')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return
    }

    if (data) {
      setMessages(data as Message[])
    }
  }

  async function fetchChatInfo() {
    // Fetch chat first (use maybeSingle to handle case where chat doesn't exist)
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .maybeSingle()

    if (chatError) {
      console.error('Error fetching chat:', chatError)
      setChatName('Chat')
      return
    }

    if (!chat) {
      console.error('Chat not found or access denied:', chatId)
      setChatName('Chat')
      return
    }

    if (chat.type === 'direct') {
      // First get the other participant's user_id
      const { data: otherParticipant, error: participantError } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId)
        .neq('user_id', currentUser.id)
        .single()

      if (participantError) {
        console.error('Error fetching other participant:', participantError)
        setChatName('Chat')
        return
      }

      // Then fetch the profile separately
      if (otherParticipant && otherParticipant.user_id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherParticipant.user_id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          setChatName('Chat')
          return
        }

        if (profile) {
          const userObj = {
            id: profile.id,
            email: profile.email || '',
            mobile: profile.mobile || '',
            full_name: profile.full_name || '',
            avatar_url: profile.avatar_url || null,
            is_online: profile.is_online === true, // Explicit boolean check
            last_seen: profile.last_seen || null,
          }
          console.log('Setting other user:', userObj, 'is_online:', profile.is_online)
          setOtherUser(userObj)
          setIsOtherUserOnline(profile.is_online === true) // Explicit boolean check
          setChatName(profile.full_name || profile.email || 'Chat')
          
          // Also fetch fresh online status immediately
          // Check online status after a brief delay to ensure profile is set
          setTimeout(() => {
            checkOtherUserOnlineStatus(profile.id)
          }, 100)
        } else {
          setChatName('Chat')
        }
      } else {
        setChatName('Chat')
      }
    } else {
      setChatName(chat.name || 'Group Chat')
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB')
      return
    }

    // Check if it's an image or video
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      alert('Please select an image or video file')
      return
    }

    setUploading(true)

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${currentUser.id}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Error uploading file:', uploadError)
        // If bucket doesn't exist, try using public URL as fallback
        if (uploadError.message?.includes('Bucket not found')) {
          alert('Storage bucket not set up. Please run SETUP_STORAGE.sql in Supabase SQL Editor.')
          setUploading(false)
          return
        }
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath)

      // Send message with file URL
      const messageType = isImage ? 'image' : 'file'
      const { data: newMessageData, error: insertError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: currentUser.id,
          content: publicUrl,
          message_type: messageType,
        })
        .select('*, sender:profiles!sender_id(*)')
        .single()

      if (insertError) {
        console.error('Error sending message:', insertError)
        throw insertError
      }

      // Add message to local state immediately
      if (newMessageData) {
        setMessages((prev) => [...prev, newMessageData as Message])
      }

      // Update chat updated_at
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId)

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      console.error('Error uploading file:', err)
      alert(`Failed to upload file: ${err.message || 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || loading) return

    const messageContent = newMessage.trim()
    setNewMessage('')
    setLoading(true)

    try {
      const { data: newMessageData, error: insertError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: currentUser.id,
          content: messageContent,
          message_type: 'text',
        })
        .select('*, sender:profiles!sender_id(*)')
        .single()

      if (insertError) {
        console.error('Error sending message:', insertError)
        throw insertError
      }

      // Add message to local state immediately for better UX
      if (newMessageData) {
        setMessages((prev) => [...prev, newMessageData as Message])
      }

      // Update chat updated_at
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId)
    } catch (err: any) {
      console.error('Error sending message:', err)
      alert(`Failed to send message: ${err.message || 'Unknown error'}\n\nIf this is an RLS error, please run FIX_MESSAGES_RLS.sql in Supabase SQL Editor.`)
      setNewMessage(messageContent) // Restore message on error
    } finally {
      setLoading(false)
    }
  }

  // Mark messages as read
  async function markMessagesAsRead() {
    if (!otherUser) return
    
    try {
      const { error } = await supabase.rpc('mark_messages_as_read', {
        chat_uuid: chatId,
        reader_uuid: currentUser.id,
      })

      if (error) {
        console.error('Error marking messages as read:', error)
      } else {
        // Refresh messages to get updated read_at timestamps
        fetchMessages()
      }
    } catch (err) {
      console.error('Error in markMessagesAsRead:', err)
    }
  }

  // Setup online status subscription
  function setupOnlineStatus() {
    if (!otherUser) return

    const statusSubscription = supabase
      .channel(`user_status:${otherUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${otherUser.id}`,
        },
        (payload) => {
          const updatedProfile = payload.new as any
          const isOnline = updatedProfile.is_online === true // Explicit boolean check
          console.log('Online status updated:', { userId: otherUser?.id, isOnline, payload: updatedProfile })
          setIsOtherUserOnline(isOnline)
          if (otherUser) {
            setOtherUser({
              ...otherUser,
              is_online: isOnline,
              last_seen: updatedProfile.last_seen || null,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(statusSubscription)
    }
  }

  // Update current user's online status
  async function updateOnlineStatus() {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_online: true, 
          last_seen: new Date().toISOString() 
        })
        .eq('id', currentUser.id)
      
      if (error) {
        console.error('Error updating online status:', error)
      }
    } catch (err) {
      console.error('Error updating online status:', err)
    }
  }

  // Check other user's online status
  async function checkOtherUserOnlineStatus(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_online, last_seen')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error checking online status:', error)
        return
      }
      
      if (profile) {
        const isOnline = profile.is_online === true
        console.log('Checked online status for user', userId, 'isOnline:', isOnline)
        setIsOtherUserOnline(isOnline)
        if (otherUser) {
          setOtherUser({
            ...otherUser,
            is_online: isOnline,
            last_seen: profile.last_seen || null,
          })
        }
      }
    } catch (err) {
      console.error('Error in checkOtherUserOnlineStatus:', err)
    }
  }

  // Get read receipt icon (WhatsApp style: single tick = sent, double tick = delivered, green double tick = read)
  const getReadReceipt = (message: Message) => {
    if (message.sender_id !== currentUser.id) return null // Only show for own messages
    
    if (message.read_at) {
      // Green double tick - message read
      return (
        <span className="flex items-center">
          <FiCheckCircle className="text-blue-400" size={14} />
          <FiCheckCircle className="text-blue-400 -ml-1" size={14} />
        </span>
      )
    } else {
      // Double tick - message delivered but not read
      return (
        <span className="flex items-center">
          <FiCheck className="text-gray-400" size={14} />
          <FiCheck className="text-gray-400 -ml-1" size={14} />
        </span>
      )
    }
  }

  // Format last seen time
  const formatLastSeen = (lastSeen: string | null | undefined) => {
    if (!lastSeen) return 'Never'
    
    const lastSeenDate = new Date(lastSeen)
    if (isToday(lastSeenDate)) {
      return `last seen today at ${format(lastSeenDate, 'HH:mm')}`
    } else if (isYesterday(lastSeenDate)) {
      return `last seen yesterday at ${format(lastSeenDate, 'HH:mm')}`
    } else {
      return `last seen ${formatDistanceToNow(lastSeenDate, { addSuffix: true })}`
    }
  }

  const formatMessageTime = (date: string) => {
    const messageDate = new Date(date)
    if (isToday(messageDate)) {
      return format(messageDate, 'HH:mm')
    } else if (isYesterday(messageDate)) {
      return `Yesterday ${format(messageDate, 'HH:mm')}`
    } else {
      return format(messageDate, 'MMM d, HH:mm')
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-whatsapp-light relative" style={{ height: '100%', overflow: 'hidden' }}>
      {/* Chat Header - Fixed at top, NOT scrollable */}
      <div className="bg-whatsapp-dark text-white p-3 md:p-4 flex items-center gap-2 md:gap-3 flex-shrink-0 z-20 shadow-md">
        {/* Back button - only show on mobile */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-2 hover:bg-whatsapp-green rounded-full transition-colors"
            aria-label="Back to chat list"
          >
            <FiArrowLeft size={20} />
          </button>
        )}
        {otherUser ? (
          <img
            src={
              otherUser.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.full_name || otherUser.email)}&background=25D366&color=fff`
            }
            alt={otherUser.full_name || otherUser.email}
            onClick={() => otherUser.avatar_url && setShowGallery(true)}
            className={`w-9 h-9 md:w-10 md:h-10 rounded-full cursor-pointer flex-shrink-0 ${otherUser.avatar_url ? 'hover:opacity-80 transition-opacity' : ''}`}
          />
        ) : (
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-whatsapp-green flex items-center justify-center flex-shrink-0">
            <span className="text-base md:text-lg font-semibold">
              {chatName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm md:text-base truncate">{chatName}</h2>
          {otherUser && (
            <p className="text-xs text-white/70 truncate">
              {isOtherUserOnline ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></span>
                  <span>online</span>
                </span>
              ) : (
                <span>{formatLastSeen(otherUser.last_seen)}</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Messages - ONLY this area scrolls */}
      <div 
        className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 w-full"
        style={{ 
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}
      >
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUser.id
          const isImage = message.message_type === 'image'
          const isVideo = message.message_type === 'file'
          
          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-xs lg:max-w-md rounded-lg overflow-hidden ${
                  isOwn
                    ? 'bg-whatsapp-green text-white'
                    : 'bg-white text-gray-800'
                } ${isImage || isVideo ? 'p-0' : 'px-3 py-2 md:px-4'}`}
              >
                {isImage ? (
                  <div>
                    <img
                      src={message.content}
                      alt="Shared image"
                      className="w-full h-auto max-h-96 object-contain cursor-pointer"
                      onClick={() => window.open(message.content, '_blank')}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Image+not+found'
                      }}
                    />
                    <div className={`px-3 py-1 flex items-center gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <span className={`text-xs ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                        {formatMessageTime(message.created_at)}
                      </span>
                      {isOwn && getReadReceipt(message)}
                    </div>
                  </div>
                ) : isVideo ? (
                  <div>
                    <video
                      src={message.content}
                      controls
                      className="w-full h-auto max-h-96"
                      onError={(e) => {
                        const target = e.target as HTMLVideoElement
                        target.style.display = 'none'
                        const errorDiv = document.createElement('div')
                        errorDiv.className = `p-4 text-center text-sm ${isOwn ? 'text-white' : 'text-gray-600'}`
                        errorDiv.textContent = 'Video could not be loaded'
                        target.parentElement?.appendChild(errorDiv)
                      }}
                    />
                    <div className={`px-3 py-1 flex items-center gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <span className={`text-xs ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                        {formatMessageTime(message.created_at)}
                      </span>
                      {isOwn && getReadReceipt(message)}
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                        {formatMessageTime(message.created_at)}
                      </p>
                      {isOwn && getReadReceipt(message)}
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Fixed at bottom, NOT scrollable */}
      <div className="bg-white border-t border-gray-300 p-2 md:p-4 flex-shrink-0 z-20 shadow-lg">
        <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 md:gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
            disabled={uploading}
          />
          <label
            htmlFor="file-input"
            className={`bg-gray-200 text-gray-700 p-2 md:p-3 rounded-full hover:bg-gray-300 transition-colors cursor-pointer flex-shrink-0 ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Attach image or video"
          >
            <FiPaperclip size={18} className="md:w-5 md:h-5" />
          </label>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 md:px-4 text-sm md:text-base border border-gray-300 rounded-full focus:ring-2 focus:ring-whatsapp-green focus:border-transparent"
            disabled={uploading}
          />
          <button
            type="submit"
            disabled={(!newMessage.trim() && !uploading) || loading || uploading}
            className="bg-whatsapp-green text-white p-2 md:p-3 rounded-full hover:bg-whatsapp-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {uploading ? (
              <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FiSend size={18} className="md:w-5 md:h-5" />
            )}
          </button>
        </form>
      </div>

      {/* Profile Gallery Modal */}
      {showGallery && otherUser?.avatar_url && (
        <ProfileGallery
          imageUrl={otherUser.avatar_url}
          onClose={() => setShowGallery(false)}
        />
      )}
    </div>
  )
}

