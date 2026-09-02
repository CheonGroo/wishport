import { env } from 'cloudflare:workers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { currentUserId } from '@/lib/server-db';

const allowed=new Set(['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','image/jpeg','image/png']);
export async function POST(request:NextRequest){
  const userId=await currentUserId(request); const form=await request.formData(); const file=form.get('file');
  if(!(file instanceof File)) return NextResponse.json({error:'file_required'},{status:400});
  if(file.size>15*1024*1024) return NextResponse.json({error:'file_too_large'},{status:413});
  if(!allowed.has(file.type)) return NextResponse.json({error:'unsupported_file_type'},{status:415});
  const id=crypto.randomUUID(); const extension=file.name.includes('.')?file.name.split('.').pop()?.toLowerCase():'bin'; const key=`${userId}/${id}.${extension}`;
  await env.FILES.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type},customMetadata:{userId,originalName:file.name}});
  return NextResponse.json({ok:true,file:{id,key,name:file.name,size:file.size,type:file.type}});
}
