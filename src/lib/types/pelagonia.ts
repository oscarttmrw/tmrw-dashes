export interface PelagoniaRow {
  opportunityId: string
  stage: string
  value: number
  contactId: string
  createdAt: string | null
  wonAt: string | null
  callsBooked: number
  appointmentStatus: string
  isWon: boolean
}
