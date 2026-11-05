import assert from 'node:assert/strict';
import { randomBytes, generateKeyPairSync, createHash, createHmac, sign } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { encodeCBOR } from '@levischuck/tiny-cbor';
const dir=mkdtempSync(path.join(tmpdir(),'joojo-passkey-test-'));
const base='http://127.0.0.1:3120';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3120'],{env:{...process.env,TURSO_DATABASE_URL:'',TURSO_AUTH_TOKEN:'',HESABDARI_DATA_DIR:dir,SESSION_SECRET:'isolated-passkey-tests-only',ADMIN_EMAIL:'admin@passkey-test.invalid',ADMIN_SETUP_TOKEN:'',PASSKEY_ORIGIN:base},windowsHide:true,stdio:['ignore','pipe','pipe']});
let logs='',checks=0;server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
class Browser {
  cookies=new Map();
  async req(route,body,status=200,extra={},method){
    const r=await fetch(base+route,{method:method || (body?'POST':'GET'),headers:{Origin:base,'Content-Type':'application/json',Cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; '),...extra},...(body?{body:JSON.stringify(body)}:{})});
    for(const c of r.headers.getSetCookie()){const pair=c.split(';')[0];const i=pair.indexOf('=');this.cookies.set(pair.slice(0,i),pair.slice(i+1));}
    const data=await r.json();assert.equal(r.status,status,`${route}: ${JSON.stringify(data)}`);checks++;return {data,headers:r.headers};
  }
  async pk(body,status=200,extra={}){return this.req('/api/auth/passkey',body,status,extra);}
}
const sha=b=>createHash('sha256').update(b).digest();
const b64=b=>Buffer.from(b).toString('base64url');
function authenticator(){const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});return {privateKey,jwk:publicKey.export({format:'jwk'}),id:b64(randomBytes(32)),userHandle:null};}
function client(type,challenge,origin=base){return Buffer.from(JSON.stringify({type,challenge,origin,crossOrigin:false}));}
function registration(a,options,{uv=true,origin=base}={}){
 a.userHandle=options.user.id;const c=client('webauthn.create',options.challenge,origin);const counter=Buffer.alloc(4),id=Buffer.from(a.id,'base64url'),len=Buffer.alloc(2);len.writeUInt16BE(id.length);
 const cose=encodeCBOR(new Map([[1,2],[3,-7],[-1,1],[-2,new Uint8Array(Buffer.from(a.jwk.x,'base64url'))],[-3,new Uint8Array(Buffer.from(a.jwk.y,'base64url'))]]));
 const authData=Buffer.concat([sha(options.rp.id),Buffer.from([uv?0x45:0x41]),counter,Buffer.alloc(16),len,id,Buffer.from(cose)]);
 return {id:a.id,rawId:a.id,type:'public-key',authenticatorAttachment:'platform',clientExtensionResults:{},response:{clientDataJSON:b64(c),attestationObject:b64(encodeCBOR(new Map([['fmt','none'],['attStmt',new Map()],['authData',new Uint8Array(authData)]]))),transports:['internal']}};
}
function assertion(a,options,{uv=true,origin=base,counter=1,privateKey=a.privateKey}={}){const c=client('webauthn.get',options.challenge,origin),n=Buffer.alloc(4);n.writeUInt32BE(counter);const d=Buffer.concat([sha(options.rpId),Buffer.from([uv?0x05:0x01]),n]);return {id:a.id,rawId:a.id,type:'public-key',clientExtensionResults:{},response:{clientDataJSON:b64(c),authenticatorData:b64(d),signature:b64(sign('sha256',Buffer.concat([d,sha(c)]),privateKey)),userHandle:a.userHandle}};}
const profile={firstName:'آزمایش',lastName:'ورود',phone:'۰۹۱۲۳۴۵۶۷۸۹'};
try{
 for(let i=0;i<100;i++){try{await fetch(base+'/api/health');break;}catch{await new Promise(r=>setTimeout(r,200));}}
 const a=new Browser(),key=authenticator();
 await a.pk({action:'register_options',profile},403,{Origin:'https://attacker.invalid'});
 await a.pk({action:'register_options',profile:{...profile,role:'admin'}},400);
 await a.pk({action:'register_options',profile:{...profile,phone:'123'}},400);
 await a.pk({action:'link_options',profile},401);
 await a.pk({action:'register_options',profile:{...profile,phone:undefined}},400);
 let options=(await a.pk({action:'register_options',profile,locale:'en'})).data.options;
 assert.equal(options.authenticatorSelection.userVerification,'required');assert.equal(options.authenticatorSelection.residentKey,'required');
 await a.pk({action:'register_verify',credential:registration(key,options,{uv:false})},400);
 options=(await a.pk({action:'register_options',profile,locale:'en'})).data.options;
 const replayCookie=a.cookies.get('joojo_passkey_challenge');const reg=registration(key,options);
 const created=await a.pk({action:'register_verify',credential:reg});assert.equal(created.data.role,'user');assert.equal(created.data.isAdmin,false);assert.match(created.headers.get('set-cookie'),/Max-Age=34560000/);assert.match(created.headers.get('set-cookie'),/HttpOnly/i);
 a.cookies.set('joojo_passkey_challenge',replayCookie);await a.pk({action:'register_verify',credential:reg},400);
 let me=(await a.req('/api/auth/me')).data.user;const originalID=me.id;assert.equal((await a.req('/api/profile')).data.phone,'+989123456789');assert.equal(me.firstName,profile.firstName);assert.equal(me.role,'user');
 assert.equal((await a.req('/api/profile')).data.passkeyCount,1);
 await a.req('/api/profile',{passkeyProfile:{firstName:'نام',lastName:'تازه'}},200,{},'PATCH');assert.equal((await a.req('/api/profile')).data.firstName,'نام');
 await a.req('/api/profile',{passkeyProfile:profile,role:'admin'},400,{},'PATCH');
 await a.req('/api/admin/users',undefined,403);
 const account=(await a.req('/api/accounts',{name:'Sync test',type:'bank'})).data;
 const tx=(await a.req('/api/transactions',{accountId:account.id,type:'expense',amount:2500,date:'2026-10-19'})).data;
 const login=new Browser();options=(await login.pk({action:'login_options'})).data.options;assert.equal(options.userVerification,'required');
 await login.pk({action:'login_verify',credential:assertion(key,options,{origin:'https://attacker.invalid'})},400);
 options=(await login.pk({action:'login_options'})).data.options;await login.pk({action:'login_verify',credential:assertion(key,options,{uv:false})},400);
 options=(await login.pk({action:'login_options'})).data.options;await login.pk({action:'login_verify',credential:assertion(key,options,{privateKey:authenticator().privateKey})},401);
 options=(await login.pk({action:'login_options'})).data.options;await login.pk({action:'login_verify',credential:assertion(key,options)});
 assert.equal((await login.req('/api/auth/me')).data.user.id,originalID);
 assert.equal((await login.req('/api/profile')).data.phone,'+989123456789');
 assert.equal((await login.req('/api/settings')).data.locale,'en');
 assert.ok((await login.req('/api/transactions')).data.some(row=>row.id===tx.id));
 options=(await login.pk({action:'login_options'})).data.options;await login.pk({action:'login_verify',credential:assertion(key,options,{counter:1})},400);
 const b=new Browser(),key2=authenticator();options=(await b.pk({action:'register_options',profile})).data.options;await b.pk({action:'register_verify',credential:registration(key2,options)});assert.notEqual((await b.req('/api/auth/me')).data.user.id,originalID,'Matching names must never identify/claim another account');
 const linked=authenticator();options=(await a.pk({action:'link_options',profile:profile})).data.options;await a.pk({action:'link_verify',credential:registration(linked,options)});assert.equal((await a.req('/api/profile')).data.passkeyCount,2);assert.equal((await a.req('/api/auth/me')).data.user.id,originalID);
 const expired=new Browser();options=(await expired.pk({action:'login_options'})).data.options;
 const {createClient}=await import('@libsql/client');const fixtures=createClient({url:'file:'+path.join(dir,'hesabdari.db').replaceAll('\\','/')});await fixtures.execute({sql:'UPDATE passkey_challenges SET expires_at=0 WHERE id=?',args:[createHash('sha256').update(expired.cookies.get('joojo_passkey_challenge')).digest('hex')]});fixtures.close();await expired.pk({action:'login_verify',credential:assertion(key,options,{counter:2})},400);
 for(const endpoint of ['login','register','setup','forgot-password','reset-password'])await new Browser().req('/api/auth/'+endpoint,{email:'legacy@passkey-test.invalid',password:'Test-password-123'},410);
 const oldTokenBrowser=new Browser();const oldPayload=Buffer.from(JSON.stringify({userId:originalID,exp:Date.now()+3600000})).toString('base64url');oldTokenBrowser.cookies.set('joojo_passkey_session',oldPayload+'.'+createHmac('sha256','isolated-passkey-tests-only').update(oldPayload).digest('base64url'));assert.equal((await oldTokenBrowser.req('/api/auth/me')).data.user,null,'Old tokens must be invalid even if renamed to the new cookie');
 const oldCookie=new Browser();oldCookie.cookies.set('hesabdari_session',a.cookies.get('joojo_passkey_session'));assert.equal((await oldCookie.req('/api/auth/me')).data.user,null);
 // Cross-account linking cannot swap the authenticated owner after options are issued.
 options=(await a.pk({action:'link_options',profile})).data.options;a.cookies.set('joojo_passkey_session',b.cookies.get('joojo_passkey_session'));await a.pk({action:'link_verify',credential:registration(authenticator(),options)},401);
 let throttled=false;for(let i=0;i<45;i++){const r=await fetch(base+'/api/auth/passkey',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','x-vercel-forwarded-for':'passkey-rate-fixture'},body:JSON.stringify({action:'login_options'})});checks++;if(r.status===429){throttled=true;break;}assert.equal(r.status,200);}assert.equal(throttled,true,'Challenge options must be throttled across server instances');
 console.log(`PASS: ${checks} passkey HTTP checks, real signatures, biometric verification flag, replay/counter protection, profile persistence, account isolation and retired-password rejection.`);
}catch(error){console.error(logs.slice(-2500));throw error;}
finally{if(server.exitCode===null){server.kill();await new Promise(r=>server.once('exit',r));}const resolved=path.resolve(dir);assert.ok(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('joojo-passkey-test-'));rmSync(resolved,{recursive:true,force:true});}
