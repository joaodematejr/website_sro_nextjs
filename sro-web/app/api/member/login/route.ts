import { cookies } from 'next/headers'

import { getDbPool, resetDbPool, sql } from '@/lib/db'
import {
  MEMBER_SESSION_COOKIE_NAME,
  MEMBER_SESSION_TTL_SECONDS,
  createMemberSessionToken,
  md5,
} from '@/lib/member-auth'

export const runtime = 'nodejs'

type LoginPayload = {
  username?: string
  password?: string
}

const md5Pattern = /^[a-f0-9]{32}$/i

function quoteSqlIdentifier(identifier: string) {
  return `[${identifier.replaceAll(']', ']]')}]`
}

function buildCandidateTables(baseTableName: 'TB_User' | 'TB_Net2e') {
  const fromOfficial = `[SRO_ACCOUNT].[dbo].[${baseTableName}]`
  const fromEnv = process.env.DB_ACCOUNT_DATABASE
    ? `${quoteSqlIdentifier(process.env.DB_ACCOUNT_DATABASE)}.[dbo].[${baseTableName}]`
    : null

  if (!fromEnv || fromEnv === fromOfficial) {
    return [fromOfficial]
  }

  return [fromOfficial, fromEnv]
}

export async function POST(request: Request) {
  let payload: LoginPayload

  try {
    payload = (await request.json()) as LoginPayload
  } catch {
    return Response.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 })
  }

  const username = payload.username?.trim() ?? ''
  const password = payload.password ?? ''

  if (!username || !password) {
    return Response.json({ ok: false, error: 'MISSING_CREDENTIALS' }, { status: 400 })
  }

  const userTables = buildCandidateTables('TB_User')
  const net2eTables = buildCandidateTables('TB_Net2e')
  const normalizedPassword = password.trim()
  const passwordHash = md5Pattern.test(normalizedPassword) ? normalizedPassword.toLowerCase() : md5(normalizedPassword)
  const maxAttempts = 2

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const pool = await getDbPool('account')
      let accountUser: { JID: number; StrUserID: string } | undefined

      for (const userTable of userTables) {
        try {
          const userByAccount = await pool
            .request()
            .input('username', sql.NVarChar(64), username)
            .input('passwordHash', sql.VarChar(64), passwordHash)
            .query<{ JID: number; StrUserID: string }>(`
              SELECT TOP 1 JID, StrUserID
              FROM ${userTable}
              WHERE StrUserID = @username
                AND [password] = @passwordHash
            `)

          accountUser = userByAccount.recordset[0]

          if (accountUser?.JID) {
            break
          }
        } catch (error) {
          const e = error as Error & { code?: string }

          // Se tabela nao existir nesse alvo, tenta o proximo candidato.
          if (e.code === 'EREQUEST') {
            continue
          }

          throw error
        }
      }

      if (accountUser?.JID) {
        const sessionToken = createMemberSessionToken({
          username: accountUser.StrUserID,
          jid: Number(accountUser.JID),
        })

        const cookieStore = await cookies()
        cookieStore.set(MEMBER_SESSION_COOKIE_NAME, sessionToken, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: MEMBER_SESSION_TTL_SECONDS,
          path: '/',
        })

        return Response.json({ ok: true, user: { username: accountUser.StrUserID, jid: Number(accountUser.JID) } })
      }

      // Fallback de compatibilidade: valida por TB_Net2e/SecondPassword.
      let net2eUser: { JID: number; StrUserID: string } | undefined

      for (const net2eTable of net2eTables) {
        try {
          const userByNet2e = await pool
            .request()
            .input('username', sql.NVarChar(64), username)
            .input('secondPassword', sql.NVarChar(128), normalizedPassword)
            .input('secondPasswordHash', sql.VarChar(64), passwordHash)
            .query<{ JID: number; StrUserID: string }>(`
              SELECT TOP 1 JID, StrUserID
              FROM ${net2eTable}
              WHERE StrUserID = @username
                AND (
                  SecondPassword = @secondPassword
                  OR SecondPassword = @secondPasswordHash
                )
            `)

          net2eUser = userByNet2e.recordset[0]

          if (net2eUser?.JID) {
            break
          }
        } catch (error) {
          const e = error as Error & { code?: string }

          if (e.code === 'EREQUEST') {
            continue
          }

          throw error
        }
      }

      if (!net2eUser?.JID) {
        return Response.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 })
      }

      const sessionToken = createMemberSessionToken({
        username: net2eUser.StrUserID,
        jid: Number(net2eUser.JID),
      })

      const cookieStore = await cookies()
      cookieStore.set(MEMBER_SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: MEMBER_SESSION_TTL_SECONDS,
        path: '/',
      })

      return Response.json({ ok: true, user: { username: net2eUser.StrUserID, jid: Number(net2eUser.JID) } })
    } catch (error) {
      const e = error as Error & { code?: string }
      const isTransientSocket = e.code === 'ESOCKET' || e.code === 'ETIMEOUT' || e.code === 'ECONNCLOSED'

      if (isTransientSocket && attempt < maxAttempts) {
        await resetDbPool('account').catch(() => undefined)
        continue
      }

      return Response.json(
        { ok: false, error: 'LOGIN_FAILED', detail: e.code ?? 'UNKNOWN' },
        { status: 500 },
      )
    }
  }

  return Response.json({ ok: false, error: 'LOGIN_FAILED', detail: 'UNKNOWN' }, { status: 500 })
}
