import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { UnifiedPublication } from '../../types/portal';
import { formatDisplayDate } from '../../utils/formatters';
import { FallbackImage } from './FallbackImage';

interface PublicationCardProps {
  item: UnifiedPublication;
  showImage?: boolean;
}

export const PublicationCard: React.FC<PublicationCardProps> = ({ item, showImage = false }) => {
  const detailPath = `${item.routeBase}/${item.slug || item.id}`;
  const dateLabel = formatDisplayDate(item.publishedAtMs || item.updatedAtMs);

  return (
    <article className="group bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col transition-colors hover:border-[#0F2342]/40">
      {showImage && (
        <Link to={detailPath} className="block aspect-[4/3] overflow-hidden bg-slate-100">
          <FallbackImage
            src={item.featuredImage}
            alt={item.title}
            title={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </Link>
      )}
      <div className="p-5 flex-1 flex flex-col">
        {/* Zero-Pill Metadata Discipline: clean unboxed text with typographic separators */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mb-2.5">
          <span className="font-medium text-[#164937]">{item.typeLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{item.categoryName}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{dateLabel}</span>
          {item.isDemo && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#9E7B3B] font-medium">Demo Sample</span>
            </>
          )}
        </div>

        <h3 className="font-serif text-xl font-semibold text-[#0F2342] leading-snug mb-2 group-hover:text-[#164937] transition-colors">
          <Link to={detailPath}>{item.title}</Link>
        </h3>

        {(item.citation || item.court) && (
          <p className="font-mono text-xs text-slate-600 mb-2 tabular-nums">
            {[item.court, item.citation, item.year].filter(Boolean).join(' · ')}
          </p>
        )}

        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-4 flex-1">
          {item.description}
        </p>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">{item.authorName}</span>
          <Link
            to={detailPath}
            className="inline-flex items-center gap-1 font-medium text-[#0F2342] hover:text-[#164937] whitespace-nowrap"
          >
            Read Publication
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
};
