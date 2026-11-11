import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, TrendingUp, TrendingDown, AlertTriangle, ChevronLeft, ChevronRight, Filter, Bell } from 'lucide-react';

// ─── African Economic Events Database ─────────────────────────────────
const ECONOMIC_EVENTS = [
  { id: 'za_rate_q1', code: 'ZA', flag: '🇿🇦', impact: 'high', category: 'rates', recurrence: 'bimonthly', months: [1, 3, 5, 7, 9, 11], day: 'third_thursday' },
  { id: 'za_cpi',     code: 'ZA', flag: '🇿🇦', impact: 'high', category: 'inflation', recurrence: 'monthly', dayOfMonth: 20 },
  { id: 'za_gdp',     code: 'ZA', flag: '🇿🇦', impact: 'high', category: 'gdp', recurrence: 'quarterly', months: [3, 6, 9, 12], dayOfMonth: 5 },
  { id: 'za_pmi',     code: 'ZA', flag: '🇿🇦', impact: 'medium', category: 'pmi', recurrence: 'monthly', dayOfMonth: 1 },
  { id: 'za_trade',   code: 'ZA', flag: '🇿🇦', impact: 'medium', category: 'trade', recurrence: 'monthly', dayOfMonth: 28 },
  { id: 'ng_rate',    code: 'NG', flag: '🇳🇬', impact: 'high', category: 'rates', recurrence: 'bimonthly', months: [1, 3, 5, 7, 9, 11], day: 'last_tuesday' },
  { id: 'ng_cpi',     code: 'NG', flag: '🇳🇬', impact: 'high', category: 'inflation', recurrence: 'monthly', dayOfMonth: 15 },
  { id: 'ng_gdp',     code: 'NG', flag: '🇳🇬', impact: 'high', category: 'gdp', recurrence: 'quarterly', months: [2, 5, 8, 11], dayOfMonth: 22 },
  { id: 'ng_pmi',     code: 'NG', flag: '🇳🇬', impact: 'medium', category: 'pmi', recurrence: 'monthly', dayOfMonth: 3 },
  { id: 'eg_rate',    code: 'EG', flag: '🇪🇬', impact: 'high', category: 'rates', recurrence: 'bimonthly', months: [2, 4, 6, 8, 10, 12], day: 'third_thursday' },
  { id: 'eg_cpi',     code: 'EG', flag: '🇪🇬', impact: 'high', category: 'inflation', recurrence: 'monthly', dayOfMonth: 10 },
  { id: 'eg_gdp',     code: 'EG', flag: '🇪🇬', impact: 'high', category: 'gdp', recurrence: 'quarterly', months: [3, 6, 9, 12], dayOfMonth: 15 },
  { id: 'eg_pmi',     code: 'EG', flag: '🇪🇬', impact: 'medium', category: 'pmi', recurrence: 'monthly', dayOfMonth: 4 },
  { id: 'ma_rate',    code: 'MA', flag: '🇲🇦', impact: 'high', category: 'rates', recurrence: 'quarterly', months: [3, 6, 9, 12], day: 'third_tuesday' },
  { id: 'ma_cpi',     code: 'MA', flag: '🇲🇦', impact: 'medium', category: 'inflation', recurrence: 'monthly', dayOfMonth: 20 },
  { id: 'ma_gdp',     code: 'MA', flag: '🇲🇦', impact: 'high', category: 'gdp', recurrence: 'quarterly', months: [3, 6, 9, 12], dayOfMonth: 28 },
  { id: 'ke_rate',    code: 'KE', flag: '🇰🇪', impact: 'high', category: 'rates', recurrence: 'bimonthly', months: [2, 4, 6, 8, 10, 12], day: 'first_monday' },
  { id: 'ke_cpi',     code: 'KE', flag: '🇰🇪', impact: 'medium', category: 'inflation', recurrence: 'monthly', dayOfMonth: 28 },
  { id: 'ke_gdp',     code: 'KE', flag: '🇰🇪', impact: 'high', category: 'gdp', recurrence: 'quarterly', months: [3, 6, 9, 12], dayOfMonth: 28 },
  { id: 'ke_pmi',     code: 'KE', flag: '🇰🇪', impact: 'medium', category: 'pmi', recurrence: 'monthly', dayOfMonth: 5 },
  { id: 'tn_rate',    code: 'TN', flag: '🇹🇳', impact: 'high', category: 'rates', recurrence: 'quarterly', months: [3, 6, 9, 12], dayOfMonth: 15 },
  { id: 'tn_cpi',     code: 'TN', flag: '🇹🇳', impact: 'medium', category: 'inflation', recurrence: 'monthly', dayOfMonth: 24 },
  { id: 'gh_rate',    code: 'GH', flag: '🇬🇭', impact: 'high', category: 'rates', recurrence: 'bimonthly', months: [1, 3, 5, 7, 9, 11], day: 'last_monday' },
  { id: 'gh_cpi',     code: 'GH', flag: '🇬🇭', impact: 'medium', category: 'inflation', recurrence: 'monthly', dayOfMonth: 12 },
  { id: 'xof_rate',   code: 'XOF', flag: '🇨🇮', impact: 'high', category: 'rates', recurrence: 'quarterly', months: [3, 6, 9, 12], dayOfMonth: 7 },
  { id: 'xaf_rate',   code: 'XAF', flag: '🇨🇲', impact: 'high', category: 'rates', recurrence: 'quarterly', months: [3, 6, 9, 12], dayOfMonth: 22 },
  { id: 'mu_rate',    code: 'MU', flag: '🇲🇺', impact: 'medium', category: 'rates', recurrence: 'quarterly', months: [3, 6, 9, 12], dayOfMonth: 12 },
  { id: 'bw_rate',    code: 'BW', flag: '🇧🇼', impact: 'medium', category: 'rates', recurrence: 'bimonthly', months: [2, 4, 6, 8, 10, 12], dayOfMonth: 10 },
];

