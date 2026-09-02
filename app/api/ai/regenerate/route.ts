import { env } from 'cloudflare:workers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { currentUserId, ensureDb } from '@/lib/server-db';

export async function POST(request:NextRequest){
  await ensureDb(); const userId=await currentUserId(request); const body=await request.json(); const runId=crypto.randomUUID(); const model=env.OPENAI_MODEL||'gpt-5.6-luna';
  if(!env.OPENAI_API_KEY){
    const suggestion='데이터를 읽는 과정에서 반복되는 변화의 원인을 가설로 정리하고, 분석 결과를 실제 의사결정과 연결할 수 있는 인사이트로 발전시켰습니다.';
    await env.DB.prepare('INSERT INTO ai_runs (id,user_id,kind,model,status,output,created_at) VALUES (?,?,?,?,?,?,?)').bind(runId,userId,'answer_regeneration','demo','completed',suggestion,Date.now()).run();
    return NextResponse.json({suggestion,runId,demo:true});
  }
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model,instructions:'너는 Career Fact를 새로 만들지 않는 한국어 자기소개서 편집자다. 보호 문장은 의미와 표현을 유지한다.',input:`문항: ${body.question}\n현재 답변: ${body.answer}\n보호 문장: ${(body.protectedText||[]).join(' | ')}\n행동과 결과가 명확하도록 한 문단으로 개선해라.`,text:{format:{type:'json_schema',name:'wishport_regeneration',strict:true,schema:{type:'object',properties:{suggestion:{type:'string'}},required:['suggestion'],additionalProperties:false}}}})});
  if(!response.ok) return NextResponse.json({error:'llm_failed'},{status:502});
  const data=await response.json() as {output_text?:string;output?:Array<{content?:Array<{text?:string}>}>}; const raw=data.output_text??data.output?.flatMap(x=>x.content??[]).map(x=>x.text??'').join('')??''; let suggestion=raw;
  try{suggestion=(JSON.parse(raw) as {suggestion:string}).suggestion;}catch{}
  await env.DB.prepare('INSERT INTO ai_runs (id,user_id,kind,model,status,output,created_at) VALUES (?,?,?,?,?,?,?)').bind(runId,userId,'answer_regeneration',model,'completed',suggestion,Date.now()).run();
  return NextResponse.json({suggestion,runId});
}
