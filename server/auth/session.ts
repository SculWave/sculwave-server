import crypto from 'crypto'
import { prisma } from '../database/prisma'
import { SELF_HOSTED } from '../config/mode'

const SESSION_DURATION = SELF_HOSTED ? 12 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex')

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + SESSION_DURATION),
    },
  })

  return token
}

export async function revokeSession(token: string) {
  await prisma.session.deleteMany({ where: { token } })
}

export async function validateSession(token: string) {
  const session = await prisma.session.findUnique({
    where: {
      token,
    },
    include: {
      user: true,
    },
  })

  if (!session) {
    return null
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({
      where: {
        token,
      },
    })

    return null
  }

  return session.user
}

export async function getUserFromCookie(cookieHeader?: string) {
  if (!cookieHeader) {
    return null
  }

  const match = cookieHeader.match(/(?:^|;\s*)ew_session=([^;]+)/)

  if (!match) {
    return null
  }

  return validateSession(match[1])
}
