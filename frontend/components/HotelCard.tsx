'use client'

import { useState } from 'react'

export interface Hotel {
  hotel_id: string
  name: string
  city: string
  address?: string
  price_per_night_vnd?: number
  price_tier?: string
  rating_score?: number
  rating_label?: string
  review_count?: number
  star_rating?: number
  primary_image?: string
  description?: string
  availability_label?: string
  distance_from_center_m?: number
  url?: string
  discount_pct?: number
}

interface Props {
  hotel: Hotel
  onClick: (hotel: Hotel) => void
  index: number
}

function formatVND(amount?: number) {
  if (!amount) return 'Liên hệ'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDistance(m?: number) {
  if (!m) return null
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`
}

function Stars({ count }: { count?: number }) {
  if (!count) return null
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3 h-3 ${i < count ? 'text-amber-400' : 'text-gray-200'}`}
          fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

const PRICE_TIER_COLORS: Record<string, string> = {
  'budget':    'bg-emerald-50 text-emerald-700 border-emerald-200',
  'mid-range': 'bg-blue-50 text-blue-700 border-blue-200',
  'premium':   'bg-purple-50 text-purple-700 border-purple-200',
  'luxury':    'bg-amber-50 text-amber-700 border-amber-200',
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80'

export default function HotelCard({ hotel, onClick, index }: Props) {
  const [imgError, setImgError] = useState(false)
  const tierColor = PRICE_TIER_COLORS[hotel.price_tier || ''] || 'bg-gray-50 text-gray-600 border-gray-200'
  const dist = formatDistance(hotel.distance_from_center_m)

  return (
    <div
      className="group bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover
                 transition-all duration-300 cursor-pointer hover:-translate-y-1 animate-fade-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both', opacity: 0 }}
      onClick={() => onClick(hotel)}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-sand-100">
        <img
          src={imgError ? FALLBACK_IMAGE : (hotel.primary_image || FALLBACK_IMAGE)}
          alt={hotel.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
        {/* Discount badge */}
        {hotel.discount_pct && hotel.discount_pct > 0 && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-semibold
                          px-2 py-1 rounded-full">
            -{Math.round(hotel.discount_pct)}%
          </div>
        )}
        {/* Availability */}
        {hotel.availability_label && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white
                          text-xs px-2 py-1 rounded-full">
            {hotel.availability_label}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Stars + Tier */}
        <div className="flex items-center justify-between mb-1.5">
          <Stars count={hotel.star_rating} />
          {hotel.price_tier && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tierColor}`}>
              {hotel.price_tier}
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-display font-semibold text-gray-900 text-base leading-snug
                       line-clamp-2 mb-1 group-hover:text-ocean-600 transition-colors">
          {hotel.name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{hotel.city}{dist ? ` · ${dist} từ TT` : ''}</span>
        </div>

        {/* Rating + Price */}
        <div className="flex items-end justify-between">
          {hotel.rating_score ? (
            <div className="flex items-center gap-2">
              <span className="bg-ocean-500 text-white text-sm font-bold px-2 py-0.5 rounded-lg">
                {hotel.rating_score.toFixed(1)}
              </span>
              <div>
                <div className="text-xs font-medium text-gray-700">{hotel.rating_label}</div>
                {hotel.review_count && (
                  <div className="text-xs text-gray-400">{hotel.review_count.toLocaleString()} đánh giá</div>
                )}
              </div>
            </div>
          ) : <div />}

          <div className="text-right">
            <div className="text-base font-bold text-gray-900">{formatVND(hotel.price_per_night_vnd)}</div>
            <div className="text-xs text-gray-400">/đêm</div>
          </div>
        </div>
      </div>
    </div>
  )
}
