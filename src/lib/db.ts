import type { PrismaClient } from "@prisma/client";
import { criarClienteDoBanco } from "./cliente-do-banco";

const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalParaPrisma.prisma ?? criarClienteDoBanco();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = db;
