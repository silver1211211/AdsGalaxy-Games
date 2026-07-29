import { createHmac } from "crypto";
export type InlineButton={id:string;label:string;url:string};
export function telegramWebhookSecret(miniAppId:string){const key=process.env.WALLET_ENCRYPTION_KEY;if(!key||key.length<32)throw new Error("Encryption key is unavailable");return createHmac("sha256",key).update(`telegram-webhook:${miniAppId}`).digest("hex")}
export function tenantMiniAppUrl(slug:string){
  const configuredBase=process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/,"");
  const base=configuredBase||(process.env.NODE_ENV==="development"?"http://localhost:3000":"");
  if(!base)throw new Error("NEXT_PUBLIC_APP_URL is required for Telegram launch buttons");
  return `${base}/${encodeURIComponent(slug)}`;
}
export function startKeyboard(slug:string,buttonText:string,buttons:InlineButton[]){const safe=Array.isArray(buttons)?buttons.slice(0,6).filter(x=>x&&typeof x.label==="string"&&typeof x.url==="string"&&/^https:\/\//i.test(x.url)):[];return{inline_keyboard:[[{text:buttonText||"Open Mini App",web_app:{url:tenantMiniAppUrl(slug)}}],...safe.map(x=>[{text:x.label,url:x.url}])]}}
