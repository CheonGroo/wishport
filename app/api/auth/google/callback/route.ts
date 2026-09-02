import { env } from 'cloudflare:workers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/server-db';

type GoogleUser={sub:string;email:string;name?:string;picture?:string};
export async function GET(request:NextRequest){
  await ensureDb(); const code=request.nextUrl.searchParams.get('code'); const state=request.nextUrl.searchParams.get('state'); const saved=request.cookies.get('wishport_oauth_state')?.value;
  if(!code||!state||state!==saved||!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET) return NextResponse.redirect(new URL('/signin?error=oauth_failed',request.url));
  const redirect=env.GOOGLE_REDIRECT_URI||new URL('/api/auth/google/callback',request.url).toString();
  const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:redirect,grant_type:'authorization_code'})});
  if(!tokenResponse.ok) return NextResponse.redirect(new URL('/signin?error=token_failed',request.url));
  const tokens=await tokenResponse.json() as {access_token:string}; const userResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{authorization:`Bearer ${tokens.access_token}`}}); const user=await userResponse.json() as GoogleUser;
  const userId=`google:${user.sub}`; const now=Date.now(); await env.DB.prepare('INSERT INTO users (id,google_sub,email,name,picture,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,name=excluded.name,picture=excluded.picture').bind(userId,user.sub,user.email,user.name??null,user.picture??null,now).run();
  const session=crypto.randomUUID(); await env.DB.prepare('INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES (?,?,?,?)').bind(session,userId,now+1000*60*60*24*30,now).run();
  const response=NextResponse.redirect(new URL('/',request.url)); response.cookies.set('wishport_session',session,{httpOnly:true,secure:request.nextUrl.protocol==='https:',sameSite:'lax',maxAge:60*60*24*30,path:'/'}); response.cookies.delete('wishport_oauth_state'); return response;
}
