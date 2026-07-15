import { ImageResponse } from 'next/og';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const GOLD = '#E2B646';
const DARK = '#0a0a0b';
const CARD_BG = '#18181b';
const BORDER = '#27272a';
const TEXT = '#f4f4f5';
const MUTED = '#a1a1aa';

interface OGImageProps {
    name?: string;
    originName?: string;
    year?: string;
    quality?: string;
    genre?: string;
    episode?: string;
    poster?: string;
    type?: 'movie' | 'watch';
}

function FilmIcon() {
    return (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
            <path d="M7 2v20" />
            <path d="M17 2v20" />
            <path d="M2 12h20" />
            <path d="M2 7h5" />
            <path d="M2 17h5" />
            <path d="M17 7h5" />
            <path d="M17 17h5" />
        </svg>
    );
}

function PlayIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="5,3 19,12 5,21" />
        </svg>
    );
}

export function OGTicket({ name, originName, year, quality, genre, episode, poster, type = 'movie' }: OGImageProps) {
    const displayName = name || "Konnn's Cinema";
    const fontSize = displayName.length > 30 ? '36px' : '48px';

    return (
        <div
            style={{
                display: 'flex',
                width: '100%',
                height: '100%',
                background: DARK,
                fontFamily: 'Inter, "Be Vietnam Pro", sans-serif',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(ellipse at 30% 50%, rgba(234,88,12,0.08), transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(226,182,70,0.06), transparent 60%)`,
                }}
            />

            {}
            <div
                style={{
                    display: 'flex',
                    width: '1000px',
                    height: '420px',
                    border: `1px solid ${BORDER}`,
                    background: CARD_BG,
                    position: 'relative',
                    margin: 'auto',
                    overflow: 'hidden',
                }}
            >
                {}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: GOLD,
                    }}
                />

                {}
                <div
                    style={{
                        display: 'flex',
                        width: '280px',
                        height: '100%',
                        background: '#09090b',
                        borderRight: `2px dashed ${BORDER}`,
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {poster ? (
                        <img
                            src={poster}
                            alt=""
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                height: '100%',
                            }}
                        >
                            <FilmIcon />
                        </div>
                    )}

                    {}
                    <div
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: '60px',
                            background: 'linear-gradient(to right, transparent, #09090b)',
                        }}
                    />

                    {}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '16px',
                            left: '16px',
                            right: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                        }}
                    >
                        <span style={{ fontSize: '10px', color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                            ACCESS CODE
                        </span>
                        <div style={{ display: 'flex', gap: '3px' }}>
                            {[14, 6, 20, 4, 10, 6, 18, 8, 12, 5].map((w, i) => (
                                <div key={i} style={{ width: `${w}px`, height: '24px', background: GOLD, opacity: 0.4 }} />
                            ))}
                        </div>
                    </div>
                </div>

                {}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        flex: 1,
                        padding: '48px 56px',
                        gap: '12px',
                    }}
                >
                    {}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {genre && (
                            <span
                                style={{
                                    padding: '4px 12px',
                                    border: `1px solid ${GOLD}33`,
                                    color: GOLD,
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    letterSpacing: '0.15em',
                                }}
                            >
                                {genre.toUpperCase()}
                            </span>
                        )}
                        <span style={{ color: MUTED, fontSize: '14px' }}>•</span>
                        <span style={{ color: MUTED, fontSize: '14px' }}>{quality || 'FHD'}</span>
                        <span style={{ color: MUTED, fontSize: '14px' }}>•</span>
                        <span style={{ color: MUTED, fontSize: '14px' }}>{year}</span>
                    </div>

                    {}
                    <h1
                        style={{
                            fontSize,
                            fontWeight: 900,
                            fontStyle: 'italic',
                            color: TEXT,
                            margin: 0,
                            lineHeight: 1.1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }}
                    >
                        {displayName}
                    </h1>

                    {}
                    {originName && (
                        <p style={{ fontSize: '18px', color: MUTED, margin: 0 }}>
                            {originName}
                        </p>
                    )}

                    {}
                    {type === 'watch' && episode && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginTop: '8px',
                            }}
                        >
                            <span
                                style={{
                                    padding: '6px 16px',
                                    background: `${GOLD}1A`,
                                    border: `1px solid ${GOLD}33`,
                                    color: GOLD,
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    letterSpacing: '0.1em',
                                }}
                            >
                                EPISODE {episode}
                            </span>
                        </div>
                    )}

                    {}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginTop: '16px',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 28px',
                                background: GOLD,
                                color: '#000',
                                fontSize: '16px',
                                fontWeight: 900,
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                            }}
                        >
                            <PlayIcon />
                            <span>{type === 'watch' ? 'NOW PLAYING' : 'WATCH NOW'}</span>
                        </div>
                    </div>

                    {}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '24px',
                            right: '40px',
                            fontSize: '12px',
                            color: '#52525b',
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                        }}
                    >
                        Konnn&apos;s Cinema
                    </div>
                </div>
            </div>
        </div>
    );
}

export function createOGImageResponse(params: OGImageProps): ImageResponse {
    return new ImageResponse(
        <OGTicket {...params} />,
        { width: OG_WIDTH, height: OG_HEIGHT },
    );
}