const COUNTRIES = ['all', 'ZA', 'NG', 'EG', 'MA', 'KE', 'TN', 'GH', 'XOF', 'XAF', 'MU', 'BW'];
const COUNTRY_FLAGS = { ZA: '🇿🇦', NG: '🇳🇬', EG: '🇪🇬', MA: '🇲🇦', KE: '🇰🇪', TN: '🇹🇳', GH: '🇬🇭', XOF: '🇨🇮', XAF: '🇨🇲', MU: '🇲🇺', BW: '🇧🇼' };
const CATEGORIES = ['all', 'rates', 'inflation', 'gdp', 'pmi', 'trade'];

function generateEventsForMonth(year, month) {
  const events = [];
  ECONOMIC_EVENTS.forEach(evt => {
    let dates = [];
    if (evt.recurrence === 'monthly') {
      const d = Math.min(evt.dayOfMonth, new Date(year, month + 1, 0).getDate());
      dates.push(new Date(year, month, d));
    } else if (evt.recurrence === 'bimonthly' && evt.months?.includes(month + 1)) {
      if (evt.dayOfMonth) { const d = Math.min(evt.dayOfMonth, new Date(year, month + 1, 0).getDate()); dates.push(new Date(year, month, d)); }
      else if (evt.day) { dates.push(getNthWeekday(year, month, evt.day)); }
    } else if (evt.recurrence === 'quarterly' && evt.months?.includes(month + 1)) {
      if (evt.dayOfMonth) { const d = Math.min(evt.dayOfMonth, new Date(year, month + 1, 0).getDate()); dates.push(new Date(year, month, d)); }
      else if (evt.day) { dates.push(getNthWeekday(year, month, evt.day)); }
    }
    dates.forEach(date => {
      if (date) {
        while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
        events.push({ ...evt, date: new Date(date) });
      }
    });
  });
  return events.sort((a, b) => a.date - b.date);
}

