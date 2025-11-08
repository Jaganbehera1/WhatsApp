export interface User {
  id: string
  email: string
  mobile: string
  full_name: string
  avatar_url: string | null
  is_online?: boolean
  last_seen?: string
}

export interface Chat {
  id: string
  type: 'direct' | 'group'
  name: string | null
  created_at: string
  updated_at: string
  last_message?: Message
  other_user?: User
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'image' | 'file'
  created_at: string
  updated_at: string
  read_at?: string | null
  sender?: User
}

export interface ChatParticipant {
  id: string
  chat_id: string
  user_id: string
  joined_at: string
  user?: User
}

