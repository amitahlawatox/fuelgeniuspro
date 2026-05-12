export interface UKCity {
  slug: string
  name: string
  county: string
  postcode: string
  lat: number
  lng: number
  population: number
  nearby: string[]
}

export const ukCities: UKCity[] = [
  { slug: 'london', name: 'London', county: 'Greater London', postcode: 'EC1A', lat: 51.5074, lng: -0.1278, population: 9000000, nearby: ['croydon', 'bromley', 'watford'] },
  { slug: 'birmingham', name: 'Birmingham', county: 'West Midlands', postcode: 'B1', lat: 52.4862, lng: -1.8904, population: 1150000, nearby: ['coventry', 'wolverhampton', 'solihull'] },
  { slug: 'manchester', name: 'Manchester', county: 'Greater Manchester', postcode: 'M1', lat: 53.4808, lng: -2.2426, population: 560000, nearby: ['salford', 'stockport', 'bolton'] },
  { slug: 'leeds', name: 'Leeds', county: 'West Yorkshire', postcode: 'LS1', lat: 53.8008, lng: -1.5491, population: 800000, nearby: ['bradford', 'wakefield', 'harrogate'] },
  { slug: 'glasgow', name: 'Glasgow', county: 'Scotland', postcode: 'G1', lat: 55.8642, lng: -4.2518, population: 635000, nearby: ['paisley', 'hamilton', 'dumbarton'] },
  { slug: 'sheffield', name: 'Sheffield', county: 'South Yorkshire', postcode: 'S1', lat: 53.3811, lng: -1.4701, population: 584000, nearby: ['rotherham', 'barnsley', 'doncaster'] },
  { slug: 'edinburgh', name: 'Edinburgh', county: 'Scotland', postcode: 'EH1', lat: 55.9533, lng: -3.1883, population: 525000, nearby: ['livingston', 'kirkcaldy', 'dunfermline'] },
  { slug: 'liverpool', name: 'Liverpool', county: 'Merseyside', postcode: 'L1', lat: 53.4084, lng: -2.9916, population: 498000, nearby: ['birkenhead', 'st-helens', 'widnes'] },
  { slug: 'bristol', name: 'Bristol', county: 'Bristol', postcode: 'BS1', lat: 51.4545, lng: -2.5879, population: 470000, nearby: ['bath', 'weston-super-mare', 'gloucester'] },
  { slug: 'cardiff', name: 'Cardiff', county: 'Wales', postcode: 'CF10', lat: 51.4816, lng: -3.1791, population: 366000, nearby: ['newport', 'barry', 'pontypridd'] },
  { slug: 'nottingham', name: 'Nottingham', county: 'Nottinghamshire', postcode: 'NG1', lat: 52.9548, lng: -1.1581, population: 330000, nearby: ['derby', 'leicester', 'mansfield'] },
  { slug: 'leicester', name: 'Leicester', county: 'Leicestershire', postcode: 'LE1', lat: 52.6369, lng: -1.1398, population: 355000, nearby: ['nottingham', 'derby', 'coventry'] },
  { slug: 'coventry', name: 'Coventry', county: 'West Midlands', postcode: 'CV1', lat: 52.4068, lng: -1.5197, population: 370000, nearby: ['birmingham', 'leamington-spa', 'nuneaton'] },
  { slug: 'hull', name: 'Hull', county: 'East Riding of Yorkshire', postcode: 'HU1', lat: 53.7457, lng: -0.3367, population: 260000, nearby: ['beverley', 'bridlington', 'grimsby'] },
  { slug: 'bradford', name: 'Bradford', county: 'West Yorkshire', postcode: 'BD1', lat: 53.7960, lng: -1.7594, population: 540000, nearby: ['leeds', 'keighley', 'shipley'] },
  { slug: 'stoke-on-trent', name: 'Stoke-on-Trent', county: 'Staffordshire', postcode: 'ST1', lat: 53.0027, lng: -2.1794, population: 255000, nearby: ['newcastle-under-lyme', 'stafford', 'crewe'] },
  { slug: 'wolverhampton', name: 'Wolverhampton', county: 'West Midlands', postcode: 'WV1', lat: 52.5855, lng: -2.1288, population: 262000, nearby: ['birmingham', 'walsall', 'dudley'] },
  { slug: 'plymouth', name: 'Plymouth', county: 'Devon', postcode: 'PL1', lat: 50.3755, lng: -4.1427, population: 263000, nearby: ['exeter', 'torquay', 'newton-abbot'] },
  { slug: 'southampton', name: 'Southampton', county: 'Hampshire', postcode: 'SO14', lat: 50.9097, lng: -1.4044, population: 253000, nearby: ['portsmouth', 'winchester', 'eastleigh'] },
  { slug: 'reading', name: 'Reading', county: 'Berkshire', postcode: 'RG1', lat: 51.4543, lng: -0.9781, population: 232000, nearby: ['slough', 'maidenhead', 'basingstoke'] },
  { slug: 'derby', name: 'Derby', county: 'Derbyshire', postcode: 'DE1', lat: 52.9225, lng: -1.4746, population: 257000, nearby: ['nottingham', 'burton-on-trent', 'ilkeston'] },
  { slug: 'newcastle', name: 'Newcastle upon Tyne', county: 'Tyne and Wear', postcode: 'NE1', lat: 54.9783, lng: -1.6174, population: 302000, nearby: ['sunderland', 'gateshead', 'durham'] },
  { slug: 'sunderland', name: 'Sunderland', county: 'Tyne and Wear', postcode: 'SR1', lat: 54.9061, lng: -1.3816, population: 280000, nearby: ['newcastle', 'durham', 'middlesbrough'] },
  { slug: 'oxford', name: 'Oxford', county: 'Oxfordshire', postcode: 'OX1', lat: 51.7520, lng: -1.2577, population: 161000, nearby: ['abingdon', 'witney', 'bicester'] },
  { slug: 'cambridge', name: 'Cambridge', county: 'Cambridgeshire', postcode: 'CB1', lat: 52.2053, lng: 0.1218, population: 145000, nearby: ['ely', 'huntingdon', 'st-ives'] },
  { slug: 'brighton', name: 'Brighton', county: 'East Sussex', postcode: 'BN1', lat: 50.8229, lng: -0.1363, population: 290000, nearby: ['hove', 'worthing', 'lewes'] },
  { slug: 'portsmouth', name: 'Portsmouth', county: 'Hampshire', postcode: 'PO1', lat: 50.8198, lng: -1.0880, population: 215000, nearby: ['southampton', 'gosport', 'fareham'] },
  { slug: 'swansea', name: 'Swansea', county: 'Wales', postcode: 'SA1', lat: 51.6214, lng: -3.9436, population: 246000, nearby: ['cardiff', 'neath', 'bridgend'] },
  { slug: 'exeter', name: 'Exeter', county: 'Devon', postcode: 'EX1', lat: 50.7184, lng: -3.5339, population: 130000, nearby: ['plymouth', 'taunton', 'torquay'] },
  { slug: 'peterborough', name: 'Peterborough', county: 'Cambridgeshire', postcode: 'PE1', lat: 52.5736, lng: -0.2430, population: 210000, nearby: ['cambridge', 'huntingdon', 'stamford'] },
]

export function getCityBySlug(slug: string): UKCity | undefined {
  return ukCities.find(c => c.slug === slug)
}
