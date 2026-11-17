import type { MangaSummary } from '../types/manga';
import { CoverImage } from './CoverImage';

interface MangaCardProps {
  item: MangaSummary;
  onSelect: (id: string) => void;
  priority?: boolean;
}

export function MangaCard({ item, onSelect, priority = false }: MangaCardProps) {
  const metaParts: string[] = [item.format];
  if (item.rating != null) {
    metaParts.push(`★ ${item.rating.toFixed(1)}`);
  }
  if (item.viewsLabel && item.viewsLabel !== '—') {
    metaParts.push(item.viewsLabel);
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-label={`Open ${item.title} (${item.format})`}
      className="group flex w-full flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-seal"
    >
      <div className="w-full overflow-hidden rounded-sm transition-transform duration-150 group-hover:-translate-y-0.5">
        <CoverImage
          src={item.posterUrl}
          alt={item.title}
          priority={priority}
          className="rounded-sm shadow-[0_1px_2px_rgba(24,23,21,0.06)] group-hover:shadow-[0_6px_16px_rgba(24,23,21,0.1)]"
        />
      </div>

      <div className="mt-2.5 flex flex-col gap-1">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink group-hover:text-seal transition-colors duration-150">
          {item.title}
        </h3>
        <p className="truncate text-xs text-ink-muted tabular-nums">
          {metaParts.join(' · ')}
        </p>
      </div>
    </button>
  );
}
