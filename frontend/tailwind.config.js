module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  // Pas de dark mode — thème clair chaleureux uniquement
  darkMode: false,
  theme: {
    extend: {
      colors: {
        // === Fonds chaleureux ===
        cream: {
          DEFAULT: '#FAF3E8',
          deep: '#F2E8D3',
          glow: '#FFF8EB',
        },
        // === Texte — brun chocolat ===
        ink: {
          DEFAULT: '#1A1410',
          soft: '#4A3D33',
          mute: '#7A6A5C',
        },
        // === Signature africaine ===
        terracotta: {
          DEFAULT: '#C24916',
          deep: '#8F3211',
          soft: '#E87943',
        },
        // === Croissance ===
        forest: {
          DEFAULT: '#1E4D3A',
          light: '#2D7253',
        },
        // === Accents ===
        sun: '#E8AA0B',
        berry: '#7E2B2B',
        // === Sémantique marchés ===
        up: '#1E4D3A',
        down: '#C24916',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '20px',
        xl: '32px',
      },
      boxShadow: {
        warm: '0 4px 24px -8px rgba(194, 73, 22, 0.15)',
        deep: '0 24px 48px -12px rgba(26, 20, 16, 0.18)',
        'terracotta-lg': '0 8px 32px -8px rgba(194, 73, 22, 0.35)',
      },
      animation: {
        'pulse-dot': 'pulse-dot 3s ease-in-out infinite',
        'tab-enter': 'tab-enter 0.25s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.4s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.8s ease-in-out infinite',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(0.85)', opacity: '0.75' },
        },
        'tab-enter': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
