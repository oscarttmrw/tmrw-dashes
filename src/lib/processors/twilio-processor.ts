import { num, int, txt, tsIso, type ProcessorResult } from './_canonical-helpers'

/**
 * Twilio messages processor. Reads the Twilio message extract into canonical
 * twilio_messages rows — the source for "inbound messages by channel", which
 * is deliberately separate from Zendesk ticket volume.
 *
 * The message Body is dropped (member PII / health content); only metadata is
 * kept. SentDate is an ISO-8601 timestamp with offset, so native parsing works.
 * A row is rejected only if it has no parseable SentDate.
 */

/** Normalise Twilio direction into 'inbound' / 'outbound' (raw otherwise). */
function normalizeDirection(v: unknown): string | null {
  const t = txt(v)
  if (t === null) return null
  const lc = t.toLowerCase()
  if (lc.includes('inbound')) return 'inbound'
  if (lc.includes('outbound')) return 'outbound'
  return lc
}

export function processTwilioToCanonical(
  data: Record<string, unknown>[]
): ProcessorResult {
  const validRows: Record<string, unknown>[] = []
  const errors: { rowIndex: number; reason: string }[] = []

  data.forEach((row, i) => {
    const lc = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
    )

    const sentAt = tsIso(lc['sentdate'] ?? lc['sent date'] ?? lc['sent_at'])
    if (!sentAt) {
      errors.push({ rowIndex: i, reason: `Row ${i}: missing or unparseable SentDate` })
      return
    }

    const channel = txt(lc['channel'])

    validRows.push({
      channel: channel ? channel.toLowerCase() : null,
      status: txt(lc['status']),
      sent_at: sentAt,
      direction: normalizeDirection(lc['direction']),
      num_segments: int(lc['numsegments'] ?? lc['num segments'] ?? lc['segments']),
      error_code: int(lc['errorcode'] ?? lc['error code']),
      price: num(lc['price']),
      price_unit: txt(lc['priceunit'] ?? lc['price unit']),
      tags: txt(lc['tags']),
      // Body intentionally not mapped — member PII / health content.
    })
  })

  return { validRows, errors }
}
