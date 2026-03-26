'use client';

type Tab = 'chat' | 'panel';

type Props = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

export function MobileNav({ activeTab, onTabChange }: Props) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación principal">
      <div className="mobile-bottom-nav-inner">
        {/* Chat */}
        <button
          type="button"
          className={`mobile-nav-tab ${activeTab === 'chat' ? 'is-active' : ''}`}
          onClick={() => onTabChange('chat')}
          aria-label="Chat"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Chat</span>
        </button>

        {/* Panel */}
        <button
          type="button"
          className={`mobile-nav-tab ${activeTab === 'panel' ? 'is-active' : ''}`}
          onClick={() => onTabChange('panel')}
          aria-label="Panel"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span>Panel</span>
        </button>
      </div>
    </nav>
  );
}
