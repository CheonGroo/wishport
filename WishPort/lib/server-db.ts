import { env } from 'cloudflare:workers';
import type { NextRequest } from 'next/server';

let initialized = false;
export async function ensureDb(){
  if(initialized) return;
  await env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, google_sub TEXT UNIQUE, email TEXT NOT NULL, name TEXT, picture TEXT, created_at INTEGER NOT NULL)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS archive_documents (user_id TEXT PRIMARY KEY, payload TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS application_boards (user_id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at INTEGER NOT NULL)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS essay_documents (user_id TEXT NOT NULL, document_id TEXT NOT NULL, payload TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, document_id))'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS ai_runs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, input_hash TEXT, model TEXT, status TEXT NOT NULL, output TEXT, created_at INTEGER NOT NULL)'),
  ]);
  initialized=true;
}
export async function currentUserId(request:NextRequest){
  await ensureDb(); const session=request.cookies.get('wishport_session')?.value;
  if(!session) return 'local-demo-user';
  const row=await env.DB.prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?').bind(session).first<{user_id:string;expires_at:number}>();
  return row&&row.expires_at>Date.now()?row.user_id:'local-demo-user';
}
