import { env } from 'cloudflare:workers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { currentUserId, ensureDb } from '@/lib/server-db';

export async function GET(request:NextRequest){
  await ensureDb(); const userId=await currentUserId(request);
  const row=await env.DB.prepare('SELECT payload, version, updated_at FROM archive_documents WHERE user_id = ?').bind(userId).first<{payload:string;version:number;updated_at:number}>();
  return NextResponse.json(row?{...JSON.parse(row.payload),version:row.version,updatedAt:row.updated_at}:{profile:null,version:0});
}
export async function PUT(request:NextRequest){
  await ensureDb(); const userId=await currentUserId(request); const body=await request.json(); const now=Date.now();
  const current=await env.DB.prepare('SELECT version FROM archive_documents WHERE user_id = ?').bind(userId).first<{version:number}>();
  if(typeof body.version==='number'&&current&&body.version!==current.version) return NextResponse.json({error:'version_conflict',serverVersion:current.version},{status:409});
  const version=(current?.version??0)+1; const payload=JSON.stringify({profile:body.profile??{},experiences:body.experiences??[],extras:body.extras??{}});
  await env.DB.prepare('INSERT INTO archive_documents (user_id,payload,version,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,version=excluded.version,updated_at=excluded.updated_at').bind(userId,payload,version,now).run();
  return NextResponse.json({ok:true,version,updatedAt:now});
}
