// typicalDirect = typical non-stop flight time in minutes from TLV. null = no direct.
const DEST_MAP = {
  // ── Cyprus ───────────────────────────────────────────────────────────────
  LCA: { name: 'Cyprus (Larnaca)',       country: 'CY', typicalDirect: 70,  tags: ['beach', 'islands'] },
  PFO: { name: 'Cyprus (Paphos)',        country: 'CY', typicalDirect: 65,  tags: ['beach', 'islands'] },

  // ── Greece ───────────────────────────────────────────────────────────────
  ATH: { name: 'Athens',                 country: 'GR', typicalDirect: 135, tags: ['city', 'culture'] },
  RHO: { name: 'Rhodes',                 country: 'GR', typicalDirect: 105, tags: ['beach', 'islands'] },
  SKG: { name: 'Thessaloniki',           country: 'GR', typicalDirect: 120, tags: ['city', 'culture'] },
  HER: { name: 'Heraklion (Crete)',      country: 'GR', typicalDirect: 110, tags: ['beach', 'islands', 'culture'] },
  JMK: { name: 'Mykonos',               country: 'GR', typicalDirect: 120, tags: ['beach', 'islands', 'party'] },
  JTR: { name: 'Santorini',             country: 'GR', typicalDirect: 130, tags: ['beach', 'islands'] },
  CFU: { name: 'Corfu',                 country: 'GR', typicalDirect: 140, tags: ['beach', 'islands'] },
  KGS: { name: 'Kos',                   country: 'GR', typicalDirect: 100, tags: ['beach', 'islands'] },
  ZTH: { name: 'Zakynthos',             country: 'GR', typicalDirect: 135, tags: ['beach', 'islands'] },

  // ── Turkey ───────────────────────────────────────────────────────────────
  IST: { name: 'Istanbul',              country: 'TR', typicalDirect: 90,  tags: ['city', 'culture'] },
  SAW: { name: 'Istanbul (Sabiha)',     country: 'TR', typicalDirect: 90,  tags: ['city', 'culture'] },
  ADB: { name: 'Izmir',                country: 'TR', typicalDirect: 80,  tags: ['city', 'beach'] },
  AYT: { name: 'Antalya',              country: 'TR', typicalDirect: 85,  tags: ['beach'] },
  DLM: { name: 'Dalaman',              country: 'TR', typicalDirect: 90,  tags: ['beach'] },
  BJV: { name: 'Bodrum',               country: 'TR', typicalDirect: 85,  tags: ['beach'] },

  // ── Caucasus ─────────────────────────────────────────────────────────────
  TBS: { name: 'Tbilisi',              country: 'GE', typicalDirect: 180, tags: ['city', 'culture', 'mountains'] },
  EVN: { name: 'Yerevan',              country: 'AM', typicalDirect: 175, tags: ['city', 'culture'] },
  GYD: { name: 'Baku',                 country: 'AZ', typicalDirect: 185, tags: ['city', 'culture'] },

  // ── Balkans ──────────────────────────────────────────────────────────────
  SOF: { name: 'Sofia',                country: 'BG', typicalDirect: 150, tags: ['city', 'culture', 'mountains'] },
  OTP: { name: 'Bucharest',            country: 'RO', typicalDirect: 170, tags: ['city', 'culture'] },
  BEG: { name: 'Belgrade',             country: 'RS', typicalDirect: 195, tags: ['city'] },
  TIA: { name: 'Tirana',               country: 'AL', typicalDirect: 175, tags: ['city'] },
  SKP: { name: 'Skopje',               country: 'MK', typicalDirect: 165, tags: ['city'] },
  DBV: { name: 'Dubrovnik',            country: 'HR', typicalDirect: 190, tags: ['beach', 'city', 'culture'] },
  SPU: { name: 'Split',                country: 'HR', typicalDirect: 185, tags: ['beach', 'city'] },
  ZAG: { name: 'Zagreb',               country: 'HR', typicalDirect: 195, tags: ['city'] },
  LJU: { name: 'Ljubljana',            country: 'SI', typicalDirect: 210, tags: ['city', 'nature'] },
  SKD: { name: 'Podgorica',            country: 'ME', typicalDirect: 185, tags: ['city', 'mountains'] },

  // ── Middle East ──────────────────────────────────────────────────────────
  AMM: { name: 'Amman',                country: 'JO', typicalDirect: 60,  tags: ['city', 'culture'] },
  CAI: { name: 'Cairo',                country: 'EG', typicalDirect: 90,  tags: ['city', 'culture'] },
  HRG: { name: 'Hurghada',             country: 'EG', typicalDirect: 90,  tags: ['beach'] },
  SSH: { name: 'Sharm el-Sheikh',      country: 'EG', typicalDirect: 55,  tags: ['beach'] },

  // ── Gulf ─────────────────────────────────────────────────────────────────
  DXB: { name: 'Dubai',                country: 'AE', typicalDirect: 210, tags: ['city'] },
  AUH: { name: 'Abu Dhabi',            country: 'AE', typicalDirect: 215, tags: ['city'] },
  SHJ: { name: 'Sharjah',              country: 'AE', typicalDirect: 215, tags: ['city'] },
  BAH: { name: 'Bahrain',              country: 'BH', typicalDirect: 190, tags: ['city'] },

  // ── Morocco ──────────────────────────────────────────────────────────────
  CMN: { name: 'Casablanca',           country: 'MA', typicalDirect: 310, tags: ['city', 'culture'] },
  RAK: { name: 'Marrakech',            country: 'MA', typicalDirect: 320, tags: ['city', 'culture'] },
  AGA: { name: 'Agadir',               country: 'MA', typicalDirect: 330, tags: ['beach'] },

  // ── Central Europe ───────────────────────────────────────────────────────
  VIE: { name: 'Vienna',               country: 'AT', typicalDirect: 260, tags: ['city', 'culture'] },
  BUD: { name: 'Budapest',             country: 'HU', typicalDirect: 240, tags: ['city', 'culture'] },
  PRG: { name: 'Prague',               country: 'CZ', typicalDirect: 270, tags: ['city', 'culture'] },
  WAW: { name: 'Warsaw',               country: 'PL', typicalDirect: 280, tags: ['city', 'culture'] },
  KRK: { name: 'Krakow',               country: 'PL', typicalDirect: 290, tags: ['city', 'culture'] },
  BTS: { name: 'Bratislava',           country: 'SK', typicalDirect: 265, tags: ['city'] },
  BRQ: { name: 'Brno',                 country: 'CZ', typicalDirect: 275, tags: ['city'] },

  // ── Western Europe ───────────────────────────────────────────────────────
  AMS: { name: 'Amsterdam',            country: 'NL', typicalDirect: 275, tags: ['city', 'culture'] },
  BRU: { name: 'Brussels',             country: 'BE', typicalDirect: 280, tags: ['city'] },
  CDG: { name: 'Paris (CDG)',           country: 'FR', typicalDirect: 295, tags: ['city', 'culture'] },
  ORY: { name: 'Paris (Orly)',          country: 'FR', typicalDirect: 295, tags: ['city', 'culture'] },
  FRA: { name: 'Frankfurt',            country: 'DE', typicalDirect: 270, tags: ['city'] },
  MUC: { name: 'Munich',               country: 'DE', typicalDirect: 275, tags: ['city', 'culture'] },
  BER: { name: 'Berlin',               country: 'DE', typicalDirect: 285, tags: ['city'] },
  HAM: { name: 'Hamburg',              country: 'DE', typicalDirect: 295, tags: ['city'] },
  ZRH: { name: 'Zurich',               country: 'CH', typicalDirect: 280, tags: ['city', 'mountains'] },
  GVA: { name: 'Geneva',               country: 'CH', typicalDirect: 290, tags: ['city', 'mountains', 'ski'] },
  FCO: { name: 'Rome (Fiumicino)',      country: 'IT', typicalDirect: 270, tags: ['city', 'culture'] },
  CIA: { name: 'Rome (Ciampino)',       country: 'IT', typicalDirect: 270, tags: ['city', 'culture'] },
  MXP: { name: 'Milan (Malpensa)',      country: 'IT', typicalDirect: 280, tags: ['city', 'culture'] },
  BGY: { name: 'Milan (Bergamo)',       country: 'IT', typicalDirect: 280, tags: ['city', 'culture'] },
  VCE: { name: 'Venice',               country: 'IT', typicalDirect: 275, tags: ['city', 'culture'] },
  NAP: { name: 'Naples',               country: 'IT', typicalDirect: 265, tags: ['city', 'culture', 'beach'] },
  BCN: { name: 'Barcelona',            country: 'ES', typicalDirect: 310, tags: ['city', 'beach'] },
  MAD: { name: 'Madrid',               country: 'ES', typicalDirect: 320, tags: ['city', 'culture'] },
  AGP: { name: 'Malaga',               country: 'ES', typicalDirect: 305, tags: ['beach', 'city'] },
  PMI: { name: 'Mallorca',             country: 'ES', typicalDirect: 320, tags: ['beach', 'islands'] },
  IBZ: { name: 'Ibiza',                country: 'ES', typicalDirect: 325, tags: ['beach', 'islands', 'party'] },
  LIS: { name: 'Lisbon',               country: 'PT', typicalDirect: 340, tags: ['city', 'culture'] },
  OPO: { name: 'Porto',                country: 'PT', typicalDirect: 345, tags: ['city', 'culture'] },
  FAO: { name: 'Faro (Algarve)',        country: 'PT', typicalDirect: 340, tags: ['beach'] },
  CPH: { name: 'Copenhagen',           country: 'DK', typicalDirect: 300, tags: ['city', 'culture'] },
  OSL: { name: 'Oslo',                 country: 'NO', typicalDirect: 320, tags: ['city', 'nature'] },
  ARN: { name: 'Stockholm',            country: 'SE', typicalDirect: 315, tags: ['city'] },
  HEL: { name: 'Helsinki',             country: 'FI', typicalDirect: 310, tags: ['city', 'nature'] },
  DUB: { name: 'Dublin',               country: 'IE', typicalDirect: 310, tags: ['city'] },
  MLA: { name: 'Malta',                country: 'MT', typicalDirect: 195, tags: ['beach', 'islands', 'culture'] },

  // ── UK ───────────────────────────────────────────────────────────────────
  LHR: { name: 'London (Heathrow)',     country: 'GB', typicalDirect: 285, tags: ['city', 'culture'] },
  LGW: { name: 'London (Gatwick)',      country: 'GB', typicalDirect: 285, tags: ['city', 'culture'] },
  STN: { name: 'London (Stansted)',     country: 'GB', typicalDirect: 285, tags: ['city', 'culture'] },
  LTN: { name: 'London (Luton)',        country: 'GB', typicalDirect: 285, tags: ['city', 'culture'] },
  MAN: { name: 'Manchester',           country: 'GB', typicalDirect: 295, tags: ['city'] },
  EDI: { name: 'Edinburgh',            country: 'GB', typicalDirect: 305, tags: ['city', 'culture'] },

  // ── SE Asia ──────────────────────────────────────────────────────────────
  BKK: { name: 'Bangkok (Suvarnabhumi)', country: 'TH', typicalDirect: null, tags: ['city', 'culture'] },
  DMK: { name: 'Bangkok (Don Mueang)',   country: 'TH', typicalDirect: null, tags: ['city', 'culture'] },
  HKT: { name: 'Phuket',               country: 'TH', typicalDirect: null, tags: ['beach', 'islands', 'party'] },
  CNX: { name: 'Chiang Mai',            country: 'TH', typicalDirect: null, tags: ['city', 'culture', 'nature', 'mountains'] },
  SIN: { name: 'Singapore',             country: 'SG', typicalDirect: null, tags: ['city'] },
  CGK: { name: 'Jakarta',               country: 'ID', typicalDirect: null, tags: ['city'] },
  DPS: { name: 'Bali (Denpasar)',        country: 'ID', typicalDirect: null, tags: ['beach', 'islands', 'nature', 'culture'] },
  MNL: { name: 'Manila',                country: 'PH', typicalDirect: null, tags: ['city'] },
  CEB: { name: 'Cebu',                  country: 'PH', typicalDirect: null, tags: ['beach', 'islands'] },
  SGN: { name: 'Ho Chi Minh City',      country: 'VN', typicalDirect: null, tags: ['city', 'culture'] },
  HAN: { name: 'Hanoi',                 country: 'VN', typicalDirect: null, tags: ['city', 'culture'] },
  PNH: { name: 'Phnom Penh',            country: 'KH', typicalDirect: null, tags: ['city', 'culture'] },
  REP: { name: 'Siem Reap',             country: 'KH', typicalDirect: null, tags: ['culture', 'nature'] },
  RGN: { name: 'Yangon',                country: 'MM', typicalDirect: null, tags: ['city', 'culture'] },

  // ── East Asia ────────────────────────────────────────────────────────────
  NRT: { name: 'Tokyo (Narita)',         country: 'JP', typicalDirect: null, tags: ['city', 'culture'] },
  HND: { name: 'Tokyo (Haneda)',         country: 'JP', typicalDirect: null, tags: ['city', 'culture'] },
  KIX: { name: 'Osaka',                 country: 'JP', typicalDirect: null, tags: ['city', 'culture'] },
  ICN: { name: 'Seoul (Incheon)',        country: 'KR', typicalDirect: null, tags: ['city', 'culture'] },
  TPE: { name: 'Taipei',                country: 'TW', typicalDirect: null, tags: ['city', 'culture'] },

  // ── South Asia ───────────────────────────────────────────────────────────
  DEL: { name: 'Delhi',                 country: 'IN', typicalDirect: null, tags: ['city', 'culture'] },
  BOM: { name: 'Mumbai',                country: 'IN', typicalDirect: null, tags: ['city', 'culture'] },
  CMB: { name: 'Colombo (Sri Lanka)',    country: 'LK', typicalDirect: null, tags: ['city', 'beach', 'culture'] },
  MLE: { name: 'Maldives',              country: 'MV', typicalDirect: null, tags: ['beach', 'islands'] },
  KTM: { name: 'Kathmandu',             country: 'NP', typicalDirect: null, tags: ['city', 'mountains', 'nature', 'culture'] },

  // ── Americas ─────────────────────────────────────────────────────────────
  JFK: { name: 'New York (JFK)',         country: 'US', typicalDirect: null, tags: ['city'] },
  EWR: { name: 'New York (Newark)',      country: 'US', typicalDirect: null, tags: ['city'] },
  MIA: { name: 'Miami',                 country: 'US', typicalDirect: null, tags: ['city', 'beach', 'party'] },
  LAX: { name: 'Los Angeles',           country: 'US', typicalDirect: null, tags: ['city', 'beach'] },
  ORD: { name: 'Chicago',               country: 'US', typicalDirect: null, tags: ['city'] },
  YYZ: { name: 'Toronto',               country: 'CA', typicalDirect: null, tags: ['city'] },
  YVR: { name: 'Vancouver',             country: 'CA', typicalDirect: null, tags: ['city', 'nature', 'mountains'] },
  GRU: { name: 'São Paulo',             country: 'BR', typicalDirect: null, tags: ['city'] },
  GIG: { name: 'Rio de Janeiro',        country: 'BR', typicalDirect: null, tags: ['city', 'beach'] },
  BOG: { name: 'Bogotá',               country: 'CO', typicalDirect: null, tags: ['city', 'mountains'] },
  LIM: { name: 'Lima',                  country: 'PE', typicalDirect: null, tags: ['city', 'culture'] },
  SCL: { name: 'Santiago',              country: 'CL', typicalDirect: null, tags: ['city', 'mountains'] },
  EZE: { name: 'Buenos Aires',          country: 'AR', typicalDirect: null, tags: ['city', 'culture'] },
  MEX: { name: 'Mexico City',           country: 'MX', typicalDirect: null, tags: ['city', 'culture'] },
  CUN: { name: 'Cancun',                country: 'MX', typicalDirect: null, tags: ['beach', 'islands', 'party'] },

  // ── Africa ───────────────────────────────────────────────────────────────
  JNB: { name: 'Johannesburg',          country: 'ZA', typicalDirect: null, tags: ['city', 'nature'] },
  CPT: { name: 'Cape Town',             country: 'ZA', typicalDirect: null, tags: ['city', 'beach', 'nature', 'mountains'] },
  NBO: { name: 'Nairobi',               country: 'KE', typicalDirect: null, tags: ['city', 'nature'] },
  ADD: { name: 'Addis Ababa',           country: 'ET', typicalDirect: null, tags: ['city', 'culture'] },
  TUN: { name: 'Tunis',                 country: 'TN', typicalDirect: null, tags: ['city', 'culture', 'beach'] },
};

