'use client'

import { FiX, FiZoomIn, FiZoomOut } from 'react-icons/fi'
import { useState } from 'react'

interface ProfileGalleryProps {
  imageUrl: string
  onClose: () => void
}

export default function ProfileGallery({ imageUrl, onClose }: ProfileGalleryProps) {
  const [zoom, setZoom] = useState(1)

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5))
  }

  const handleResetZoom = () => {
    setZoom(1)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition-colors z-10"
        >
          <FiX size={32} />
        </button>

        {/* Zoom Controls */}
        <div className="absolute top-4 left-4 flex gap-2 z-10">
          <button
            onClick={handleZoomIn}
            className="bg-white/20 text-white p-2 rounded-full hover:bg-white/30 transition-colors"
            title="Zoom In"
          >
            <FiZoomIn size={24} />
          </button>
          <button
            onClick={handleZoomOut}
            className="bg-white/20 text-white p-2 rounded-full hover:bg-white/30 transition-colors"
            title="Zoom Out"
          >
            <FiZoomOut size={24} />
          </button>
          {zoom !== 1 && (
            <button
              onClick={handleResetZoom}
              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors text-sm"
            >
              Reset
            </button>
          )}
        </div>

        {/* Image */}
        <div className="max-w-full max-h-full overflow-auto">
          <img
            src={imageUrl}
            alt="Profile"
            style={{
              transform: `scale(${zoom})`,
              transition: 'transform 0.2s',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
            className="cursor-zoom-in"
            onClick={handleZoomIn}
          />
        </div>

        {/* Zoom Indicator */}
        {zoom !== 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/20 text-white px-4 py-2 rounded-lg text-sm">
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>
    </div>
  )
}

