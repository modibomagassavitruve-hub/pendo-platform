import React from 'react';

export const Skeleton = ({ className = '' }) => (
  <div className={`skeleton rounded-lg ${className}`} />
);

export const SkeletonCard = () => (
  <div style={{
    background: 'var(--cream-glow)',
    border: '1.5px solid rgba(26,20,16,0.08)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
  }} className="space-y-4">
    <div className="flex justify-between items-start">
      <Skeleton className="w-24 h-6" />
      <Skeleton className="w-12 h-6" />
    </div>
    <div className="space-y-3">
      <Skeleton className="w-full h-4" />
      <Skeleton className="w-5/6 h-4" />
      <Skeleton className="w-4/6 h-4" />
    </div>
    <div className="pt-2 flex justify-between">
      <Skeleton className="w-16 h-4" />
      <Skeleton className="w-16 h-4" />
    </div>
  </div>
);

export const SkeletonStatCard = () => (
  <div style={{
    background: 'var(--cream-deep)',
    border: '1px solid rgba(26,20,16,0.06)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem 1rem',
  }} className="space-y-2">
    <div className="flex items-center gap-3">
      <Skeleton className="w-8 h-8 rounded-lg" />
      <div className="flex-1 space-y-1">
        <Skeleton className="w-16 h-6" />
        <Skeleton className="w-24 h-3" />
      </div>
    </div>
  </div>
);

export const SkeletonChart = () => (
  <div style={{
    background: 'var(--cream-glow)',
    border: '1.5px solid rgba(26,20,16,0.08)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
  }}>
    <div className="flex justify-between items-center mb-6">
      <Skeleton className="w-32 h-5" />
      <Skeleton className="w-24 h-5" />
    </div>
    <div className="space-y-3 h-64">
      <Skeleton className="w-full h-10 rounded-lg" />
      <Skeleton className="w-full h-10 rounded-lg" />
      <Skeleton className="w-full h-10 rounded-lg" />
      <Skeleton className="w-full h-10 rounded-lg" />
      <Skeleton className="w-full h-10 rounded-lg" />
    </div>
    <div className="mt-6 flex gap-3">
      <Skeleton className="w-20 h-4" />
      <Skeleton className="w-20 h-4" />
      <Skeleton className="w-20 h-4" />
    </div>
  </div>
);

export const SkeletonTable = () => (
  <div style={{
    background: 'var(--cream-glow)',
    border: '1.5px solid rgba(26,20,16,0.08)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  }}>
    <div style={{ borderBottom: '1px solid rgba(26,20,16,0.06)', padding: '1rem' }} className="flex gap-4">
      <Skeleton className="w-1/4 h-4" />
      <Skeleton className="w-1/4 h-4" />
      <Skeleton className="w-1/4 h-4" />
      <Skeleton className="w-1/4 h-4" />
    </div>
    {Array.from({ length: 5 }).map((_, index) => (
      <div
        key={index}
        style={{ borderBottom: index < 4 ? '1px solid rgba(26,20,16,0.04)' : 'none', padding: '1rem' }}
        className="flex gap-4"
      >
        <Skeleton className="w-1/4 h-4" />
        <Skeleton className="w-1/4 h-4" />
        <Skeleton className="w-1/4 h-4" />
        <Skeleton className="w-1/4 h-4" />
      </div>
    ))}
  </div>
);

export const SkeletonArticle = () => (
  <div style={{
    background: 'var(--cream-glow)',
    border: '1.5px solid rgba(26,20,16,0.08)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  }}>
    <Skeleton className="w-full h-40 rounded-none" />
    <div className="p-4 space-y-3">
      <Skeleton className="w-16 h-3 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-5/6 h-4" />
      </div>
      <div className="space-y-2 pt-2">
        <Skeleton className="w-full h-3" />
        <Skeleton className="w-4/5 h-3" />
      </div>
      <div className="pt-2 flex justify-between items-center">
        <Skeleton className="w-20 h-3" />
        <Skeleton className="w-16 h-3" />
      </div>
    </div>
  </div>
);

export const SkeletonStatGrid = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonStatCard key={index} />
    ))}
  </div>
);

export const SkeletonCardGrid = ({ count = 6, cols = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' }) => (
  <div className={`grid ${cols} gap-6`}>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </div>
);

export const SkeletonArticleGrid = ({ count = 4, cols = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' }) => (
  <div className={`grid ${cols} gap-6`}>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonArticle key={index} />
    ))}
  </div>
);
