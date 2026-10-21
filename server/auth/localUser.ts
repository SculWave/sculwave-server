import { prisma } from '../database/prisma'

/**
 * Local database owner used to preserve the existing network ownership model.
 * Authentication is enforced separately by the local dashboard password and
 * server-side session cookie; this record is not an authentication bypass.
 */
const LOCAL_ADMIN_UID = 'local-admin'
const LOCAL_ADMIN_EMAIL = 'admin@localhost'

let cached: Awaited<ReturnType<typeof load>> | undefined

async function load() {
  return prisma.user.upsert({
    where: { localUid: LOCAL_ADMIN_UID },
    update: {},
    create: { localUid: LOCAL_ADMIN_UID, email: LOCAL_ADMIN_EMAIL },
  })
}

export async function getLocalAdmin() {
  cached ??= await load()
  return cached
}
