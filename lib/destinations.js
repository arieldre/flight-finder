// typicalDirect = typical non-stop flight time in minutes from TLV. null = no direct.
const DEST_MAP = {
  // ── Cyprus ───────────────────────────────────────────────────────────────
  LCA: { name: 'Cyprus (Larnaca)',       country: 'CY', typicalDirect: 70  },
  PFO: { name: 'Cyprus (Paphos)',        country: 'CY', typicalDirect: 65  },

  // ── Greece ───────────────────────────────────────────────────────────────
  ATH: { name: 'Athens',                 country: 'GR', typicalDirect: 135 },
  RHO: { name: 'Rhodes',                 country: 'GR', typicalDirect: 105 },
  SKG: { name: 'Thessaloniki',           country: 'GR', typicalDirect: 120 },
  HER: { name: 'Heraklion (Crete)',      country: 'GR', typicalDirect: 110 },
  JMK: { name: 'Mykonos',               country: 'GR', typicalDirect: 120 },
  JTR: { name: 'Santorini',             country: 'GR', typicalDirect: 130 },
  CFU: { name: 'Corfu',                 country: 'GR', typicalDirect: 140 },
  KGS: { name: 'Kos',                   country: 'GR', typicalDirect: 100 },
  ZTH: { name: 'Zakynthos',             country: 'GR', typicalDirect: 135 },

  // ── Turkey ───────────────────────────────────────────────────────────────
  IST: { name: 'Istanbul',              country: 'TR', typicalDirect: 90  },
  SAW: { name: 'Istanbul (Sabiha)',     country: 'TR', typicalDirect: 90  },
  ADB: { name: 'Izmir',                country: 'TR', typicalDirect: 80  },
  AYT: { name: 'Antalya',              country: 'TR', typicalDirect: 85  },
  DLM: { name: 'Dalaman',              country: 'TR', typicalDirect: 90  },
  BJV: { name: 'Bodrum',               country: 'TR', typicalDirect: 85  },

  // ── Caucasus ─────────────────────────────────────────────────────────────
  TBS: { name: 'Tbilisi',              country: 'GE', typicalDirect: 180 },
  EVN: { name: 'Yerevan',              country: 'AM', typicalDirect: 175 },
  GYD: { name: 'Baku',                 country: 'AZ', typicalDirect: 185 },

  // ── Balkans ──────────────────────────────────────────────────────────────
  SOF: { name: 'Sofia',                country: 'BG', typicalDirect: 150 },
  OTP: { name: 'Bucharest',            country: 'RO', typicalDirect: 170 },
  BEG: { name: 'Belgrade',             country: 'RS', typicalDirect: 195 },
  TIA: { name: 'Tirana',               country: 'AL', typicalDirect: 175 },
  SKP: { name: 'Skopje',               country: 'MK', typicalDirect: 165 },
  DBV: { name: 'Dubrovnik',            country: 'HR', typicalDirect: 190 },
  SPU: { name: 'Split',                country: 'HR', typicalDirect: 185 },
  ZAG: { name: 'Zagreb',               country: 'HR', typicalDirect: 195 },
  LJU: { name: 'Ljubljana',            country: 'SI', typicalDirect: 210 },
  SKD: { name: 'Podgorica',            country: 'ME', typicalDirect: 185 },

  // ── Middle East ──────────────────────────────────────────────────────────
  AMM: { name: 'Amman',                country: 'JO', typicalDirect: 60  },
  CAI: { name: 'Cairo',                country: 'EG', typicalDirect: 90  },
  HRG: { name: 'Hurghada',             country: 'EG', typicalDirect: 90  },
  SSH: { name: 'Sharm el-Sheikh',      country: 'EG', typicalDirect: 55  },

  // ── Gulf ─────────────────────────────────────────────────────────────────
  DXB: { name: 'Dubai',                country: 'AE', typicalDirect: 210 },
  AUH: { name: 'Abu Dhabi',            country: 'AE', typicalDirect: 215 },
  SHJ: { name: 'Sharjah',              country: 'AE', typicalDirect: 215 },
  BAH: { name: 'Bahrain',              country: 'BH', typicalDirect: 190 },

  // ── Morocco ──────────────────────────────────────────────────────────────
  CMN: { name: 'Casablanca',           country: 'MA', typicalDirect: 310 },
  RAK: { name: 'Marrakech',            country: 'MA', typicalDirect: 320 },
  AGA: { name: 'Agadir',               country: 'MA', typicalDirect: 330 },

  // ── Central Europe ───────────────────────────────────────────────────────
  VIE: { name: 'Vienna',               country: 'AT', typicalDirect: 260 },
  BUD: { name: 'Budapest',             country: 'HU', typicalDirect: 240 },
  PRG: { name: 'Prague',               country: 'CZ', typicalDirect: 270 },
  WAW: { name: 'Warsaw',               country: 'PL', typicalDirect: 280 },
  KRK: { name: 'Krakow',               country: 'PL', typicalDirect: 290 },
  BTS: { name: 'Bratislava',           country: 'SK', typicalDirect: 265 },
  BRQ: { name: 'Brno',                 country: 'CZ', typicalDirect: 275 },

  // ── Western Europe ───────────────────────────────────────────────────────
  AMS: { name: 'Amsterdam',            country: 'NL', typicalDirect: 275 },
  BRU: { name: 'Brussels',             country: 'BE', typicalDirect: 280 },
  CDG: { name: 'Paris (CDG)',           country: 'FR', typicalDirect: 295 },
  ORY: { name: 'Paris (Orly)',          country: 'FR', typicalDirect: 295 },
  FRA: { name: 'Frankfurt',            country: 'DE', typicalDirect: 270 },
  MUC: { name: 'Munich',               country: 'DE', typicalDirect: 275 },
  BER: { name: 'Berlin',               country: 'DE', typicalDirect: 285 },
  HAM: { name: 'Hamburg',              country: 'DE', typicalDirect: 295 },
  ZRH: { name: 'Zurich',               country: 'CH', typicalDirect: 280 },
  GVA: { name: 'Geneva',               country: 'CH', typicalDirect: 290 },
  FCO: { name: 'Rome (Fiumicino)',      country: 'IT', typicalDirect: 270 },
  CIA: { name: 'Rome (Ciampino)',       country: 'IT', typicalDirect: 270 },
  MXP: { name: 'Milan (Malpensa)',      country: 'IT', typicalDirect: 280 },
  BGY: { name: 'Milan (Bergamo)',       country: 'IT', typicalDirect: 280 },
  VCE: { name: 'Venice',               country: 'IT', typicalDirect: 275 },
  NAP: { name: 'Naples',               country: 'IT', typicalDirect: 265 },
  BCN: { name: 'Barcelona',            country: 'ES', typicalDirect: 310 },
  MAD: { name: 'Madrid',               country: 'ES', typicalDirect: 320 },
  AGP: { name: 'Malaga',               country: 'ES', typicalDirect: 305 },
  PMI: { name: 'Mallorca',             country: 'ES', typicalDirect: 320 },
  IBZ: { name: 'Ibiza',                country: 'ES', typicalDirect: 325 },
  LIS: { name: 'Lisbon',               country: 'PT', typicalDirect: 340 },
  OPO: { name: 'Porto',                country: 'PT', typicalDirect: 345 },
  FAO: { name: 'Faro (Algarve)',        country: 'PT', typicalDirect: 340 },
  CPH: { name: 'Copenhagen',           country: 'DK', typicalDirect: 300 },
  OSL: { name: 'Oslo',                 country: 'NO', typicalDirect: 320 },
  ARN: { name: 'Stockholm',            country: 'SE', typicalDirect: 315 },
  HEL: { name: 'Helsinki',             country: 'FI', typicalDirect: 310 },
  DUB: { name: 'Dublin',               country: 'IE', typicalDirect: 310 },
  MLA: { name: 'Malta',                country: 'MT', typicalDirect: 195 },

  // ── UK ───────────────────────────────────────────────────────────────────
  LHR: { name: 'London (Heathrow)',     country: 'GB', typicalDirect: 285 },
  LGW: { name: 'London (Gatwick)',      country: 'GB', typicalDirect: 285 },
  STN: { name: 'London (Stansted)',     country: 'GB', typicalDirect: 285 },
  LTN: { name: 'London (Luton)',        country: 'GB', typicalDirect: 285 },
  MAN: { name: 'Manchester',           country: 'GB', typicalDirect: 295 },
  EDI: { name: 'Edinburgh',            country: 'GB', typicalDirect: 305 },

  // ── SE Asia ──────────────────────────────────────────────────────────────
  BKK: { name: 'Bangkok (Suvarnabhumi)', country: 'TH', typicalDirect: null },
  DMK: { name: 'Bangkok (Don Mueang)',   country: 'TH', typicalDirect: null },
  HKT: { name: 'Phuket',               country: 'TH', typicalDirect: null },
  CNX: { name: 'Chiang Mai',            country: 'TH', typicalDirect: null },
  SIN: { name: 'Singapore',             country: 'SG', typicalDirect: null },
  CGK: { name: 'Jakarta',               country: 'ID', typicalDirect: null },
  DPS: { name: 'Bali (Denpasar)',        country: 'ID', typicalDirect: null },
  MNL: { name: 'Manila',                country: 'PH', typicalDirect: null },
  CEB: { name: 'Cebu',                  country: 'PH', typicalDirect: null },
  SGN: { name: 'Ho Chi Minh City',      country: 'VN', typicalDirect: null },
  HAN: { name: 'Hanoi',                 country: 'VN', typicalDirect: null },
  PNH: { name: 'Phnom Penh',            country: 'KH', typicalDirect: null },
  REP: { name: 'Siem Reap',             country: 'KH', typicalDirect: null },
  RGN: { name: 'Yangon',                country: 'MM', typicalDirect: null },

  // ── East Asia ────────────────────────────────────────────────────────────
  NRT: { name: 'Tokyo (Narita)',         country: 'JP', typicalDirect: null },
  HND: { name: 'Tokyo (Haneda)',         country: 'JP', typicalDirect: null },
  KIX: { name: 'Osaka',                 country: 'JP', typicalDirect: null },
  ICN: { name: 'Seoul (Incheon)',        country: 'KR', typicalDirect: null },
  TPE: { name: 'Taipei',                country: 'TW', typicalDirect: null },

  // ── South Asia ───────────────────────────────────────────────────────────
  DEL: { name: 'Delhi',                 country: 'IN', typicalDirect: null },
  BOM: { name: 'Mumbai',                country: 'IN', typicalDirect: null },
  CMB: { name: 'Colombo (Sri Lanka)',    country: 'LK', typicalDirect: null },
  MLE: { name: 'Maldives',              country: 'MV', typicalDirect: null },
  KTM: { name: 'Kathmandu',             country: 'NP', typicalDirect: null },

  // ── Americas ─────────────────────────────────────────────────────────────
  JFK: { name: 'New York (JFK)',         country: 'US', typicalDirect: null },
  EWR: { name: 'New York (Newark)',      country: 'US', typicalDirect: null },
  MIA: { name: 'Miami',                 country: 'US', typicalDirect: null },
  LAX: { name: 'Los Angeles',           country: 'US', typicalDirect: null },
  ORD: { name: 'Chicago',               country: 'US', typicalDirect: null },
  YYZ: { name: 'Toronto',               country: 'CA', typicalDirect: null },
  YVR: { name: 'Vancouver',             country: 'CA', typicalDirect: null },
  GRU: { name: 'São Paulo',             country: 'BR', typicalDirect: null },
  GIG: { name: 'Rio de Janeiro',        country: 'BR', typicalDirect: null },
  BOG: { name: 'Bogotá',               country: 'CO', typicalDirect: null },
  LIM: { name: 'Lima',                  country: 'PE', typicalDirect: null },
  SCL: { name: 'Santiago',              country: 'CL', typicalDirect: null },
  EZE: { name: 'Buenos Aires',          country: 'AR', typicalDirect: null },
  MEX: { name: 'Mexico City',           country: 'MX', typicalDirect: null },
  CUN: { name: 'Cancun',                country: 'MX', typicalDirect: null },

  // ── Africa ───────────────────────────────────────────────────────────────
  JNB: { name: 'Johannesburg',          country: 'ZA', typicalDirect: null },
  CPT: { name: 'Cape Town',             country: 'ZA', typicalDirect: null },
  NBO: { name: 'Nairobi',               country: 'KE', typicalDirect: null },
  ADD: { name: 'Addis Ababa',           country: 'ET', typicalDirect: null },
  TUN: { name: 'Tunis',                 country: 'TN', typicalDirect: null },
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
