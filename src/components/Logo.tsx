"use client";
import { useId } from "react";

export function Logo({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "-");
  const ids = {
    gradient: `${uid}-ag`,
    glow: `${uid}-sg`,
    pillBg: `${uid}-pb`,
    border: `${uid}-bg`,
    clip: `${uid}-pc`,
  };

  return (
    <div className={`inline-flex items-center ${className}`} style={{ aspectRatio: "220 / 56" }}>
      <svg
        viewBox="0 0 220 56"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Animated gradient for 800 */}
          <linearGradient id={ids.gradient} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#84cc16">
              <animate
                attributeName="stop-color"
                values="#84cc16;#14b8a6;#06b6d4;#84cc16"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="50%" stopColor="#14b8a6">
              <animate
                attributeName="stop-color"
                values="#14b8a6;#06b6d4;#84cc16;#14b8a6"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#06b6d4">
              <animate
                attributeName="stop-color"
                values="#06b6d4;#84cc16;#14b8a6;#06b6d4"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>

          {/* Subtle glow for 800 — keep text crisp */}
          <filter id={ids.glow} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Background for pill */}
          <linearGradient id={ids.pillBg} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#84cc16" />
            <stop offset="50%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          {/* Border gradient */}
          <linearGradient id={ids.border} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#84cc16">
              <animate
                attributeName="stop-color"
                values="#84cc16;#14b8a6;#06b6d4;#84cc16"
                dur="2s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#06b6d4">
              <animate
                attributeName="stop-color"
                values="#06b6d4;#84cc16;#14b8a6;#06b6d4"
                dur="2s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        </defs>

        {/* Full pill border (animated gradient) - wraps around both CREDIT and 800 */}
        <rect
          x="4"
          y="4"
          width="212"
          height="48"
          rx="24"
          fill="none"
          stroke={`url(#${ids.border})`}
          strokeWidth="2.5"
        />

        {/* Full pill background */}
        <rect
          x="6"
          y="6"
          width="208"
          height="44"
          rx="22"
          fill={`url(#${ids.pillBg})`}
        />

        {/* Animated shine sweep */}
        <clipPath id={ids.clip}>
          <rect x="6" y="6" width="208" height="44" rx="22" />
        </clipPath>
        <rect
          x="-40"
          y="0"
          width="50"
          height="60"
          fill="#14b8a6"
          opacity="0.07"
          clipPath={`url(#${ids.clip})`}
        >
          <animate
            attributeName="x"
            values="-40;220;-40"
            dur="3s"
            repeatCount="indefinite"
          />
        </rect>

        {/* CREDIT text */}
        <text
          x="18"
          y="39"
          fontFamily="AmericanCaptain, system-ui, sans-serif"
          fontSize="30"
          fill="#0f172a"
          letterSpacing="0"
        >
          CREDIT
        </text>

        {/* 800 text */}
        <text
          x="155"
          y="39"
          fontFamily="AmericanCaptain, system-ui, sans-serif"
          fontSize="32"
          fill="#ffffff"
          textAnchor="middle"
          letterSpacing="0"
        >
          800
        </text>

        {/* Sparkle effects */}
        <g fill="#14b8a6">
          <circle cx="16" cy="14" r="1.5" opacity="0.9">
            <animate
              attributeName="opacity"
              values="0.9;0.3;0.9"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="204" cy="42" r="1.2" opacity="0.7">
            <animate
              attributeName="opacity"
              values="0.7;0.2;0.7"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="120" cy="12" r="1" opacity="0.6">
            <animate
              attributeName="opacity"
              values="0.6;0.1;0.6"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="45" cy="44" r="1" opacity="0.5">
            <animate
              attributeName="opacity"
              values="0.5;0.2;0.5"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      </svg>
    </div>
  );
}

export function LogoIcon({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "-");
  const ids = {
    gradient: `${uid}-ig`,
    glow: `${uid}-igl`,
    border: `${uid}-ib`,
  };

  return (
    <svg
      viewBox="0 0 56 56"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={ids.gradient} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#84cc16">
            <animate
              attributeName="stop-color"
              values="#84cc16;#14b8a6;#06b6d4;#84cc16"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#06b6d4">
            <animate
              attributeName="stop-color"
              values="#06b6d4;#84cc16;#14b8a6;#06b6d4"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>

        <filter id={ids.glow} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id={ids.border} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#84cc16">
            <animate
              attributeName="stop-color"
              values="#84cc16;#14b8a6;#06b6d4;#84cc16"
              dur="2s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#06b6d4">
            <animate
              attributeName="stop-color"
              values="#06b6d4;#84cc16;#14b8a6;#06b6d4"
              dur="2s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>

      {/* Outer ring with animated gradient */}
      <circle
        cx="28"
        cy="28"
        r="26"
        fill="none"
        stroke={`url(#${ids.border})`}
        strokeWidth="2"
      />

      {/* Inner circle */}
      <circle cx="28" cy="28" r="23" fill="#0f172a" />

      {/* 800 text */}
      <text
        x="28"
        y="36"
        fontFamily="AmericanCaptain, system-ui, sans-serif"
        fontSize="20"
        fill={`url(#${ids.gradient})`}
        textAnchor="middle"
        filter={`url(#${ids.glow})`}
        letterSpacing="1"
      >
        800
      </text>

      {/* Sparkles */}
      <circle cx="14" cy="16" r="1.5" fill="white" opacity="0.7">
        <animate
          attributeName="opacity"
          values="0.7;0.2;0.7"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="44" cy="38" r="1" fill="white" opacity="0.5">
        <animate
          attributeName="opacity"
          values="0.5;0.1;0.5"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}
