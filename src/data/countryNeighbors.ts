// Land border adjacency map: country ISO code -> array of neighboring country ISO codes
// Only includes countries that exist in our countries.ts dataset

export const countryNeighbors: Record<string, string[]> = {
  // ============ AFRICA ============
  dz: ['tn', 'ly', 'ne', 'mr', 'ma', 'ml'],                   // Algeria
  ao: ['cd', 'cg', 'zm', 'na'],                                 // Angola
  bj: ['bf', 'ne', 'ng', 'tg'],                                 // Benin
  bw: ['za', 'na', 'zm', 'zw'],                                 // Botswana
  bf: ['ml', 'ne', 'bj', 'tg', 'gh', 'ci'],                    // Burkina Faso
  bi: ['cd', 'rw', 'tz'],                                       // Burundi
  cm: ['ng', 'td', 'cf', 'cg', 'ga', 'gq'],                    // Cameroon
  cf: ['td', 'sd', 'ss', 'cd', 'cg', 'cm'],                    // Central African Republic
  td: ['ly', 'ne', 'ng', 'cm', 'cf', 'sd'],                    // Chad
  cg: ['ga', 'cm', 'cf', 'cd', 'ao'],                           // Congo
  cd: ['cg', 'cf', 'ss', 'ug', 'rw', 'bi', 'tz', 'zm', 'ao'], // DR Congo
  ci: ['lr', 'gn', 'ml', 'bf', 'gh'],                           // Côte d'Ivoire
  dj: ['er', 'et', 'so'],                                       // Djibouti
  eg: ['ly', 'sd', 'il', 'ps'],                                 // Egypt
  gq: ['cm', 'ga'],                                              // Equatorial Guinea
  er: ['sd', 'et', 'dj'],                                       // Eritrea
  sz: ['za', 'mz'],                                              // Eswatini
  et: ['er', 'dj', 'so', 'ke', 'ss', 'sd'],                    // Ethiopia
  ga: ['gq', 'cm', 'cg'],                                       // Gabon
  gm: ['sn'],                                                    // Gambia
  gh: ['ci', 'bf', 'tg'],                                       // Ghana
  gn: ['lr', 'sl', 'ci', 'ml', 'sn', 'gw'],                    // Guinea
  gw: ['sn', 'gn'],                                              // Guinea-Bissau
  ke: ['et', 'so', 'tz', 'ug', 'ss', 'sd'],                    // Kenya
  ls: ['za'],                                                     // Lesotho
  lr: ['gn', 'ci', 'sl'],                                       // Liberia
  ly: ['tn', 'dz', 'ne', 'td', 'sd', 'eg'],                    // Libya
  mw: ['mz', 'tz', 'zm'],                                       // Malawi
  ml: ['dz', 'ne', 'bf', 'ci', 'gn', 'sn', 'mr'],              // Mali
  mr: ['sn', 'ml', 'dz', 'ma'],                                 // Mauritania
  ma: ['dz', 'mr'],                                              // Morocco
  mz: ['tz', 'mw', 'zm', 'zw', 'za', 'sz'],                    // Mozambique
  na: ['ao', 'zm', 'bw', 'za'],                                 // Namibia
  ne: ['dz', 'ly', 'td', 'ng', 'bj', 'bf', 'ml'],              // Niger
  ng: ['bj', 'ne', 'td', 'cm'],                                 // Nigeria
  rw: ['ug', 'tz', 'bi', 'cd'],                                 // Rwanda
  sn: ['mr', 'ml', 'gn', 'gw', 'gm'],                          // Senegal
  sl: ['gn', 'lr'],                                              // Sierra Leone
  so: ['dj', 'et', 'ke'],                                       // Somalia
  za: ['na', 'bw', 'zw', 'mz', 'sz', 'ls'],                    // South Africa
  ss: ['sd', 'et', 'ke', 'ug', 'cd', 'cf'],                    // South Sudan
  sd: ['eg', 'ly', 'td', 'cf', 'ss', 'et', 'er'],              // Sudan
  tz: ['ke', 'ug', 'rw', 'bi', 'cd', 'zm', 'mw', 'mz'],       // Tanzania
  tg: ['gh', 'bf', 'bj'],                                       // Togo
  tn: ['dz', 'ly'],                                              // Tunisia
  ug: ['ke', 'ss', 'cd', 'rw', 'tz'],                           // Uganda
  zm: ['cd', 'tz', 'mw', 'mz', 'zw', 'bw', 'na', 'ao'],       // Zambia
  zw: ['za', 'bw', 'zm', 'mz'],                                 // Zimbabwe

  // ============ ASIA ============
  af: ['pk', 'ir', 'tm', 'uz', 'tj', 'cn'],                    // Afghanistan
  am: ['ge', 'az', 'tr', 'ir'],                                 // Armenia
  az: ['ru', 'ge', 'am', 'ir', 'tr'],                           // Azerbaijan
  bd: ['in', 'mm'],                                              // Bangladesh
  bt: ['cn', 'in'],                                              // Bhutan
  bn: ['my'],                                                    // Brunei
  kh: ['th', 'la', 'vn'],                                       // Cambodia
  cn: ['mn', 'ru', 'kp', 'vn', 'la', 'mm', 'in', 'bt', 'np', 'pk', 'af', 'tj', 'kg', 'kz'], // China
  ge: ['ru', 'az', 'am', 'tr'],                                 // Georgia
  in: ['pk', 'cn', 'np', 'bt', 'bd', 'mm'],                    // India
  id: ['my', 'pg', 'tl'],                                       // Indonesia
  ir: ['iq', 'tr', 'am', 'az', 'tm', 'af', 'pk'],              // Iran
  iq: ['tr', 'ir', 'kw', 'sa', 'jo', 'sy'],                    // Iraq
  il: ['lb', 'sy', 'jo', 'eg', 'ps'],                           // Israel
  jo: ['sy', 'iq', 'sa', 'il', 'ps'],                           // Jordan
  kz: ['ru', 'cn', 'kg', 'uz', 'tm'],                           // Kazakhstan
  kw: ['iq', 'sa'],                                              // Kuwait
  kg: ['kz', 'cn', 'tj', 'uz'],                                 // Kyrgyzstan
  la: ['mm', 'cn', 'vn', 'kh', 'th'],                           // Laos
  lb: ['sy', 'il'],                                              // Lebanon
  my: ['th', 'id', 'bn'],                                       // Malaysia
  mn: ['ru', 'cn'],                                              // Mongolia
  mm: ['cn', 'la', 'th', 'bd', 'in'],                           // Myanmar
  np: ['cn', 'in'],                                              // Nepal
  kp: ['cn', 'kr', 'ru'],                                       // North Korea
  om: ['ae', 'sa', 'ye'],                                       // Oman
  pk: ['in', 'af', 'ir', 'cn'],                                 // Pakistan
  ps: ['il', 'eg', 'jo'],                                       // Palestine
  qa: ['sa'],                                                    // Qatar
  sa: ['jo', 'iq', 'kw', 'qa', 'ae', 'om', 'ye'],              // Saudi Arabia
  kr: ['kp'],                                                    // South Korea
  sy: ['tr', 'iq', 'jo', 'il', 'lb'],                           // Syria
  tj: ['af', 'cn', 'kg', 'uz'],                                 // Tajikistan
  th: ['mm', 'la', 'kh', 'my'],                                 // Thailand
  tl: ['id'],                                                    // Timor-Leste
  tr: ['gr', 'bg', 'ge', 'am', 'az', 'ir', 'iq', 'sy'],        // Turkey
  tm: ['kz', 'uz', 'af', 'ir'],                                 // Turkmenistan
  ae: ['om', 'sa'],                                              // UAE
  uz: ['kz', 'tm', 'af', 'tj', 'kg'],                           // Uzbekistan
  vn: ['cn', 'la', 'kh'],                                       // Vietnam
  ye: ['sa', 'om'],                                              // Yemen

  // ============ EUROPE ============
  al: ['me', 'xk', 'mk', 'gr'],                                 // Albania
  ad: ['fr', 'es'],                                              // Andorra
  at: ['de', 'cz', 'sk', 'hu', 'si', 'it', 'ch', 'li'],        // Austria
  by: ['ru', 'ua', 'pl', 'lt', 'lv'],                           // Belarus
  be: ['nl', 'de', 'lu', 'fr'],                                 // Belgium
  ba: ['hr', 'rs', 'me'],                                       // Bosnia and Herzegovina
  bg: ['ro', 'rs', 'mk', 'gr', 'tr'],                           // Bulgaria
  hr: ['si', 'hu', 'rs', 'ba', 'me'],                           // Croatia
  cz: ['de', 'pl', 'sk', 'at'],                                 // Czech Republic
  dk: ['de'],                                                    // Denmark
  ee: ['ru', 'lv'],                                              // Estonia
  fi: ['no', 'ru', 'se'],                                       // Finland
  fr: ['be', 'lu', 'de', 'ch', 'it', 'mc', 'es', 'ad'],        // France
  de: ['dk', 'pl', 'cz', 'at', 'ch', 'fr', 'lu', 'be', 'nl'], // Germany
  gr: ['al', 'mk', 'bg', 'tr'],                                 // Greece
  hu: ['at', 'sk', 'ua', 'ro', 'rs', 'hr', 'si'],              // Hungary
  ie: ['gb'],                                                     // Ireland
  it: ['fr', 'ch', 'at', 'si', 'sm', 'va'],                    // Italy
  xk: ['rs', 'me', 'al', 'mk'],                                 // Kosovo
  lv: ['ee', 'lt', 'ru', 'by'],                                 // Latvia
  li: ['at', 'ch'],                                              // Liechtenstein
  lt: ['lv', 'by', 'pl', 'ru'],                                 // Lithuania
  lu: ['be', 'de', 'fr'],                                       // Luxembourg
  md: ['ro', 'ua'],                                              // Moldova
  mc: ['fr'],                                                    // Monaco
  me: ['hr', 'ba', 'rs', 'xk', 'al'],                           // Montenegro
  nl: ['be', 'de'],                                              // Netherlands
  mk: ['rs', 'xk', 'al', 'gr', 'bg'],                           // North Macedonia
  no: ['se', 'fi', 'ru'],                                       // Norway
  pl: ['de', 'cz', 'sk', 'ua', 'by', 'lt', 'ru'],              // Poland
  pt: ['es'],                                                    // Portugal
  ro: ['md', 'ua', 'hu', 'rs', 'bg'],                           // Romania
  ru: ['no', 'fi', 'ee', 'lv', 'lt', 'pl', 'by', 'ua', 'ge', 'az', 'kz', 'mn', 'cn', 'kp'], // Russia
  sm: ['it'],                                                    // San Marino
  rs: ['hu', 'ro', 'bg', 'mk', 'xk', 'me', 'ba', 'hr'],       // Serbia
  sk: ['pl', 'ua', 'hu', 'at', 'cz'],                           // Slovakia
  si: ['it', 'at', 'hu', 'hr'],                                 // Slovenia
  es: ['pt', 'fr', 'ad'],                                       // Spain
  se: ['no', 'fi'],                                              // Sweden
  ch: ['de', 'fr', 'it', 'at', 'li'],                           // Switzerland
  ua: ['ru', 'by', 'pl', 'sk', 'hu', 'ro', 'md'],              // Ukraine
  gb: ['ie'],                                                     // United Kingdom
  va: ['it'],                                                    // Vatican City

  // ============ AMERICAS ============
  ar: ['cl', 'bo', 'py', 'br', 'uy'],                           // Argentina
  bz: ['mx', 'gt'],                                              // Belize
  bo: ['br', 'py', 'ar', 'cl', 'pe'],                           // Bolivia
  br: ['gy', 'sr', 've', 'co', 'pe', 'bo', 'py', 'ar', 'uy'], // Brazil
  ca: ['us'],                                                    // Canada
  cl: ['pe', 'bo', 'ar'],                                       // Chile
  co: ['ve', 'br', 'pe', 'ec', 'pa'],                           // Colombia
  cr: ['ni', 'pa'],                                              // Costa Rica
  ec: ['co', 'pe'],                                              // Ecuador
  sv: ['gt', 'hn'],                                              // El Salvador
  gt: ['mx', 'bz', 'sv', 'hn'],                                 // Guatemala
  gy: ['ve', 'br', 'sr'],                                       // Guyana
  ht: ['do'],                                                    // Haiti
  hn: ['gt', 'sv', 'ni'],                                       // Honduras
  mx: ['us', 'gt', 'bz'],                                       // Mexico
  ni: ['hn', 'cr'],                                              // Nicaragua
  pa: ['cr', 'co'],                                              // Panama
  py: ['bo', 'br', 'ar'],                                       // Paraguay
  pe: ['ec', 'co', 'br', 'bo', 'cl'],                           // Peru
  sr: ['gy', 'br'],                                              // Suriname (French Guiana border omitted)
  us: ['ca', 'mx'],                                              // United States
  uy: ['ar', 'br'],                                              // Uruguay
  ve: ['co', 'br', 'gy'],                                       // Venezuela
  do: ['ht'],                                                    // Dominican Republic
};

// Get countries that have at least one neighbor in our dataset
export function getCountriesWithNeighbors(): string[] {
  return Object.keys(countryNeighbors).filter(
    (code) => countryNeighbors[code] && countryNeighbors[code].length > 0,
  );
}
