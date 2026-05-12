export interface MetaAdRow {
  adSetName: string
  campaignName: string
  spend: number
  impressions: number
  clicks: number
  landingPageViews: number
  conversions: number
  costPerResult: number | null
  costPerLPV: number | null
  ctr: number | null
  dateStart: string | null
  dateStop: string | null
}
