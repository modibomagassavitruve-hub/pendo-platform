import { motion } from "framer-motion";

/**
 * PENDO Animated Logo — Geometric block construction
 * Thème pastel : terracotta + ink (plus de bleu/cyan)
 */
export default function AnimatedLogo({ size = 40, showText = true, className = "" }) {
  const s = size;
  const textSize = s * 0.5;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Geometric Logo Mark */}
      <motion.div
        className="relative"
        whileHover={{ scale: 1.06 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="pendoGradPastel" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C24916" />
              <stop offset="100%" stopColor="#E87943" />
            </linearGradient>
          </defs>

          {/* ── Geometric P — built from blocks ── */}
          <motion.rect
            x="6" y="8" width="7" height="32"
            fill="url(#pendoGradPastel)"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ transformOrigin: "6px 8px" }}
          />
          <motion.rect
            x="13" y="8" width="12" height="7"
            fill="url(#pendoGradPastel)"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
            style={{ transformOrigin: "13px 8px" }}
          />
          <motion.rect
            x="22" y="15" width="6" height="10"
            fill="url(#pendoGradPastel)"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.35, ease: "easeOut" }}
            style={{ transformOrigin: "22px 15px" }}
          />
          <motion.rect
            x="13" y="22" width="9" height="6"
            fill="url(#pendoGradPastel)"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.45, ease: "easeOut" }}
            style={{ transformOrigin: "13px 22px" }}
          />

          {/* ── The Dot — terracotta ── */}
          <motion.circle
            cx="33" cy="24" r="4"
            fill="#C24916"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 400, damping: 15 }}
          />
          <motion.circle
            cx="33" cy="24" r="4"
            fill="none"
            stroke="#E87943"
            strokeWidth="1"
            initial={{ opacity: 0 }}
            animate={{ r: [4, 7, 4], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          />

          {/* ── Slanted accent ── */}
          <motion.path
            d="M39 38 L43 10 L48 10 L44 38 Z"
            fill="url(#pendoGradPastel)"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.75, duration: 0.4, ease: "easeOut" }}
          />
        </svg>
      </motion.div>

      {/* Wordmark — ink, Fraunces */}
      {showText && (
        <motion.span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            fontSize: textSize,
            lineHeight: 1.1,
            color: 'var(--ink)',
          }}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          PENDO
        </motion.span>
      )}
    </div>
  );
}
