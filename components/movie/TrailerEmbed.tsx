function getYoutubeEmbedId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

interface TrailerEmbedProps {
  trailerUrl: string;
}

export default function TrailerEmbed({ trailerUrl }: TrailerEmbedProps) {
  const embedId = getYoutubeEmbedId(trailerUrl);

  return (
    <div className="col-span-1 lg:col-span-8 space-y-4">
      <h3 className="font-serif font-black text-lg tracking-wide text-[#E2B646] uppercase italic">
        Official Trailer
      </h3>
      <div className="relative aspect-video w-full rounded-none overflow-hidden border border-zinc-850 bg-zinc-950">
        {embedId ? (
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${embedId}`}
            title="YouTube Video Player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-zinc-500">
            External trailer: <a href={trailerUrl} target="_blank" rel="noreferrer" className="text-[#E2B646] underline ml-1">{trailerUrl}</a>
          </div>
        )}
      </div>
    </div>
  );
}
