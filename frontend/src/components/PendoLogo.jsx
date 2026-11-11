import React from 'react';

/**
 * PendoLogo — P + ∞ géométrique moderne.
 * Deux cercles parfaits tangents + hampe verticale.
 * Dégradé symétrique : fondu aux deux extrémités.
 *
 * @param {number} size   hauteur en px (défaut 36)
 * @param {string} theme  'dark'  → trait clair  (sur fond sombre)
 *                        'light' → trait foncé  (sur fond clair)
 */
const PendoLogo = ({ size = 36, theme = 'dark' }) => {
  const color = theme === 'dark' ? '#FAF3E8' : '#1A1410';
  const idLeft  = `pendo-fade-left-${theme}`;
  const idRight = `pendo-fade-right-${theme}`;

  // Géométrie : deux cercles tangents de rayon r
  const r  = 32;
  const cy = 48;            // centre cercle — haut du viewbox (≈36%) comme le bol du P
  const cx1 = 60;           // centre cercle gauche (bol du P)
  const cx2 = cx1 + r * 2;  // centre cercle droit  (∞ extension) = 124
  const lx  = cx1 - r;      // extrémité gauche  = 28
  const mid = cx1 + r;      // point de tangence  = 92
  const rx  = cx2 + r;      // extrémité droite   = 156

  // Tige : commence au sommet des cercles (à fleur), descend bien en dessous
  const stemTop    = cy - r;         // = 16 — à fleur du haut de l'infini
  const stemBottom = cy + r + 54;    // = 134 — longue jambe sous les cercles

  // Viewbox
  const vw = rx + 18;       // 174
  const vh = stemBottom + 8; // 142

  const sw = 7.5; // épaisseur de trait — fin et précis

  return (
    <svg
      width={size * (vw / vh)}
      height={size}
      viewBox={`0 0 ${vw} ${vh}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PENDO"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        {/* Fondu gauche accentué : invisible → opaque */}
        <linearGradient id={idLeft} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={color} stopOpacity="0"    />
          <stop offset="35%"  stopColor={color} stopOpacity="0.08" />
          <stop offset="65%"  stopColor={color} stopOpacity="0.75" />
          <stop offset="100%" stopColor={color} stopOpacity="1"    />
        </linearGradient>
        {/* Fondu droit accentué : opaque → invisible */}
        <linearGradient id={idRight} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={color} stopOpacity="1"    />
          <stop offset="35%"  stopColor={color} stopOpacity="0.75" />
          <stop offset="65%"  stopColor={color} stopOpacity="0.08" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* Hampe verticale — centrée sur cy, répartie équitablement */}
      <line
        x1={mid} y1={stemTop}
        x2={mid} y2={stemBottom}
        stroke={color}
        strokeWidth={sw + 1}
        strokeLinecap="round"
      />

      {/* Bol du P — cercle gauche parfait
          M mid,cy  → arc supérieur CCW → lx,cy  → arc inférieur CCW → mid,cy */}
      <path
        d={`M ${mid},${cy} A ${r},${r} 0 0 0 ${lx},${cy} A ${r},${r} 0 0 0 ${mid},${cy}`}
        stroke={`url(#${idLeft})`}
        strokeWidth={sw}
        strokeLinecap="round"
        fill="none"
      />

      {/* Extension ∞ — cercle droit parfait
          M mid,cy  → arc supérieur CW → rx,cy  → arc inférieur CW → mid,cy */}
      <path
        d={`M ${mid},${cy} A ${r},${r} 0 0 1 ${rx},${cy} A ${r},${r} 0 0 1 ${mid},${cy}`}
        stroke={`url(#${idRight})`}
        strokeWidth={sw}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};

export default PendoLogo;
