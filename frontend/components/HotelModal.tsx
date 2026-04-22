'use client'

import { useEffect, useState } from 'react'
import type { Hotel } from './HotelCard'

interface Props {
  hotel: Hotel | null
  onClose: () => void
}

function formatVND(amount?: number) {
  if (!amount) return 'Liên hệ'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'

export default function HotelModal({ hotel, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    if (hotel) {
      setImgError(false)
      setTimeout(() => setVisible(true), 10)
      document.body.style.overflow = 'hidden'
    } else {
      setVisible(false)
      document.body.style.overflow = ''
    }
  }, [hotel])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  if (!hotel) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300
                  ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-3xl shadow-modal w-full max-w-lg max-h-[90vh]
                    overflow-y-auto transition-all duration-300
                    ${visible ? 'scale-100 opacity-100' : 'scale-92 opacity-0'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-full p-2
                     shadow-md hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero image */}
        <div className="h-64 overflow-hidden rounded-t-3xl bg-sand-100">
          <img
            src={imgError ? FALLBACK_IMAGE : (hotel.primary_image || FALLBACK_IMAGE)}
            alt={hotel.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-gray-900 leading-snug mb-1">
                {hotel.name}
              </h2>
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {hotel.address || hotel.city}
              </div>
            </div>
            {hotel.rating_score && (
              <div className="flex-shrink-0 text-center">
                <div className="bg-ocean-500 text-white text-xl font-bold w-14 h-14 rounded-2xl
                                flex items-center justify-center">
                  {hotel.rating_score.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 mt-1">{hotel.rating_label}</div>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Giá/đêm', value: formatVND(hotel.price_per_night_vnd) },
              { label: 'Phân khúc', value: hotel.price_tier || '—' },
              { label: 'Đánh giá', value: hotel.review_count ? `${hotel.review_count.toLocaleString()} lượt` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-sand-50 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                <div className="text-sm font-semibold text-gray-800">{value}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          {hotel.description && (
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Mô tả</h4>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                {hotel.description}
              </p>
            </div>
          )}

          {/* Availability */}
          {hotel.availability_label && (
            <div className="flex items-center gap-2 mb-5">
              <div className={`w-2 h-2 rounded-full ${hotel.availability_label.includes('Hết') ? 'bg-red-400' : 'bg-emerald-400'}`} />
              <span className="text-sm text-gray-600">{hotel.availability_label}</span>
            </div>
          )}

          {/* CTA */}
          {hotel.url && (
            <a
              href={hotel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-ocean-500 hover:bg-ocean-600 text-white text-center
                         font-semibold py-3.5 rounded-2xl transition-colors duration-200"
            >
              Xem trên Booking.com →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
