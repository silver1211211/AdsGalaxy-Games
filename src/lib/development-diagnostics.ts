import "server-only";
import { prisma } from "@/lib/prisma";
async function within<T>(promise:Promise<T>,milliseconds=2500){return Promise.race([promise,new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("DATABASE_DIAGNOSTIC_TIMEOUT")),milliseconds))]);}
export async function developmentDatabaseStatus(){if(!process.env.DATABASE_URL)return{databaseConfigured:false,databaseReachable:false,migrationsAvailable:false};try{await within(prisma.$queryRaw`SELECT 1`);}catch{return{databaseConfigured:true,databaseReachable:false,migrationsAvailable:false};}try{await within(prisma.miniApp.count());return{databaseConfigured:true,databaseReachable:true,migrationsAvailable:true};}catch{return{databaseConfigured:true,databaseReachable:true,migrationsAvailable:false};}}
