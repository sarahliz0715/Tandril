import React from 'react';

export default function TandrilLogo({ className = "w-8 h-8" }) {
  // Clean, modern "T" logo that looks great at any size
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="100" height="100" rx="20" fill="#f7fee7"/>
      {/* Simple, clean "T" design */}
      <path 
        d="M25 30 L75 30 M50 30 L50 75"
        stroke="#166534" 
        strokeWidth="12" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}