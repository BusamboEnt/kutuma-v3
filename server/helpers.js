const appId='cmtq2e1jx00ec0cjs0chvb1s6';
export function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export async function externalId(user){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(appId+':testnet:'+user));return 'kutuma_test_'+[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,48);}
