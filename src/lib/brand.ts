export const TMRW_LOGOS = {
  wordmarkBlack:
    'https://res.cloudinary.com/dkbhatjde/image/upload/v1774156339/TMRW_Wordmark_Black_fo2tpb.svg',
  wordmarkWhite:
    'https://res.cloudinary.com/dkbhatjde/image/upload/v1774156339/TMRW_Wordmark_White_feybxl.svg',
  monogramBlack:
    'https://res.cloudinary.com/dkbhatjde/image/upload/v1774156339/TMRW_Monogram_Black_m8ld50.svg',
  monogramWhite:
    'https://res.cloudinary.com/dkbhatjde/image/upload/v1774156339/TMRW_Monogram_White_dyghqg.svg',
  monogramBlackOutline:
    'https://res.cloudinary.com/dkbhatjde/image/upload/v1774156339/TMRW_Monogram_Black_Outline_zgdfvf.svg',
  monogramWhiteOutline:
    'https://res.cloudinary.com/dkbhatjde/image/upload/v1774156339/TMRW_Monogram_White_Outline_sreoif.svg',
} as const

const CLOUDINARY_BASE =
  'https://res.cloudinary.com/dkbhatjde/image/upload/f_auto,q_auto'

export const TMRW_PHOTOGRAPHY = [
  '251107_TMRW_JADE_MANNING_0302_1_1_flxuv7',
  '251107_TMRW_JADE_MANNING_0155_1_sptkpm',
  '251107_TMRW_JADE_MANNING_0104_1_eo8n1y',
  '251107_TMRW_JADE_MANNING_0231_1_zowich',
  '09_251030_TMRW_1187_edited_1_apqtry',
  '03_250801_TMRW_1295_1_xnqklr',
  '02_TMRW_0427_1_tg6fsg',
  '01_TMRW_0233_1_yzquwb',
  '04_TMRW_0410_Version4_1_ec7mf5',
  '04_TMRW_0336_Version4_1_vggeeq',
  '02_250801_TMRW_0672_1_tmbarf',
  '03_TMRW_1075_vn7csq',
  '03_TMRW_1302_tcp5ca',
  '03_TMRW_1325_ormdcd',
  '06_TMRW_0929_i2io86',
  '06_TMRW_0839_i7s4p3',
  '06_TMRW_0767_ten8ay',
  '06_TMRW_0710_scr6br',
  '06_TMRW_0885_dftsfv',
  'Copy_of_06_TMRW_0944_irwlis',
  '251114_TMRW_DAMIR_MUJANIC_068_1_dmnkue',
  '01_TMRW_Portraits_0011_Version4_cfphmi',
  '03_TMRW_Portraits_0786_Version4_bhoyrm',
  '01_TMRW_Portraits_0142_Version4_vzq80v',
  '03_TMRW_Portraits_0818_Version4_qlzncj',
  '01_TMRW_Portraits_0006_Version4_lxxetr',
  '01_TMRW_Portraits_0103_Version4_u0fvv1',
  '01_TMRW_Portraits_0002_Version4_rdqes6',
  '251128_TMRW_SOPHIA_PALMER_986_vag7qj',
  '251128_TMRW_SOPHIA_PALMER_893_nosimu',
  '251128_TMRW_SOPHIA_PALMER_908_hkfxpy',
  '251128_TMRW_SOPHIA_PALMER_996_p71dd5',
  '251128_TMRW_SOPHIA_PALMER_1252_ojglrf',
  '251128_TMRW_SOPHIA_PALMER_1264_busqpp',
  '251128_TMRW_SOPHIA_PALMER_1239_iragol',
  '251128_TMRW_SOPHIA_PALMER_1252_ypy8y7',
  '251128_TMRW_SOPHIA_PALMER_1264_zfsyzd',
  '251128_TMRW_ROBPALMER_611_ikw04n',
  '251128_TMRW_ROB_PALMER_506_ydteag',
  '251128_TMRW_ROBPALMER_611_uo4lmu',
  '251114_TMRW_LUCIA_MARTINEZ_1002_strnbm',
  '251114_TMRW_LUCIA_MARTINEZ_1134_hx6rib',
  '251114_TMRW_LUCIA_MARTINEZ_769_1_xfqfjl',
  '251114_TMRW_LUCIA_MARTINEZ_1186_ycpf3n',
  '251114_TMRW_LUCIA_MARTINEZ_644_g67rz7',
  '251128_TMRW_PAULHINES_1368_ilj0tu',
  '251128_TMRW_PAUL_HINES_1527_v37kef',
  '251128_TMRW_PAUL_HINES_1887_y9myed',
  '251128_TMRW_PAUL_HINES_1806_fray7o',
  '251128_TMRW_PAUL_HINES_1853_ygruys',
]

export function getBrandImageUrl(id: string): string {
  return `${CLOUDINARY_BASE}/${id}`
}

export function getRandomBrandImages(count = 3): string[] {
  const shuffled = [...TMRW_PHOTOGRAPHY].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map(getBrandImageUrl)
}
