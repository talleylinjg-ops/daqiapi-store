// Full world country list (ISO 3166-1 alpha-2) with eSIM plan region mapping.
// Region reflects which regional plan covers the destination:
//   europe -> eu-3gb / eu-5gb      asia -> as-5gb
//   usa    -> us-unlimited         global -> global-3gb / global-10gb

const ALL_CODES = ('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ ' +
  'BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ ' +
  'DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY ' +
  'HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY ' +
  'MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ ' +
  'NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN ' +
  'PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL ' +
  'SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR ' +
  'TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW')
  .split(/\s+/)
  .filter(Boolean);

const EUROPE = [
  'AL', 'AD', 'AT', 'AX', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE',
  'DK', 'EE', 'ES', 'FI', 'FO', 'FR', 'GB', 'GG', 'GI', 'GR', 'HR', 'HU',
  'IE', 'IM', 'IS', 'IT', 'JE', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME',
  'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'SE', 'SI', 'SK', 'SM',
  'TR', 'UA', 'VA', 'XK',
];

const ASIA = [
  'AF', 'BD', 'BN', 'BT', 'CN', 'HK', 'ID', 'IN', 'JP', 'KH', 'KR', 'LA',
  'LK', 'MM', 'MN', 'MO', 'MV', 'MY', 'NP', 'PK', 'PH', 'SG', 'TH', 'TL',
  'TW', 'VN',
];

const USA = ['US'];

const FEATURED = [
  'us', 'gb', 'de', 'fr', 'it', 'es', 'nl', 'jp', 'kr', 'sg', 'hk', 'cn',
  'th', 'au', 'br', 'ae', 'mx', 'za',
];

const REGION_LABELS = {
  europe: 'Europe',
  asia: 'Asia Pacific',
  usa: 'United States',
  global: 'Global / Rest of world',
};

const OVERRIDES = { XK: 'Kosovo' };

function regionFor(code) {
  const c = code.toUpperCase();
  if (USA.includes(c)) return 'usa';
  if (EUROPE.includes(c)) return 'europe';
  if (ASIA.includes(c)) return 'asia';
  return 'global';
}

function listCountries() {
  const names = new Intl.DisplayNames(['en'], { type: 'region' });
  return ALL_CODES.map((code) => ({
    code: code.toLowerCase(),
    name: OVERRIDES[code] || names.of(code) || code,
    region: regionFor(code),
    featured: FEATURED.includes(code.toLowerCase()),
  })).filter((c) => c.name && c.name !== c.code.toUpperCase());
}

module.exports = { listCountries, regionFor, REGION_LABELS };
