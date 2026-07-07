import { getDbPool, sql } from '@/lib/db'

export type ServerInfo = {
  race: string
  cap: string
  mastery: string
  expRate: string
  partyExpRate: string
  questExpRate: string
  hwidLimit: string
  ipLimit: string
  botDetect: string
  /** null = DB unreachable */
  registeredAccounts: number | null
}

function readEnv(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback
}

async function queryLevelCap(): Promise<string> {
  try {
    const pool = await getDbPool('shard')
    const result = await pool.request().query<{ cap: number }>(`
      SELECT MAX(Lvl) AS cap FROM [dbo].[_RefLevel]
    `)
    const cap = result.recordset[0]?.cap
    return cap != null ? String(cap) : readEnv('SERVER_CAP', '?')
  } catch {
    return readEnv('SERVER_CAP', '?')
  }
}

async function queryRegisteredAccounts(): Promise<number | null> {
  try {
    const pool = await getDbPool('account')
    const result = await pool.request().query<{ total: number }>(`
      SELECT COUNT(*) AS total FROM [dbo].[TB_User]
    `)
    return result.recordset[0]?.total ?? null
  } catch {
    return null
  }
}

export async function getServerInfo(): Promise<ServerInfo> {
  const [cap, registeredAccounts] = await Promise.all([
    queryLevelCap(),
    queryRegisteredAccounts(),
  ])

  return {
    race: readEnv('SERVER_RACE', 'Chinese/Europe'),
    cap,
    mastery: readEnv('SERVER_MASTERY', '?'),
    expRate: readEnv('SERVER_EXP_RATE', '1x'),
    partyExpRate: readEnv('SERVER_PARTY_EXP_RATE', '1x'),
    questExpRate: readEnv('SERVER_QUEST_EXP_RATE', '1x'),
    hwidLimit: readEnv('SERVER_HWID_LIMIT', '?'),
    ipLimit: readEnv('SERVER_IP_LIMIT', '?'),
    botDetect: readEnv('SERVER_BOT_DETECT', '?'),
    registeredAccounts,
  }
}
