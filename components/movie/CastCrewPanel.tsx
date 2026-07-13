interface CastCrewPanelProps {
  actors: string[];
}

export default function CastCrewPanel({ actors }: CastCrewPanelProps) {
  return (
    <div className="col-span-1 lg:col-span-4 space-y-4">
      <h3 className="font-serif font-black text-lg tracking-wide text-[#E2B646] uppercase italic">
        Cast & Crew
      </h3>
      <div className="max-h-[320px] overflow-y-auto no-scrollbar border border-zinc-850 rounded-none bg-black/40 p-4 space-y-3 divide-y divide-zinc-900">
        {actors.length > 0 ? (
          actors.map((actor, idx) => (
            <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 font-sans">{actor}</span>
              <span className="text-[9px] font-mono text-zinc-600">Starring</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-zinc-600 py-4">Cast metadata not found</p>
        )}
      </div>
    </div>
  );
}
