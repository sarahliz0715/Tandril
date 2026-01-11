import React from 'react';

export default function TandrilLogo({ className = "w-8 h-8" }) {
  // Curly vine design - the official Tandril logo
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="100" height="100" rx="20" fill="#f7fee7"/>
      {/* Curly vine design */}
      <path
        d="M50 30 V 78 C 50 88 40 88 40 78 M 25 35 C 45 20 55 20 75 35"
        stroke="#166534"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}