function getNthWeekday(year, month, rule) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  if (rule === 'third_thursday') { let c = 0; for (let d = 1; d <= daysInMonth; d++) { if (new Date(year, month, d).getDay() === 4) { c++; if (c === 3) return new Date(year, month, d); } } }
  if (rule === 'third_tuesday') { let c = 0; for (let d = 1; d <= daysInMonth; d++) { if (new Date(year, month, d).getDay() === 2) { c++; if (c === 3) return new Date(year, month, d); } } }
  if (rule === 'last_tuesday') { for (let d = daysInMonth; d >= 1; d--) { if (new Date(year, month, d).getDay() === 2) return new Date(year, month, d); } }
  if (rule === 'last_monday') { for (let d = daysInMonth; d >= 1; d--) { if (new Date(year, month, d).getDay() === 1) return new Date(year, month, d); } }
  if (rule === 'first_monday') { for (let d = 1; d <= 7; d++) { if (new Date(year, month, d).getDay() === 1) return new Date(year, month, d); } }
  return new Date(year, month, 15);
}

const tabBtnStyle = (active) => ({
  padding: '0.4rem 0.85rem', borderRadius: '8px', border: 'none',
  background: active ? 'var(--cream-deep)' : 'transparent',
  color: active ? 'var(--ink)' : 'var(--ink-mute)',
  fontFamily: 'var(--font-body)', fontSize: '0.8rem',
  fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s',
});

