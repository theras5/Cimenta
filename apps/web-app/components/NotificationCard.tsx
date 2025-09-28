"use client"

import type React from "react"

interface NotificationCardProps {
  message: string
  highlight: string
}

const NotificationCard: React.FC<NotificationCardProps> = ({ message, highlight }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-5">
      <div className="flex items-center">
        <div className="mr-4">
          <span className="text-3xl">👷‍♂️</span>
        </div>
        <div className="flex-1">
          <p className="text-gray-600 text-base leading-6">
            {message} <span className="font-semibold text-gray-800">"{highlight}"</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default NotificationCard