export const DESTINATIONS = Object.entries(DEST_MAP).map(([iata, d]) => ({ iata, ...d }));

// Budget-scan clusters — each = one SerpAPI call per origin.
// Long-haul clusters (SE Asia, Americas, Africa) excluded from default scan — too expensive.
// Use --deep flag (future) or specific-route search instead.
export const CLUSTERS = [
  { label: 'Cyprus',          airports: ['LCA', 'PFO']                                    },
  { label: 'Greece',          airports: ['ATH', 'RHO', 'SKG', 'HER', 'JMK', 'JTR', 'CFU', 'KGS', 'ZTH'] },
  { label: 'Turkey',          airports: ['IST', 'SAW', 'ADB', 'AYT', 'DLM', 'BJV']       },
  { label: 'Caucasus',        airports: ['TBS', 'EVN', 'GYD']                             },
  { label: 'Balkans',         airports: ['SOF', 'OTP', 'BEG', 'TIA', 'SKP', 'DBV', 'SPU', 'ZAG'] },
  { label: 'Middle East',     airports: ['AMM', 'CAI', 'HRG', 'SSH']                      },
  { label: 'Gulf',            airports: ['DXB', 'AUH', 'SHJ', 'BAH']                     },
  { label: 'Morocco',         airports: ['CMN', 'RAK', 'AGA']                             },
  { label: 'Central Europe',  airports: ['VIE', 'BUD', 'PRG', 'WAW', 'KRK']              },
  { label: 'Malta & Adriatic',airports: ['MLA', 'DBV', 'SPU']                             },
];

// Clusters reachable from Haifa (HFA has very limited international routes)
export const HFA_CLUSTERS = ['Cyprus', 'Greece'];

export function destByIata(iata) {
  return DEST_MAP[iata] || { name: iata, country: null, typicalDirect: null };
}

// Returns all destinations in a given region (for UI/filtering)
export function destsByCountry(countryCode) {
  return DESTINATIONS.filter(d => d.country === countryCode);
}
