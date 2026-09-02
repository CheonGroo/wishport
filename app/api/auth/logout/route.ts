import { env } from 'cloudflare:workers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/server-db';

export async function GET(request:NextRequest){ await ensureDb(); const session=request.cookies.get('wishport_session')?.value; if(session) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(session).run(); const response=NextResponse.redirect(new URL('/signin',request.url)); response.cookies.delete('wishport_session'); return response; }
