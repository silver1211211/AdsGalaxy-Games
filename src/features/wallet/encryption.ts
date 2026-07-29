import { createCipheriv,createDecipheriv,createHash,randomBytes } from "crypto";
export const WALLET_ENCRYPTION_ERROR_CODE="WALLET_ENCRYPTION_NOT_CONFIGURED";
function key(){const secret=process.env.WALLET_ENCRYPTION_KEY;if(!secret||secret.length<32)throw new Error(WALLET_ENCRYPTION_ERROR_CODE);return createHash("sha256").update(secret).digest();}
export function assertWalletEncryptionConfigured(){void key();}
export function encryptSecret(value:string){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv),encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64url");}
export function decryptSecret(value:string){const data=Buffer.from(value,"base64url"),iv=data.subarray(0,12),tag=data.subarray(12,28),encrypted=data.subarray(28),decipher=createDecipheriv("aes-256-gcm",key(),iv);decipher.setAuthTag(tag);return Buffer.concat([decipher.update(encrypted),decipher.final()]).toString("utf8");}
export const encryptDestination=encryptSecret;
export const decryptDestination=decryptSecret;
