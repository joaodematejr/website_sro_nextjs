import { getDbPool } from '@/lib/db'

export type RankingEntry = {
  rank: number
  charName: string
  guildName: string
  points: number
}

export type RankingData = {
  players: RankingEntry[]
  guilds: RankingEntry[]
}

async function queryPlayerRanking(): Promise<RankingEntry[]> {
  try {
    const pool = await getDbPool('shard')

    // Try _Ranking table first (exists in some SRO versions)
    try {
      const result = await pool.request().query<{
        CharName: string
        GuildName: string | null
        Points: number
      }>(`
        SELECT TOP 5
          r.CharName,
          ISNULL(r.GuildName, '') AS GuildName,
          r.Points
        FROM [dbo].[_Ranking] r
        ORDER BY r.Points DESC
      `)
      if (result.recordset.length > 0) {
        return result.recordset.map((row, i) => ({
          rank: i + 1,
          charName: row.CharName,
          guildName: row.GuildName ?? '',
          points: row.Points,
        }))
      }
    } catch {
      // _Ranking not found, fall through to _Char query
    }

    // Fallback: query _Char joined with _Guild
    const result = await pool.request().query<{
      CharName16: string
      GuildName: string | null
      Points: number
    }>(`
      SELECT TOP 5
        c.CharName16,
        ISNULL(g.GuildName, '') AS GuildName,
        ISNULL(c.RemainStatPoint, c.Degree) AS Points
      FROM [dbo].[_Char] c
      LEFT JOIN [dbo].[_Guild] g ON c.GuildID = g.GuildID
      WHERE c.CharType = 0
      ORDER BY ISNULL(c.RemainStatPoint, c.Degree) DESC
    `)

    return result.recordset.map((row, i) => ({
      rank: i + 1,
      charName: row.CharName16,
      guildName: row.GuildName ?? '',
      points: row.Points ?? 0,
    }))
  } catch {
    return []
  }
}

async function queryGuildRanking(): Promise<RankingEntry[]> {
  try {
    const pool = await getDbPool('shard')

    const result = await pool.request().query<{
      GuildName: string
      MasterName: string | null
      MemberCount: number
    }>(`
      SELECT TOP 5
        g.GuildName,
        ISNULL(m.CharName16, '') AS MasterName,
        g.MemberCount
      FROM [dbo].[_Guild] g
      LEFT JOIN [dbo].[_Char] m ON g.MasterID = m.CharID
      ORDER BY g.MemberCount DESC
    `)

    return result.recordset.map((row, i) => ({
      rank: i + 1,
      charName: row.MasterName ?? '',
      guildName: row.GuildName,
      points: row.MemberCount ?? 0,
    }))
  } catch {
    return []
  }
}

export async function getRankingData(): Promise<RankingData> {
  const [players, guilds] = await Promise.all([queryPlayerRanking(), queryGuildRanking()])
  return { players, guilds }
}
