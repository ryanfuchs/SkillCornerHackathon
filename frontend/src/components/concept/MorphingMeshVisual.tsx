import { useId } from 'react'
import { cn } from '@/lib/utils'

/** Decorative SVG suggesting a triangulated player graph — subtle motion. */
export function MorphingMeshVisual({ className }: { className?: string }) {
  const gid = useId().replace(/:/g, '')
  return (
    <svg
      viewBox="0 0 320 240"
      className={cn('concept-morphing-mesh', className)}
      aria-hidden
      role="presentation"
    >
      <defs>
        <linearGradient
          id={`mesh-fill-${gid}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#1a3263" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#fab95b" stopOpacity={0.2} />
        </linearGradient>
      </defs>
      <g className="concept-mesh-drift">
        <polygon
          points="160,40 260,95 220,200 100,200 60,95"
          fill={`url(#mesh-fill-${gid})`}
          className="concept-mesh-pulse"
        />
        <g
          stroke="#547792"
          strokeWidth={1.2}
          strokeOpacity={0.45}
          fill="none"
          vectorEffect="non-scaling-stroke"
        >
          <line x1="160" y1="40" x2="260" y2="95" />
          <line x1="260" y1="95" x2="220" y2="200" />
          <line x1="220" y1="200" x2="100" y2="200" />
          <line x1="100" y1="200" x2="60" y2="95" />
          <line x1="60" y1="95" x2="160" y2="40" />
          <line x1="160" y1="40" x2="220" y2="200" />
          <line x1="160" y1="40" x2="100" y2="200" />
          <line x1="260" y1="95" x2="100" y2="200" />
          <line x1="60" y1="95" x2="220" y2="200" />
        </g>
        {[
          [160, 40],
          [260, 95],
          [220, 200],
          [100, 200],
          [60, 95],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={5}
            fill="#1a3263"
            className="concept-mesh-node"
            style={{ animationDelay: `${i * 0.25}s` }}
          />
        ))}
      </g>
      <style>{`
        .concept-mesh-drift { transform-origin: 160px 120px; animation: conceptMeshDrift 14s ease-in-out infinite; }
        .concept-mesh-pulse { animation: conceptMeshPulse 6s ease-in-out infinite; }
        .concept-mesh-node { transform-origin: center; animation: conceptMeshNode 3.5s ease-in-out infinite; }
        @keyframes conceptMeshDrift {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(1.5deg) scale(1.02); }
        }
        @keyframes conceptMeshPulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        @keyframes conceptMeshNode {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.12); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .concept-mesh-drift, .concept-mesh-pulse, .concept-mesh-node { animation: none !important; }
        }
      `}</style>
    </svg>
  )
}
