import { env } from 'cloudflare:workers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { currentUserId, ensureDb } from '@/lib/server-db';

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  await ensureDb();const userId=await currentUserId(request);const {id}=await params;
  const row=await env.DB.prepare('SELECT payload, updated_at FROM essay_documents WHERE user_id = ? AND document_id = ?').bind(userId,id).first<{payload:string;updated_at:number}>();
  return NextResponse.json(row?{...JSON.parse(row.payload),updatedAt:row.updated_at}:{document:null,updatedAt:null});
}
export async function PUT(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  await ensureDb();const userId=await currentUserId(request);const {id}=await params;const body=await request.json();const now=Date.now();
  await env.DB.prepare('INSERT INTO essay_documents (user_id,document_id,payload,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id,document_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(userId,id,JSON.stringify(body),now).run();
  return NextResponse.json({ok:true,documentId:id,updatedAt:now});
}
