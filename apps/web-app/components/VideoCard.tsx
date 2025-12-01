"use client"

import type React from "react"

import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VideoCardProps {
  title: string
  author: string
  timeAgo: string
  hasPlayButton?: boolean
  imageUrl?: string
  onPress?: () => void
}

const VideoCard: React.FC<VideoCardProps> = ({
  title,
  author,
  timeAgo,
  hasPlayButton = false,
  imageUrl,
  onPress
}) => {
  return (
    <div
      className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
      onClick={onPress}
    >
      {/* Media background */}
      <div className="relative h-40 bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 overflow-hidden">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Flowing wave pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
            <path d="M0,100 C100,50 200,150 400,100 L400,200 L0,200 Z" fill="white" opacity="0.1" />
            <path d="M0,120 C150,70 250,170 400,120 L400,200 L0,200 Z" fill="white" opacity="0.1" />
            <path d="M0,140 C200,90 300,190 400,140 L400,200 L0,200 Z" fill="white" opacity="0.1" />
          </svg>
        </div>

        {/* Play button */}
        {hasPlayButton && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              size="icon"
              variant="outline"
              className="w-16 h-16 rounded-full bg-transparent border-2 border-white text-white hover:bg-white/10"
            >
              <Play className="w-8 h-8 ml-1" fill="currentColor" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
            <p className="text-sm text-gray-600">por {author}</p>
          </div>
          <span className="text-xs text-gray-400 ml-4">{timeAgo}</span>
        </div>
      </div>
    </div>
  )
}

export default VideoCard
