'use client'

import { useState, useRef, useEffect } from 'react'
import MessageBubble, { type Message } from './MessageBubble'
import HotelModal from './HotelModal'
import type { Hotel } from './HotelCard'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

const SUGGESTED_PROMPTS = [
  { vi: 'Khách sạn budget ở Đà Nẵng', en: 'Budget hotels in Da Nang' },
  { vi: 'Resort 4 sao Phú Quốc dưới 3 triệu', en: '4-star Phu Quoc resorts under 3M VND' },
  { vi: 'Khách sạn đánh giá cao nhất Hội An', en: 'Top-rated hotels in Hoi An' },
  { vi: 'Nơi lưu trú gần biển Nha Trang', en: 'Beachfront stays in Nha Trang' },
]

export default function ChatContainer() {
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [lang, setLang]             = useState<'vi' | 'en'>('vi')
  const bottomRef                   = useRef<HTMLDivElement>(null)
  const inputRef                    = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const loadingMsg: Message = { role: 'assistant', content: '', loading: true }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))

      const res = await fetch(`${BACKEND_URL}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, history, language: lang }),
      })

      if (!res.ok) throw new Error('Server error')
      const data = await res.json()

      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: data.text, hotels: data.hotels },
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: lang === 'vi'
            ? 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.'
            : 'Sorry, something went wrong. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-sand-200 bg-white/80 backdrop-blur-sm">
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">
            Vietnam Hotels <span className="text-ocean-500">✦</span>
          </h1>
          <p className="text-xs text-gray-400">AI-powered hotel finder</p>
        </div>
        {/* Language toggle */}
        <div className="flex bg-sand-100 rounded-full p-1 gap-1">
          {(['vi', 'en'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all
                          ${lang === l ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {l === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
            </button>
          ))}
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto chat-scroll px-4 py-6 space-y-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="text-5xl mb-4">🏨</div>
            <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">
              {lang === 'vi' ? 'Tìm khách sạn lý tưởng' : 'Find your perfect hotel'}
            </h2>
            <p className="text-gray-400 text-sm mb-8 max-w-xs">
              {lang === 'vi'
                ? 'Hỏi bất cứ điều gì về khách sạn ở Việt Nam'
                : 'Ask anything about hotels across Vietnam'}
            </p>
            {/* Suggested prompts */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(lang === 'vi' ? p.vi : p.en)}
                  className="text-left bg-white border border-sand-200 rounded-xl px-3 py-2.5
                             text-xs text-gray-600 hover:border-ocean-300 hover:bg-sand-50
                             transition-all duration-200 shadow-sm hover:shadow-card"
                >
                  {lang === 'vi' ? p.vi : p.en}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} onHotelClick={setSelectedHotel} />
          ))
        )}
        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <footer className="px-4 pb-4 pt-2 bg-white/80 backdrop-blur-sm border-t border-sand-200">
        <div className="flex gap-2 items-end bg-white border border-sand-300 rounded-2xl
                        px-4 py-2 shadow-card focus-within:border-ocean-400 transition-colors">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={lang === 'vi' ? 'Tìm khách sạn...' : 'Search hotels...'}
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400
                       outline-none py-1.5 max-h-32 leading-relaxed"
            style={{ height: 'auto' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 bg-ocean-500 hover:bg-ocean-600 disabled:bg-sand-300
                       text-white rounded-xl p-2.5 transition-colors duration-200"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-center text-xs text-gray-300 mt-2">
          Powered by Claude AI · Data from Booking.com
        </p>
      </footer>

      {/* Modal */}
      <HotelModal hotel={selectedHotel} onClose={() => setSelectedHotel(null)} />
    </div>
  )
}
