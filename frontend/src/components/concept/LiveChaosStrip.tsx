import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/** Playful stacked bars suggesting spikes in chaos scores — purely decorative. */
export function LiveChaosStrip({ className }: { className?: string }) {
  const bars = [0.35, 0.72, 0.48, 0.91, 0.55, 0.8, 0.42, 0.67, 0.38, 0.88]
  return (
    <div
      className={cn(
        'flex h-24 items-end justify-center gap-1 sm:gap-1.5',
        className,
      )}
      aria-hidden
    >
      {bars.map((base, i) => (
        <div
          key={i}
          className="concept-chaos-bar w-2 rounded-full bg-gradient-to-t from-[#1a3263] to-[#fab95b] opacity-80 sm:w-2.5"
          style={
            {
              height: `${18 + base * 62}%`,
              animation: 'conceptChaosBar 2.4s ease-in-out infinite',
              animationDelay: `${i * 0.12}s`,
            } as CSSProperties
          }
        />
      ))}
      <style>{`
        @keyframes conceptChaosBar {
          0%, 100% { transform: scaleY(1); opacity: 0.75; }
          50% { transform: scaleY(1.08); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .concept-chaos-bar { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
