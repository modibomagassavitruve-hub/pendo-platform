import React from "react";
import { TrendingUp, TrendingDown, BarChart3, Globe, Activity } from "lucide-react";

// Sparkline heights are static decorative data — computed once, stable across renders
// Shape encodes up/down trend visually (rising or falling pattern)
const SPARKLINE_HEIGHTS = {
  JSE:  [30, 45, 40, 55, 50, 62, 58, 70, 65, 78, 72, 85],
  NGX:  [40, 52, 48, 65, 60, 72, 68, 80, 75, 88, 82, 95],
  EGX:  [80, 72, 78, 65, 70, 58, 62, 50, 55, 42, 48, 35],
  BRVM: [45, 55, 50, 62, 58, 68, 64, 74, 70, 80, 76, 86],
  MASI: [38, 50, 44, 58, 52, 64, 60, 72, 66, 78, 73, 83],
  NSE:  [75, 68, 72, 60, 65, 52, 57, 45, 50, 38, 43, 30],
};

const DashboardMockup = () => {
  // Values mirrored from realTimeMarkets.js MARKET_CONFIG baseValues (updated 2026-04-04)
  const markets = [
    { name: "JSE",  country: "🇿🇦", value: "116,123", change: "+1.2%", up: true  },
    { name: "NGX",  country: "🇳🇬", value: "201,699", change: "+2.1%", up: true  },
    { name: "EGX",  country: "🇪🇬", value: "47,276",  change: "-0.4%", up: false },
    { name: "BRVM", country: "🌍",  value: "410.00",  change: "+0.7%", up: true  },
    { name: "MASI", country: "🇲🇦", value: "17,515",  change: "+0.8%", up: true  },
    { name: "NSE",  country: "🇰🇪", value: "199.00",  change: "-0.3%", up: false },
  ];

  const stats = [
    { label: "Bourses", value: "17", icon: Globe, bg: "rgba(194,73,22,0.08)", color: "var(--terracotta)" },
    { label: "Hausse", value: "14", icon: TrendingUp, bg: "rgba(30,77,58,0.08)", color: "var(--forest)" },
    { label: "Volume", value: "2.4B", icon: Activity, bg: "rgba(232,170,11,0.1)", color: "#9A6E00" },
  ];

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--cream)', padding: '1rem 1.25rem', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: 'var(--terracotta)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart3 style={{ width: '16px', height: '16px', color: 'var(--cream)' }} />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '0.875rem', color: 'var(--ink)', margin: 0 }}>PENDO Dashboard</h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--ink-mute)', margin: 0 }}>Marchés Africains en Direct</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.75rem', borderRadius: '999px', background: 'rgba(30,77,58,0.1)', border: '1px solid rgba(30,77,58,0.2)' }}>
          <span style={{ position: 'relative', display: 'flex', width: '6px', height: '6px' }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--forest)', opacity: 0.5, animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }} />
            <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', width: '6px', height: '6px', background: 'var(--forest)' }} />
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--forest)' }}>LIVE</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2" style={{ marginBottom: '1.25rem' }}>
        {stats.map((stat) => (
          <div key={stat.label} style={{
            background: stat.bg,
            border: '1px solid rgba(26,20,16,0.06)',
            borderRadius: '10px',
            padding: '0.65rem 0.75rem',
          }}>
            <stat.icon style={{ width: '14px', height: '14px', color: stat.color, marginBottom: '0.35rem' }} />
            <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', margin: 0 }}>{stat.value}</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--ink-mute)', margin: 0 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Markets grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {markets.map((m) => (
          <div key={m.name} style={{
            background: 'var(--cream-glow)',
            border: '1.5px solid rgba(26,20,16,0.07)',
            borderRadius: '10px',
            padding: '0.65rem 0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.875rem' }}>{m.country}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--ink)' }}>{m.name}</span>
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700,
                padding: '0.15rem 0.4rem', borderRadius: '999px',
                background: m.up ? 'rgba(30,77,58,0.1)' : 'rgba(194,73,22,0.1)',
                color: m.up ? 'var(--forest)' : 'var(--terracotta)',
                display: 'flex', alignItems: 'center', gap: '0.2rem',
              }}>
                {m.up ? <TrendingUp style={{ width: '9px', height: '9px' }} /> : <TrendingDown style={{ width: '9px', height: '9px' }} />}
                {m.change}
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--ink)', margin: '0 0 0.4rem' }}>{m.value}</p>
            {/* Mini sparkline */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1px', height: '20px' }}>
              {(SPARKLINE_HEIGHTS[m.name] || SPARKLINE_HEIGHTS.JSE).map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, borderRadius: '2px',
                    background: m.up ? 'rgba(30,77,58,0.25)' : 'rgba(194,73,22,0.2)',
                    height: `${h}%`,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardMockup;
