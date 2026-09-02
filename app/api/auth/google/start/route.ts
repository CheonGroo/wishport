import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';

export async function GET(request:Request){
  if(!env.GOOGLE_CLIENT_ID) return NextResponse.redirect(new URL('/signin?error=google_not_configured',request.url));
  const state=crypto.randomUUID(); const redirect=env.GOOGLE_REDIRECT_URI||new URL('/api/auth/google/callback',request.url).toString();
  const params=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:redirect,response_type:'code',scope:'openid email profile',state,prompt:'select_account'});
  const response=NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  response.cookies.set('wishport_oauth_state',state,{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',maxAge:600,path:'/'}); return response;
}
