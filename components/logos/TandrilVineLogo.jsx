import React from 'react';
export default function TandrilVineLogo({ className = "" }) {
    return React.createElement(
          'span',
      { className: "font-bold text-emerald-700 tracking-tight text-xl leading-none " + className },
          'Tandril'
        );
}
