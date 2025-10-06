"use client"

import type React from "react"

interface NoMediaCardProps {
  title: string
  description?: string
  author: string
  timeAgo: string
  onPress?: () => void
}

const NoMediaCard: React.FC<NoMediaCardProps> = ({ title, description, author, timeAgo, onPress }) => {
  return (
    <div
      className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
      onClick={onPress}
    >
      {/* Blue gradient header */}
      <div className="h-8 bg-gradient-to-r from-blue-800 via-blue-600 to-cyan-500" />

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
            <p className="text-sm text-gray-600">por {author}</p>
          </div>
          <span className="text-xs text-gray-400 ml-4">{timeAgo}</span>
        </div>
        <p className="text-sm text-gray-600 leading-5">{description}</p>
      </div>
    </div>
  )
}

export default NoMediaCard
