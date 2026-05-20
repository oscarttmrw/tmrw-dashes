import { num, txt, type ProcessorResult } from './_canonical-helpers'

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

function todaysDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Social Followers processor. Snapshot of follower counts per platform —
 * Platform / Followers / Notes. The upload date is stamped on every row,
 * so re-uploading the same sheet on a later day yields a fresh snapshot.
 */
export function processSocialFollowers(data: Record<string, unknown>[]): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []
  const snapshotDate = todaysDate()

  data.forEach((row, i) => {
    const nk = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [norm(k), v])
    )
    const platform = txt(nk['platform'])
    const followers = num(nk['followers'])
    if (!platform) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing Platform` })
      return
    }
    if (followers === null) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing Followers value` })
      return
    }
    validRows.push({
      date: snapshotDate,
      platform,
      followers,
      notes: txt(nk['notes']),
    })
  })

  return { validRows, errors }
}

export { processSocialFollowers as processSocialFollowersToCanonical }
