interface MovieSynopsisProps {
  html: string;
  className?: string;
}

// KKPhim's `content` field already comes wrapped in its own <p>...</p>, so this
// must never be rendered inside another <p> (nested <p> is invalid HTML and
// renders inconsistently/unwrapped across browsers). Use a <div> instead.
export default function MovieSynopsis({ html, className = '' }: MovieSynopsisProps) {
  return (
    <div
      className={`whitespace-normal break-words [&_p]:mb-3 [&_p:last-child]:mb-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
