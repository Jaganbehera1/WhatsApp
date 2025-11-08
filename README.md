# WhatApp - WhatsApp Clone

A full-featured WhatsApp-like messaging application built with Next.js, React, and Supabase.

## Features

- ✅ User authentication (Signup/Login)
- ✅ Unique email and mobile number validation
- ✅ Real-time messaging
- ✅ Profile pictures with gallery view
- ✅ Chat list with last message preview
- ✅ Search users to start new chats
- ✅ Responsive WhatsApp-like UI

## Prerequisites

- Node.js 18+ installed
- A Supabase account and project

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Go to [Supabase](https://supabase.com) and create a new project
2. Copy your project URL and anon key from Settings > API
3. Open the `.env` file in the root directory
4. Add your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set up Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `lib/database.sql`
4. Run the SQL script to create all necessary tables, policies, and triggers

### 4. Enable Real-time (Important!)

1. In Supabase dashboard, go to Database > Replication
2. Enable replication for the following tables:
   - `messages`
   - `chats`
   - `chat_participants`

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
├── app/
│   ├── auth/          # Authentication pages
│   ├── chat/          # Main chat interface
│   └── page.tsx       # Root page (redirects)
├── components/
│   ├── auth/          # Login/Signup forms
│   ├── chat/          # Chat list and chat window
│   └── profile/       # Profile modal and gallery
├── lib/
│   ├── supabase.ts    # Supabase client configuration
│   └── database.sql   # Database schema
└── types/
    └── index.ts       # TypeScript type definitions
```

## Key Features Explained

### Authentication
- Signup requires unique email and mobile number
- Login uses email and password
- Profile is automatically created on signup

### Real-time Messaging
- Uses Supabase real-time subscriptions
- Messages appear instantly for all participants
- Chat list updates automatically

### Profile Pictures
- Click on profile picture to view in gallery mode
- Zoom in/out functionality
- Upload new profile pictures

## Technologies Used

- **Next.js 14** - React framework
- **React 18** - UI library
- **Supabase** - Backend (Database, Auth, Real-time)
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety
- **date-fns** - Date formatting
- **react-icons** - Icons

## Notes

- Make sure to enable Row Level Security (RLS) policies in Supabase
- The database schema includes triggers for automatic profile creation
- Real-time subscriptions require replication to be enabled in Supabase

## License

MIT