const EconomicCalendar = () => {
  const { t, i18n } = useTranslation();
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterImpact, setFilterImpact] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [selectedDate, setSelectedDate] = useState(null);

  const MONTHS = t('calendar.months', { returnObjects: true });
  const DAYS = t('calendar.days', { returnObjects: true });

  const getImpactConfig = () => ({
    high:   { label: t('calendar.impact.high'),   color: 'var(--terracotta)', bg: 'rgba(194,73,22,0.08)',   border: 'rgba(194,73,22,0.2)',   icon: AlertTriangle },
    medium: { label: t('calendar.impact.medium'), color: 'var(--sun)',         bg: 'rgba(232,170,11,0.08)', border: 'rgba(232,170,11,0.2)', icon: TrendingUp },
    low:    { label: t('calendar.impact.low'),    color: 'var(--forest)',      bg: 'rgba(30,77,58,0.08)',   border: 'rgba(30,77,58,0.2)',   icon: TrendingDown },
  });

  const events = useMemo(() => {
    let evts = generateEventsForMonth(currentYear, currentMonth);
    if (filterCategory !== 'all') evts = evts.filter(e => e.category === filterCategory);
    if (filterCountry !== 'all') evts = evts.filter(e => e.code === filterCountry);
    if (filterImpact !== 'all') evts = evts.filter(e => e.impact === filterImpact);
    return evts;
  }, [currentYear, currentMonth, filterCategory, filterCountry, filterImpact]);

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); };
  const goToday = () => { setCurrentMonth(now.getMonth()); setCurrentYear(now.getFullYear()); };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = [];
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [currentYear, currentMonth]);

  const eventsForDay = (day) => day ? events.filter(e => e.date.getDate() === day) : [];
  const isToday = (day) => day && now.getFullYear() === currentYear && now.getMonth() === currentMonth && now.getDate() === day;
  const isPast = (day) => day && new Date(currentYear, currentMonth, day) < new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const upcomingEvents = useMemo(() => {
    const upcoming = [];
    for (let i = 0; i < 3; i++) {
      const m = (now.getMonth() + i) % 12;
      const y = now.getFullYear() + Math.floor((now.getMonth() + i) / 12);
      upcoming.push(...generateEventsForMonth(y, m));
    }
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekLater = new Date(today.getTime() + 7 * 86400000);
    return upcoming.filter(e => e.date >= today && e.date <= weekLater).sort((a, b) => a.date - b.date);
  }, []);

  const getEventName = (evt) => t(`calendar.eventNames.${evt.id}`, evt.id);
  const getCountryName = (code) => t(`calendar.countryNames.${code}`, t(`countries.${code}`, code));

  const locale = i18n.language.startsWith('ar') ? 'ar' : i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US';

  const IMPACT_CONFIG = getImpactConfig();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.25rem', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <Calendar style={{ width: '20px', height: '20px', color: 'var(--terracotta)' }} />
            {t('calendar.title')}
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ink-mute)' }}>
            {t('calendar.subtitle', { count: ECONOMIC_EVENTS.length })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '10px', padding: '0.3rem' }}>
          <button onClick={() => setViewMode('list')} style={tabBtnStyle(viewMode === 'list')}>{t('calendar.viewList')}</button>
          <button onClick={() => setViewMode('calendar')} style={tabBtnStyle(viewMode === 'calendar')}>{t('calendar.viewCalendar')}</button>
        </div>
      </div>

      {/* Upcoming Events Banner */}
      {upcomingEvents.length > 0 && (
        <div style={{ background: 'rgba(194,73,22,0.06)', border: '1.5px solid rgba(194,73,22,0.15)', borderRadius: '14px', padding: '0.85rem 1rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--terracotta)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Bell style={{ width: '12px', height: '12px' }} /> {t('calendar.next7Days')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {upcomingEvents.slice(0, 6).map((evt, i) => {
              const imp = IMPACT_CONFIG[evt.impact];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.65rem', borderRadius: '8px', background: imp.bg, border: `1px solid ${imp.border}` }}>
                  <span style={{ fontSize: '0.9rem' }}>{evt.flag}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--ink)' }}>{getEventName(evt)}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)' }}>
                      {evt.date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '12px', padding: '0.65rem 0.85rem' }}>
        <Filter style={{ width: '14px', height: '14px', color: 'var(--ink-mute)', flexShrink: 0 }} />
        <select
          value={filterCountry}
          onChange={e => setFilterCountry(e.target.value)}
          aria-label={t('calendar.allCountries')}
          style={{ background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.1)', borderRadius: '8px', padding: '0.3rem 0.6rem', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink)', outline: 'none' }}
        >
          <option value="all">{t('calendar.allCountries')}</option>
          {COUNTRIES.filter(c => c !== 'all').map(c => (
            <option key={c} value={c}>{COUNTRY_FLAGS[c]} {getCountryName(c)}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)} style={tabBtnStyle(filterCategory === cat)}>
              {t(`calendar.categories.${cat}`)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
          {['all', 'high', 'medium'].map(imp => (
            <button key={imp} onClick={() => setFilterImpact(imp)} style={tabBtnStyle(filterImpact === imp)}>
              {t(`calendar.impact.${imp}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={prevMonth} style={{ padding: '0.5rem', background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '10px', cursor: 'pointer', color: 'var(--ink-mute)', display: 'flex' }}>
          <ChevronLeft style={{ width: '18px', height: '18px' }} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.1rem', color: 'var(--ink)' }}>
            {Array.isArray(MONTHS) ? MONTHS[currentMonth] : MONTHS} {currentYear}
          </h3>
          <button onClick={goToday} style={{ padding: '0.2rem 0.65rem', background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ink-mute)', cursor: 'pointer' }}>
            {t('calendar.today')}
          </button>
        </div>
        <button onClick={nextMonth} style={{ padding: '0.5rem', background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '10px', cursor: 'pointer', color: 'var(--ink-mute)', display: 'flex' }}>
          <ChevronRight style={{ width: '18px', height: '18px' }} />
        </button>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1.5px solid rgba(26,20,16,0.06)' }}>
            {(Array.isArray(DAYS) ? DAYS : ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']).map((d, i) => (
              <div key={i} style={{ padding: '0.5rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--ink-mute)' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {calendarDays.map((day, i) => {
              const dayEvents = eventsForDay(day);
              const today = isToday(day);
              const past = isPast(day);
              return (
                <div key={i} onClick={() => day && setSelectedDate(day === selectedDate ? null : day)}
                  style={{ minHeight: '70px', borderBottom: '1px solid rgba(26,20,16,0.05)', borderRight: '1px solid rgba(26,20,16,0.05)', padding: '0.35rem', cursor: day ? 'pointer' : 'default', background: today ? 'rgba(194,73,22,0.05)' : selectedDate === day ? 'var(--cream-deep)' : 'transparent', opacity: past && !today ? 0.45 : 1, transition: 'background 0.15s' }}
                >
                  {day && (
                    <>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: today ? 700 : 400, color: today ? 'var(--terracotta)' : 'var(--ink-mute)', marginBottom: '0.25rem' }}>{day}</div>
                      {dayEvents.slice(0, 3).map((evt, j) => {
                        const imp = IMPACT_CONFIG[evt.impact];
                        return (
                          <div key={j} style={{ fontSize: '0.65rem', padding: '0.15rem 0.35rem', borderRadius: '4px', marginBottom: '0.15rem', background: imp.bg, color: imp.color, fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {evt.flag} {getEventName(evt).slice(0, 18)}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--ink-mute)' }}>
                          {t('calendar.moreEvents', { count: dayEvents.length - 3 })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Calendar style={{ width: '40px', height: '40px', color: 'var(--ink-mute)', opacity: 0.3, margin: '0 auto 0.75rem', display: 'block' }} />
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--ink-mute)' }}>{t('calendar.noEvents')}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)', opacity: 0.7, marginTop: '0.25rem' }}>{t('calendar.noEventsHint')}</div>
            </div>
          ) : events.map((evt, i) => {
            const imp = IMPACT_CONFIG[evt.impact];
            const ImpactIcon = imp.icon;
            const todayEvt = evt.date.toDateString() === now.toDateString();
            const past = evt.date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const dayIdx = evt.date.getDay() === 0 ? 6 : evt.date.getDay() - 1;
            const dayLabel = Array.isArray(DAYS) ? DAYS[dayIdx] : '';
            const monthLabel = Array.isArray(MONTHS) ? MONTHS[evt.date.getMonth()].slice(0, 3) : '';

            return (
              <div key={`${evt.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', borderRadius: '12px', border: `1.5px solid ${todayEvt ? 'rgba(194,73,22,0.25)' : imp.border}`, background: todayEvt ? 'rgba(194,73,22,0.05)' : imp.bg, opacity: past ? 0.5 : 1, transition: 'all 0.15s' }}>
                {/* Date */}
                <div style={{ width: '44px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)' }}>{dayLabel}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: todayEvt ? 'var(--terracotta)' : 'var(--ink-soft)', lineHeight: 1.1 }}>{evt.date.getDate()}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--ink-mute)' }}>{monthLabel}</div>
                </div>
                <div style={{ width: '1px', height: '36px', background: 'rgba(26,20,16,0.1)', flexShrink: 0 }} />
                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{evt.flag}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)', marginBottom: '0.15rem' }}>{getEventName(evt)}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>{getCountryName(evt.code)} · {t(`calendar.categories.${evt.category}`)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.6rem', borderRadius: '8px', background: imp.bg, flexShrink: 0, border: `1px solid ${imp.border}` }}>
                  <ImpactIcon style={{ width: '12px', height: '12px', color: imp.color }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, color: imp.color }}>{imp.label}</span>
                </div>
                {todayEvt && (
                  <span style={{ padding: '0.2rem 0.5rem', background: 'var(--terracotta)', color: 'var(--cream)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, borderRadius: '999px', flexShrink: 0 }}>
                    {t('calendar.todayBadge')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stats footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.07)', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ink-mute)' }}>
        <span>{t('calendar.statsEvents', { count: events.length, month: Array.isArray(MONTHS) ? MONTHS[currentMonth] : '' })}</span>
        <span>{t('calendar.statsHighImpact', { count: events.filter(e => e.impact === 'high').length })}</span>
        <span>{t('calendar.statsCountries', { count: new Set(events.map(e => e.code)).size })}</span>
      </div>
    </div>
  );
};

export default EconomicCalendar;
