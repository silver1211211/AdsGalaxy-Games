export const TENANT_WALLET_FIELDS=["currency","pointsPerDollar","minimumConversionPoints","conversionFeePercent","minimumWithdrawal","maximumWithdrawal"] as const;
export const TENANT_GAME_SECTIONS=["memory-match","quiz-challenge","tap-collector"] as const;
export function adminSectionActive(pathname:string,base:string,suffix:string){const href=`${base}${suffix}`;return suffix===""?pathname===base:pathname===href||pathname.startsWith(`${href}/`)}
export function safeInlineButtonUrl(value:string){try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password}catch{return false}}
