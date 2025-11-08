'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'
import { FiX, FiCamera } from 'react-icons/fi'
import ProfileGallery from './ProfileGallery'

interface ProfileModalProps {
  user: User
  onClose: () => void
  onUpdate: (user: User) => void
}

export default function ProfileModal({ user, onClose, onUpdate }: ProfileModalProps) {
  const [fullName, setFullName] = useState(user.full_name || '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '')
  const [showGallery, setShowGallery] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageClick = () => {
    setShowGallery(true)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Upload to Supabase Storage (you'll need to set up a bucket)
    // For now, we'll use a data URL
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64String = reader.result as string
      
      // Update profile with image
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: base64String })
        .eq('id', user.id)

      if (!error) {
        setAvatarUrl(base64String)
        onUpdate({ ...user, avatar_url: base64String })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        full_name: fullName || null, 
        avatar_url: avatarUrl || null 
      })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating profile:', error)
      alert(`Failed to update profile: ${error.message}`)
      return
    }

    onUpdate({ ...user, full_name: fullName, avatar_url: avatarUrl })
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Profile</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <img
                  src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || user.email)}&background=25D366&color=fff&size=200`}
                  alt="Profile"
                  className="w-32 h-32 rounded-full cursor-pointer border-4 border-whatsapp-green hover:opacity-80 transition-opacity"
                  onClick={handleImageClick}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-whatsapp-green text-white p-2 rounded-full hover:bg-whatsapp-dark transition-colors"
                >
                  <FiCamera size={20} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">Click image to view in gallery</p>
            </div>

            {/* User Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-whatsapp-green focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile
                </label>
                <input
                  type="tel"
                  value={user.mobile}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-whatsapp-green text-white rounded-lg hover:bg-whatsapp-dark transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {showGallery && (
        <ProfileGallery
          imageUrl={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || user.email)}&background=25D366&color=fff&size=200`}
          onClose={() => setShowGallery(false)}
        />
      )}
    </>
  )
}

