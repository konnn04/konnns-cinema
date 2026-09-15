import { NextResponse } from 'next/server';
import type { RemoteCommand, RemoteSessionState } from '@/lib/remote/types';

export type { RemoteCommand, RemoteSessionState };

declare global {
  var __remoteSessions: Map<string, RemoteSessionState> | undefined;
}

if (!globalThis.__remoteSessions) {
  globalThis.__remoteSessions = new Map<string, RemoteSessionState>();
}

const sessions = globalThis.__remoteSessions;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { searchParams } = new URL(request.url);
  const client = searchParams.get('client') || 'phone';
  const since = parseInt(searchParams.get('since') || '0', 10);

  const session = sessions.get(sessionId) || {
    sessionId,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    lastUpdated: Date.now(),
    commands: [],
  };

  if (client === 'pc') {
    const pendingCommands = session.commands.filter((c) => c.timestamp > since);
    session.commands = session.commands.slice(-50);
    sessions.set(sessionId, session);

    return NextResponse.json({
      success: true,
      commands: pendingCommands,
    });
  }

  return NextResponse.json({
    success: true,
    state: {
      sessionId: session.sessionId,
      movieTitle: session.movieTitle,
      episodeName: session.episodeName,
      posterUrl: session.posterUrl,
      isPlaying: session.isPlaying,
      currentTime: session.currentTime,
      duration: session.duration,
      volume: session.volume,
      isMuted: session.isMuted,
      lastUpdated: session.lastUpdated,
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const body = await request.json();

  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      lastUpdated: Date.now(),
      commands: [],
    };
  }

  if (body.type === 'status') {
    Object.assign(session, body.state, { lastUpdated: Date.now() });
    sessions.set(sessionId, session);
    return NextResponse.json({ success: true });
  }

  if (body.type === 'command') {
    const command: RemoteCommand = {
      id: Math.random().toString(36).substring(2, 9),
      action: body.action,
      value: body.value,
      timestamp: Date.now(),
    };
    session.commands.push(command);
    sessions.set(sessionId, session);
    return NextResponse.json({ success: true, commandId: command.id });
  }

  return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
}
