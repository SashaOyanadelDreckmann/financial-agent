'use client';
import React from 'react';

type Props = {
  userName?: string | null;
  profile?: any;
  injected?: boolean;
  className?: string;
};

export default function ProfileCard({
  userName,
  profile,
  injected,
  className = '',
}: Props) {
  const initials = userName
    ? userName
        .split(' ')
        .map((s) => s[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const coherence = Math.round((profile?.profile?.coherenceScore ?? 0) * 100);

  return (
    <div className={`profile-card premium ${className}`.trim()}>
      {injected && (
        <span className="profile-badge">Inyectado</span>
      )}

      {/* HEADER */}
      <div className="profile-header">
        <div className="profile-avatar" aria-hidden>
          {initials}
        </div>

        <div className="profile-identity">
          <div className="profile-name">
            {userName ?? 'Usuario'}
          </div>
          <div className="profile-subtitle">
            Perfil financiero
          </div>
        </div>
      </div>

      {/* COHERENCE */}
      <div className="coherence">
        <div className="coherence-head">
          <span className="coherence-label">Coherencia</span>
          <span className="coherence-value">{coherence}%</span>
        </div>

        <div className="coherence-bar" aria-hidden>
          <div
            className="coherence-fill"
            style={{ width: `${coherence}%` }}
          />
        </div>
      </div>
    </div>
  );
}
