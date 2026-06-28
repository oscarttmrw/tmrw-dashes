/**
 * Per-channel support SLAs. Dan asked for first-response and full-resolution
 * time measured BY CHANNEL against a channel-specific target — live channels
 * (chat/phone) are held to much tighter targets than async ones (email/web).
 *
 * Times are in MINUTES. `green` = met, `amber` = warning band, beyond = red.
 * Channel keys match the buckets emitted by the Zendesk processor
 * (normalizeChannel): email, chat, phone, web, social, api.
 *
 * These are sensible defaults — tune per TMRW's actual support commitments.
 */

export interface ChannelSla {
  channel: string
  label: string
  firstReply: { green: number; amber: number }   // minutes
  resolution: { green: number; amber: number }    // minutes
}

export const channelSlas: ChannelSla[] = [
  { channel: 'chat',   label: 'Chat / Messaging', firstReply: { green: 5,   amber: 15 },  resolution: { green: 60,   amber: 240 } },
  { channel: 'phone',  label: 'Phone / Voice',    firstReply: { green: 5,   amber: 15 },  resolution: { green: 60,   amber: 240 } },
  { channel: 'social', label: 'Social',           firstReply: { green: 60,  amber: 180 }, resolution: { green: 480,  amber: 1440 } },
  { channel: 'email',  label: 'Email',            firstReply: { green: 240, amber: 480 }, resolution: { green: 1440, amber: 2880 } },
  { channel: 'web',    label: 'Web Form',         firstReply: { green: 240, amber: 480 }, resolution: { green: 1440, amber: 2880 } },
  { channel: 'api',    label: 'API / Other',      firstReply: { green: 240, amber: 480 }, resolution: { green: 1440, amber: 2880 } },
]

// Fallback for any channel without an explicit SLA (treated as async).
export const defaultChannelSla: ChannelSla = {
  channel: 'default',
  label: 'Other',
  firstReply: { green: 240, amber: 480 },
  resolution: { green: 1440, amber: 2880 },
}

export function getChannelSla(channel: string | null | undefined): ChannelSla {
  if (!channel) return defaultChannelSla
  return channelSlas.find(c => c.channel === channel.toLowerCase()) ?? defaultChannelSla
}

type RagStatus = 'green' | 'amber' | 'red'

/** Evaluate a minutes value against a channel's first-reply or resolution SLA. */
export function evaluateChannelSla(
  channel: string | null | undefined,
  kind: 'firstReply' | 'resolution',
  minutes: number
): RagStatus {
  const band = getChannelSla(channel)[kind]
  if (minutes <= band.green) return 'green'
  if (minutes <= band.amber) return 'amber'
  return 'red'
}
