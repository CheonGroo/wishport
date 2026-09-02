import { env } from 'cloudflare:workers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { currentUserId, ensureDb } from '@/lib/server-db';

export async function GET(request:NextRequest){
  await ensureDb();const userId=await currentUserId(request);
  const row=await env.DB.prepare('SELECT payload, updated_at FROM application_boards WHERE user_id = ?').bind(userId).first<{payload:string;updated_at:number}>();
  return NextResponse.json(row?{...JSON.parse(row.payload),updatedAt:row.updated_at}:{rows:[],updatedAt:null});
}
export async function PUT(request:NextRequest){
  await ensureDb();const userId=await currentUserId(request);const body=await request.json();const now=Date.now();
  if(!Array.isArray(body.rows))return NextResponse.json({error:'rows_required'},{status:400});
  await env.DB.prepare('INSERT INTO application_boards (user_id,payload,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(userId,JSON.stringify({rows:body.rows}),now).run();
  return NextResponse.json({ok:true,updatedAt:now});
}
