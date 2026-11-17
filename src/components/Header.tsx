import { Search } from 'lucide-react';

export type ActiveTab = 'home' | 'browse' | 'manhwa' | 'manga' | 'library';

interface HeaderProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  onOpenSearch: () => void;
  bookmarkCount: number;
}

export function Header({
  activeTab,
  onNavigate,
  onOpenSearch,
  bookmarkCount,
}: HeaderProps) {
  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'browse', label: 'Browse' },
    { id: 'manhwa', label: 'Manhwa' },
    { id: 'manga', label: 'Manga' },
    {
      id: 'library',
      label: bookmarkCount > 0 ? `Library (${bookmarkCount})` : 'Library',
    },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="group flex items-center gap-2.5 whitespace-nowrap shrink-0 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-seal"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="text-seal shrink-0"
          >
            <rect
              x="2"
              y="2"
              width="20"
              height="20"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path
              d="M7.5 16.5V7.5L16.5 16.5V7.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-serif text-xl font-semibold tracking-tight text-ink">
            Nova Toons
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Text Navigation */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-seal ${
                  isActive
                    ? 'text-ink font-semibold'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[19px] h-[2px] bg-seal"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="inline-flex items-center gap-2 rounded-md border border-rule bg-white px-4 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:border-ink-muted hover:bg-linen whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal"
          >
            <Search className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
            <span>Search Catalog</span>
          </button>
        </div>
      </div>

      {/* Compact Mobile Navigation Row (only below md) */}
      <nav
        aria-label="Mobile navigation"
        className="flex md:hidden items-center gap-5 overflow-x-auto border-t border-rule/70 px-4 py-2 text-xs font-medium"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`whitespace-nowrap shrink-0 py-0.5 ${
                isActive ? 'text-seal font-semibold' : 'text-ink-muted'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
