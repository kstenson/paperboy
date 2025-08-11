import React from 'react'

interface PaperboyLogoProps {
  className?: string
}

export default function PaperboyLogo({ className = "w-10 h-10" }: PaperboyLogoProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Red cap */}
      <rect x="7" y="3" width="3" height="1" fill="#E53E3E"/>
      <rect x="6" y="4" width="5" height="1" fill="#E53E3E"/>
      <rect x="8" y="2" width="1" height="1" fill="#FF8C00"/>
      
      {/* Face */}
      <rect x="7" y="5" width="3" height="2" fill="#FDBF50"/>
      <rect x="7" y="6" width="1" height="1" fill="#2D3748"/>
      <rect x="9" y="6" width="1" height="1" fill="#2D3748"/>
      
      {/* Body */}
      <rect x="6" y="7" width="1" height="2" fill="#4299E1"/>
      <rect x="7" y="7" width="3" height="3" fill="#2B6CB0"/>
      <rect x="10" y="7" width="1" height="2" fill="#4299E1"/>
      
      {/* Arms */}
      <rect x="5" y="8" width="1" height="1" fill="#FDBF50"/>
      <rect x="11" y="8" width="1" height="1" fill="#FDBF50"/>
      
      {/* Bicycle wheels (simplified) */}
      <circle cx="5" cy="18" r="2.5" stroke="currentColor" strokeWidth="0.8" fill="none"/>
      <circle cx="16" cy="18" r="2.5" stroke="currentColor" strokeWidth="0.8" fill="none"/>
      
      {/* Bicycle frame */}
      <line x1="8" y1="15" x2="13" y2="15" stroke="currentColor" strokeWidth="1"/>
      <line x1="10.5" y1="12" x2="10.5" y2="18" stroke="currentColor" strokeWidth="1"/>
      
      {/* Newspaper bag */}
      <rect x="13" y="5" width="4" height="6" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.7"/>
      <line x1="14" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="0.4" opacity="0.6"/>
      <line x1="14" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="0.4" opacity="0.6"/>
      <line x1="14" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="0.4" opacity="0.6"/>
    </svg>
  )
}