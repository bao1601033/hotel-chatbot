'use client'

import ReactMarkdown from 'react-markdown'
import HotelCard, { type Hotel } from './HotelCard'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  hotels?: Hotel[]
  loading?: boolean
}

interface Props {
  message: Message
  onHotelClick: (hotel: Hotel) => void
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-card animate-skeleton">
      <div className="h-44 bg-sand-200" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-sand-200 rounded-full w-1/2" />
        <div className="h-4 bg-sand-200 rounded-full w-3/4" />
        <div className="h-3 bg-sand-200 rounded-full w-1/3" />
        <div className="flex justify-between mt-4">
          <div className="h-8 bg-sand-200 rounded-lg w-16" />
          <div className="h-6 bg-sand-200 rounded-full w-24" />
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 bg-sand-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  )
}

export default function MessageBubble({ message, onHotelClick }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 animate-fade-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                       ${isUser ? 'bg-ocean-500 text-white' : 'bg-sand-200 text-sand-600'}`}>
        {isUser ? 'U' : '✦'}
      </div>

      {/* Content */}
      <div className={`flex flex-col gap-3 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bubble */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
                         ${isUser
                           ? 'bg-ocean-500 text-white rounded-tr-sm'
                           : 'bg-white shadow-card text-gray-800 rounded-tl-sm'}`}>
          {message.loading ? (
            <TypingIndicator />
          ) : (
            <div className="prose-chat">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Hotel cards grid */}
        {!message.loading && message.hotels && message.hotels.length > 0 && (
          <div className="w-full">
            <p className="text-xs text-gray-400 mb-2 ml-1">
              {message.hotels.length} khách sạn phù hợp
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {message.hotels.map((hotel, i) => (
                <HotelCard
                  key={hotel.hotel_id}
                  hotel={hotel}
                  onClick={onHotelClick}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        {/* Skeleton loading */}
        {message.loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}
