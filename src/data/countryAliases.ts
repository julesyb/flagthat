// Comprehensive mapping of country name aliases, alternative names, and common typos.
// Keys are normalized (lowercase, trimmed). Values are the canonical country name
// as it appears in countries.ts.
//
// Categories of entries:
//   - Alternative/historical names (e.g. "ivory coast" → "Côte d'Ivoire")
//   - Accent-stripped versions (e.g. "cote d'ivoire" → "Côte d'Ivoire")
//   - Common misspellings and typos
//   - Abbreviated forms (e.g. "uae" → "United Arab Emirates")

export const countryAliases: Record<string, string> = {
  // ============ AFRICA ============

  // Algeria
  'algera': 'Algeria',
  'algeira': 'Algeria',
  'algiria': 'Algeria',
  'aljeria': 'Algeria',

  // Angola
  'angla': 'Angola',
  'angolla': 'Angola',

  // Benin
  'benen': 'Benin',
  'benni': 'Benin',

  // Botswana
  'botswanna': 'Botswana',
  'botsawna': 'Botswana',
  'botswna': 'Botswana',

  // Burkina Faso
  'burkina': 'Burkina Faso',
  'burkino faso': 'Burkina Faso',
  'bukina faso': 'Burkina Faso',
  'burkina fasso': 'Burkina Faso',

  // Burundi
  'burandi': 'Burundi',
  'burrundi': 'Burundi',

  // Cabo Verde
  'cape verde': 'Cabo Verde',
  'capeverde': 'Cabo Verde',
  'cabo verd': 'Cabo Verde',
  'caboverde': 'Cabo Verde',

  // Cameroon
  'cameroun': 'Cameroon',
  'camerun': 'Cameroon',
  'camroon': 'Cameroon',
  'cameroom': 'Cameroon',

  // Central African Republic
  'car': 'Central African Republic',
  'central african rep': 'Central African Republic',
  'central african repbulic': 'Central African Republic',
  'central afican republic': 'Central African Republic',

  // Chad
  'tchad': 'Chad',

  // Comoros
  'comores': 'Comoros',
  'comorros': 'Comoros',
  'comors': 'Comoros',

  // Congo
  'republic of congo': 'Congo',
  'congo republic': 'Congo',
  'republic of the congo': 'Congo',
  'congo brazzaville': 'Congo',

  // DR Congo
  'democratic republic of congo': 'DR Congo',
  'democratic republic of the congo': 'DR Congo',
  'drc': 'DR Congo',
  'congo kinshasa': 'DR Congo',
  'zaire': 'DR Congo',

  // Côte d'Ivoire
  "cote d'ivoire": "Côte d'Ivoire",
  'cote divoire': "Côte d'Ivoire",
  "cote d ivoire": "Côte d'Ivoire",
  'ivory coast': "Côte d'Ivoire",
  'ivorycoast': "Côte d'Ivoire",
  "côte divoire": "Côte d'Ivoire",
  "côte d ivoire": "Côte d'Ivoire",
  'cote d\'ivory': "Côte d'Ivoire",
  'ivory koast': "Côte d'Ivoire",

  // Djibouti
  'djbouti': 'Djibouti',
  'djibooti': 'Djibouti',
  'djibuti': 'Djibouti',
  'jibouti': 'Djibouti',
  'djibuoti': 'Djibouti',

  // Egypt
  'egyp': 'Egypt',
  'eygpt': 'Egypt',
  'egipt': 'Egypt',
  'aegypt': 'Egypt',

  // Equatorial Guinea
  'equitorial guinea': 'Equatorial Guinea',
  'equatorial guniea': 'Equatorial Guinea',
  'equatorial guin': 'Equatorial Guinea',
  'eq guinea': 'Equatorial Guinea',

  // Eritrea
  'eritria': 'Eritrea',
  'eritra': 'Eritrea',
  'eritera': 'Eritrea',

  // Eswatini
  'swaziland': 'Eswatini',
  'eswatni': 'Eswatini',
  'eswaitini': 'Eswatini',
  'esswatini': 'Eswatini',

  // Ethiopia
  'ethopia': 'Ethiopia',
  'etheopia': 'Ethiopia',
  'ethipia': 'Ethiopia',
  'ethiopa': 'Ethiopia',

  // Gabon
  'gabbon': 'Gabon',
  'gabun': 'Gabon',

  // Gambia
  'gamia': 'Gambia',
  'the gambia': 'Gambia',
  'gambia': 'Gambia',

  // Ghana
  'gana': 'Ghana',
  'ghanna': 'Ghana',

  // Guinea
  'guniea': 'Guinea',
  'guinia': 'Guinea',
  'ginea': 'Guinea',

  // Guinea-Bissau
  'guinea bissau': 'Guinea-Bissau',
  'guineabissau': 'Guinea-Bissau',
  'guinea bisau': 'Guinea-Bissau',
  'guinea bisson': 'Guinea-Bissau',

  // Kenya
  'kenia': 'Kenya',
  'keyna': 'Kenya',

  // Lesotho
  'lesoto': 'Lesotho',
  'lesotoh': 'Lesotho',
  'leshoto': 'Lesotho',

  // Liberia
  'libera': 'Liberia',
  'libirea': 'Liberia',

  // Libya
  'libia': 'Libya',
  'lybia': 'Libya',

  // Madagascar
  'madagsacar': 'Madagascar',
  'madagaskar': 'Madagascar',
  'madgascar': 'Madagascar',
  'madagacar': 'Madagascar',

  // Malawi
  'malwi': 'Malawi',
  'malawai': 'Malawi',

  // Mali
  'maili': 'Mali',

  // Mauritania
  'mauritana': 'Mauritania',
  'muritania': 'Mauritania',
  'mauritainia': 'Mauritania',

  // Mauritius
  'mauritus': 'Mauritius',
  'mauritious': 'Mauritius',
  'mauritous': 'Mauritius',

  // Morocco
  'morroco': 'Morocco',
  'morrocco': 'Morocco',
  'moroco': 'Morocco',
  'marocco': 'Morocco',
  'marroco': 'Morocco',

  // Mozambique
  'mozambiq': 'Mozambique',
  'mozambque': 'Mozambique',
  'mosambique': 'Mozambique',
  'mozambik': 'Mozambique',

  // Namibia
  'nambia': 'Namibia',
  'namibea': 'Namibia',

  // Niger
  'nigre': 'Niger',

  // Nigeria
  'nigera': 'Nigeria',
  'nigiria': 'Nigeria',
  'nigerea': 'Nigeria',

  // Rwanda
  'ruanda': 'Rwanda',
  'rawanda': 'Rwanda',
  'rwnada': 'Rwanda',

  // São Tomé and Príncipe
  'sao tome and principe': 'São Tomé and Príncipe',
  'sao tome': 'São Tomé and Príncipe',
  'sao tome & principe': 'São Tomé and Príncipe',
  'são tome and principe': 'São Tomé and Príncipe',
  'sao tome and princpe': 'São Tomé and Príncipe',
  'st and p': 'São Tomé and Príncipe',

  // Senegal
  'sengal': 'Senegal',
  'senagal': 'Senegal',
  'senegall': 'Senegal',

  // Seychelles
  'sechelles': 'Seychelles',
  'seycheles': 'Seychelles',
  'seychells': 'Seychelles',

  // Sierra Leone
  'sieraleone': 'Sierra Leone',
  'sierra leon': 'Sierra Leone',
  'siera leone': 'Sierra Leone',
  'sierraleone': 'Sierra Leone',

  // Somalia
  'somlia': 'Somalia',
  'somailia': 'Somalia',
  'somala': 'Somalia',

  // South Africa
  'southafrica': 'South Africa',
  'south afica': 'South Africa',
  'south afirca': 'South Africa',
  'sa': 'South Africa',

  // South Sudan
  'southsudan': 'South Sudan',
  'south sudaan': 'South Sudan',
  's sudan': 'South Sudan',

  // Sudan
  'sudaan': 'Sudan',
  'suden': 'Sudan',

  // Tanzania
  'tanzana': 'Tanzania',
  'tanzinia': 'Tanzania',
  'tansania': 'Tanzania',
  'tanziania': 'Tanzania',

  // Togo
  'toggo': 'Togo',

  // Tunisia
  'tunisa': 'Tunisia',
  'tunesia': 'Tunisia',
  'tunizia': 'Tunisia',

  // Uganda
  'ugunda': 'Uganda',
  'ugana': 'Uganda',

  // Zambia
  'zambi': 'Zambia',
  'zamiba': 'Zambia',

  // Zimbabwe
  'zimbabw': 'Zimbabwe',
  'zimbabe': 'Zimbabwe',
  'zimbabawe': 'Zimbabwe',
  'zimbawbe': 'Zimbabwe',
  'rhodesia': 'Zimbabwe',

  // ============ ASIA ============

  // Afghanistan
  'afganistan': 'Afghanistan',
  'afganstan': 'Afghanistan',
  'afghanastan': 'Afghanistan',
  'afgahnistan': 'Afghanistan',
  'afghanstan': 'Afghanistan',

  // Armenia
  'armena': 'Armenia',
  'armania': 'Armenia',

  // Azerbaijan
  'azerbajan': 'Azerbaijan',
  'azerbijan': 'Azerbaijan',
  'azerbiajan': 'Azerbaijan',
  'azerbajan': 'Azerbaijan',

  // Bahrain
  'bahrien': 'Bahrain',
  'bahrein': 'Bahrain',
  'bharain': 'Bahrain',

  // Bangladesh
  'bangledesh': 'Bangladesh',
  'bangladash': 'Bangladesh',
  'bangaldesh': 'Bangladesh',
  'bengladesh': 'Bangladesh',

  // Bhutan
  'buhtan': 'Bhutan',
  'buthan': 'Bhutan',

  // Brunei
  'burnei': 'Brunei',
  'brunai': 'Brunei',

  // Cambodia
  'camboda': 'Cambodia',
  'combodia': 'Cambodia',
  'cambodja': 'Cambodia',
  'kampuchea': 'Cambodia',

  // China
  'chian': 'China',
  'cihna': 'China',

  // Cyprus
  'cypris': 'Cyprus',
  'cypras': 'Cyprus',
  'cypros': 'Cyprus',

  // Georgia
  'gorgia': 'Georgia',
  'goergia': 'Georgia',

  // India
  'inida': 'India',
  'indai': 'India',

  // Indonesia
  'indoensia': 'Indonesia',
  'indonesa': 'Indonesia',
  'indoneisa': 'Indonesia',

  // Iran
  'iran': 'Iran',
  'persia': 'Iran',

  // Iraq
  'irak': 'Iraq',
  'irqa': 'Iraq',

  // Israel
  'isreal': 'Israel',
  'isarel': 'Israel',
  'israeal': 'Israel',
  'israle': 'Israel',

  // Japan
  'japn': 'Japan',
  'japen': 'Japan',
  'japon': 'Japan',

  // Jordan
  'jordon': 'Jordan',
  'jorden': 'Jordan',
  'gordan': 'Jordan',

  // Kazakhstan
  'kazakstan': 'Kazakhstan',
  'kazakhastan': 'Kazakhstan',
  'kazahkstan': 'Kazakhstan',
  'kazakistan': 'Kazakhstan',

  // Kuwait
  'kuwiat': 'Kuwait',
  'kwait': 'Kuwait',
  'kuwayt': 'Kuwait',

  // Kyrgyzstan
  'kyrgistan': 'Kyrgyzstan',
  'kirgizstan': 'Kyrgyzstan',
  'kyrgzstan': 'Kyrgyzstan',
  'kirghizstan': 'Kyrgyzstan',
  'kyrgyztan': 'Kyrgyzstan',

  // Laos
  'loas': 'Laos',

  // Lebanon
  'lebannon': 'Lebanon',
  'lebanan': 'Lebanon',
  'lebenon': 'Lebanon',
  'labanon': 'Lebanon',

  // Malaysia
  'malasia': 'Malaysia',
  'malaysa': 'Malaysia',
  'malaisia': 'Malaysia',

  // Maldives
  'maldves': 'Maldives',
  'malidves': 'Maldives',
  'maldivs': 'Maldives',
  'maldivas': 'Maldives',

  // Mongolia
  'mongola': 'Mongolia',
  'mongolai': 'Mongolia',
  'mangolia': 'Mongolia',

  // Myanmar
  'myanmr': 'Myanmar',
  'mynmar': 'Myanmar',
  'burma': 'Myanmar',
  'myanamr': 'Myanmar',
  'mayanmar': 'Myanmar',

  // Nepal
  'neapl': 'Nepal',
  'napal': 'Nepal',

  // North Korea
  'northkorea': 'North Korea',
  'north corea': 'North Korea',
  'n korea': 'North Korea',
  'nkorea': 'North Korea',
  'dprk': 'North Korea',

  // Oman
  'oamn': 'Oman',

  // Pakistan
  'pakitan': 'Pakistan',
  'pakistn': 'Pakistan',
  'pakstan': 'Pakistan',
  'paksitan': 'Pakistan',

  // Palestine
  'palenstine': 'Palestine',
  'palistine': 'Palestine',
  'palastine': 'Palestine',
  'palestne': 'Palestine',

  // Philippines
  'phillipines': 'Philippines',
  'philipines': 'Philippines',
  'phillippines': 'Philippines',
  'philipinnes': 'Philippines',
  'filipines': 'Philippines',
  'phillipenes': 'Philippines',
  'philippenes': 'Philippines',

  // Qatar
  'quatar': 'Qatar',
  'qater': 'Qatar',
  'katar': 'Qatar',
  'qutar': 'Qatar',

  // Saudi Arabia
  'saudiarabia': 'Saudi Arabia',
  'saudi arbia': 'Saudi Arabia',
  'suadi arabia': 'Saudi Arabia',
  'saudi': 'Saudi Arabia',
  'saudia arabia': 'Saudi Arabia',

  // Singapore
  'singapur': 'Singapore',
  'singapour': 'Singapore',
  'sinagpore': 'Singapore',
  'singapor': 'Singapore',

  // South Korea
  'southkorea': 'South Korea',
  'south corea': 'South Korea',
  's korea': 'South Korea',
  'skorea': 'South Korea',

  // Sri Lanka
  'srilanka': 'Sri Lanka',
  'sri lanaka': 'Sri Lanka',
  'shri lanka': 'Sri Lanka',
  'ceylon': 'Sri Lanka',

  // Syria
  'seria': 'Syria',
  'siria': 'Syria',
  'sirya': 'Syria',

  // Taiwan
  'tiawan': 'Taiwan',
  'tawain': 'Taiwan',
  'tawiwan': 'Taiwan',

  // Tajikistan
  'tajakistan': 'Tajikistan',
  'tajikstan': 'Tajikistan',
  'tajikestan': 'Tajikistan',
  'tadzhikistan': 'Tajikistan',

  // Thailand
  'tailand': 'Thailand',
  'thialand': 'Thailand',
  'thiland': 'Thailand',
  'thaialnd': 'Thailand',
  'siam': 'Thailand',

  // Timor-Leste
  'timor leste': 'Timor-Leste',
  'east timor': 'Timor-Leste',
  'timorleste': 'Timor-Leste',
  'timor': 'Timor-Leste',

  // Turkey
  'turkye': 'Turkey',
  'turky': 'Turkey',
  'trukey': 'Turkey',
  'turkiye': 'Turkey',
  'türkiye': 'Turkey',

  // Turkmenistan
  'turkmensitan': 'Turkmenistan',
  'turkmenstan': 'Turkmenistan',
  'turkmanistan': 'Turkmenistan',

  // United Arab Emirates
  'uae': 'United Arab Emirates',
  'emirates': 'United Arab Emirates',
  'united arab emarites': 'United Arab Emirates',
  'united arab emrites': 'United Arab Emirates',
  'unitedarabemirates': 'United Arab Emirates',

  // Uzbekistan
  'uzbekstan': 'Uzbekistan',
  'uzbakistan': 'Uzbekistan',
  'uzbekestan': 'Uzbekistan',

  // Vietnam
  'veitnam': 'Vietnam',
  'vietname': 'Vietnam',
  'viet nam': 'Vietnam',
  'vietnm': 'Vietnam',

  // Yemen
  'yeman': 'Yemen',
  'yemn': 'Yemen',

  // ============ EUROPE ============

  // Albania
  'albaina': 'Albania',
  'alabania': 'Albania',
  'albanai': 'Albania',

  // Andorra
  'andora': 'Andorra',
  'andora': 'Andorra',

  // Austria
  'austira': 'Austria',
  'austrai': 'Austria',
  'osterreich': 'Austria',
  'österreich': 'Austria',

  // Belarus
  'bellarus': 'Belarus',
  'belaruse': 'Belarus',
  'belerus': 'Belarus',
  'belorussia': 'Belarus',

  // Belgium
  'belguim': 'Belgium',
  'belgum': 'Belgium',
  'belgiun': 'Belgium',

  // Bosnia and Herzegovina
  'bosnia': 'Bosnia and Herzegovina',
  'bosnia herzegovina': 'Bosnia and Herzegovina',
  'bosnia & herzegovina': 'Bosnia and Herzegovina',
  'bosnia and herzegvina': 'Bosnia and Herzegovina',
  'bih': 'Bosnia and Herzegovina',

  // Bulgaria
  'bulgeria': 'Bulgaria',
  'bulgarai': 'Bulgaria',
  'bulgara': 'Bulgaria',

  // Croatia
  'croata': 'Croatia',
  'croaita': 'Croatia',
  'hrvatska': 'Croatia',
  'coratia': 'Croatia',

  // Czech Republic
  'czech': 'Czech Republic',
  'czechia': 'Czech Republic',
  'chech republic': 'Czech Republic',
  'czeck republic': 'Czech Republic',
  'czech rebuplic': 'Czech Republic',

  // Denmark
  'denark': 'Denmark',
  'danmark': 'Denmark',
  'denmrk': 'Denmark',

  // Estonia
  'estona': 'Estonia',
  'estonai': 'Estonia',

  // Finland
  'finalnd': 'Finland',
  'findland': 'Finland',
  'finlad': 'Finland',
  'suomi': 'Finland',

  // France
  'frence': 'France',
  'frnace': 'France',
  'franec': 'France',

  // Germany
  'germay': 'Germany',
  'germani': 'Germany',
  'germnay': 'Germany',
  'deutschland': 'Germany',

  // Greece
  'greec': 'Greece',
  'greeece': 'Greece',
  'grece': 'Greece',
  'hellas': 'Greece',

  // Hungary
  'hungray': 'Hungary',
  'hungery': 'Hungary',
  'hugary': 'Hungary',
  'hunagry': 'Hungary',

  // Iceland
  'icelnd': 'Iceland',
  'icland': 'Iceland',
  'island': 'Iceland',

  // Ireland
  'irland': 'Ireland',
  'ireleand': 'Ireland',
  'irealnd': 'Ireland',
  'eire': 'Ireland',

  // Italy
  'itlay': 'Italy',
  'itally': 'Italy',
  'italty': 'Italy',
  'italia': 'Italy',

  // Kosovo
  'kossovo': 'Kosovo',
  'kosova': 'Kosovo',

  // Latvia
  'latva': 'Latvia',
  'latavia': 'Latvia',
  'latviia': 'Latvia',

  // Liechtenstein
  'lichenstein': 'Liechtenstein',
  'lichtenstein': 'Liechtenstein',
  'leichtenstein': 'Liechtenstein',
  'liechenstein': 'Liechtenstein',

  // Lithuania
  'lithunia': 'Lithuania',
  'lithuaina': 'Lithuania',
  'lithunaia': 'Lithuania',
  'litvania': 'Lithuania',

  // Luxembourg
  'luxemburg': 'Luxembourg',
  'luxemborg': 'Luxembourg',
  'luxemberg': 'Luxembourg',
  'luxembourge': 'Luxembourg',

  // Malta
  'malt': 'Malta',

  // Moldova
  'moldava': 'Moldova',
  'moldovia': 'Moldova',
  'moldolva': 'Moldova',

  // Monaco
  'monoco': 'Monaco',
  'monacco': 'Monaco',

  // Montenegro
  'montengro': 'Montenegro',
  'montenego': 'Montenegro',
  'monte negro': 'Montenegro',
  'montanegro': 'Montenegro',

  // Netherlands
  'netherland': 'Netherlands',
  'netherlnds': 'Netherlands',
  'the netherlands': 'Netherlands',
  'holland': 'Netherlands',
  'neatherlands': 'Netherlands',
  'nethrelands': 'Netherlands',

  // North Macedonia
  'north macadonia': 'North Macedonia',
  'northmacedonia': 'North Macedonia',
  'macedonia': 'North Macedonia',
  'n macedonia': 'North Macedonia',
  'north macedona': 'North Macedonia',
  'north macidonia': 'North Macedonia',

  // Norway
  'norwy': 'Norway',
  'norwya': 'Norway',
  'norge': 'Norway',

  // Poland
  'polland': 'Poland',
  'poalnd': 'Poland',
  'polski': 'Poland',
  'polska': 'Poland',

  // Portugal
  'portugl': 'Portugal',
  'portigal': 'Portugal',
  'portugual': 'Portugal',
  'portugul': 'Portugal',

  // Romania
  'romaina': 'Romania',
  'rumania': 'Romania',
  'romanai': 'Romania',
  'roumania': 'Romania',

  // Russia
  'rusia': 'Russia',
  'russa': 'Russia',
  'russha': 'Russia',

  // San Marino
  'sanmarino': 'San Marino',
  'san mareno': 'San Marino',
  'san merino': 'San Marino',

  // Serbia
  'serba': 'Serbia',
  'serbai': 'Serbia',

  // Slovakia
  'slovkia': 'Slovakia',
  'slovakai': 'Slovakia',
  'slovaka': 'Slovakia',

  // Slovenia
  'slovena': 'Slovenia',
  'slovenai': 'Slovenia',
  'slovinia': 'Slovenia',

  // Spain
  'spian': 'Spain',
  'spain': 'Spain',
  'espana': 'Spain',
  'españa': 'Spain',

  // Sweden
  'sweeden': 'Sweden',
  'sewden': 'Sweden',
  'sveden': 'Sweden',
  'sverige': 'Sweden',

  // Switzerland
  'switerland': 'Switzerland',
  'switzeland': 'Switzerland',
  'switzerladn': 'Switzerland',
  'swizerland': 'Switzerland',
  'swtizerland': 'Switzerland',

  // Ukraine
  'ukarine': 'Ukraine',
  'ukrane': 'Ukraine',
  'ukranie': 'Ukraine',
  'ukriane': 'Ukraine',

  // United Kingdom
  'uk': 'United Kingdom',
  'unitedkingdom': 'United Kingdom',
  'united kingdon': 'United Kingdom',
  'britian': 'United Kingdom',
  'great britain': 'United Kingdom',
  'great britian': 'United Kingdom',
  'britain': 'United Kingdom',
  'england': 'United Kingdom',

  // Vatican City
  'vatican': 'Vatican City',
  'vaticancity': 'Vatican City',
  'the vatican': 'Vatican City',
  'holy see': 'Vatican City',

  // ============ AMERICAS ============

  // Antigua and Barbuda
  'antigua': 'Antigua and Barbuda',
  'antigua & barbuda': 'Antigua and Barbuda',
  'antigua and barbda': 'Antigua and Barbuda',
  'antigua and barbdua': 'Antigua and Barbuda',

  // Argentina
  'argentna': 'Argentina',
  'argentia': 'Argentina',
  'argentian': 'Argentina',

  // Bahamas
  'bahammas': 'Bahamas',
  'the bahamas': 'Bahamas',
  'baahmas': 'Bahamas',

  // Barbados
  'barbadoes': 'Barbados',
  'barbads': 'Barbados',

  // Belize
  'beliz': 'Belize',
  'beleze': 'Belize',

  // Bolivia
  'bolvia': 'Bolivia',
  'boliva': 'Bolivia',
  'bolivai': 'Bolivia',

  // Brazil
  'brasil': 'Brazil',
  'brazl': 'Brazil',
  'braizl': 'Brazil',
  'brzail': 'Brazil',

  // Canada
  'cananda': 'Canada',
  'canida': 'Canada',
  'canda': 'Canada',

  // Chile
  'chille': 'Chile',
  'chili': 'Chile',

  // Colombia
  'columbia': 'Colombia',
  'colmbia': 'Colombia',
  'columba': 'Colombia',
  'coloumbia': 'Colombia',

  // Costa Rica
  'costarica': 'Costa Rica',
  'costa rica': 'Costa Rica',
  'coasta rica': 'Costa Rica',

  // Cuba
  'cuab': 'Cuba',
  'quba': 'Cuba',

  // Dominica
  'dominika': 'Dominica',

  // Dominican Republic
  'dominican rep': 'Dominican Republic',
  'dominicanrepublic': 'Dominican Republic',
  'domincan republic': 'Dominican Republic',
  'dominican replublic': 'Dominican Republic',
  'dr': 'Dominican Republic',

  // Ecuador
  'equador': 'Ecuador',
  'ecaudor': 'Ecuador',
  'ecuadore': 'Ecuador',

  // El Salvador
  'elsalvador': 'El Salvador',
  'el slavador': 'El Salvador',
  'el salvadore': 'El Salvador',
  'salvador': 'El Salvador',

  // Grenada
  'greneda': 'Grenada',
  'granada': 'Grenada',
  'grenda': 'Grenada',

  // Guatemala
  'guatamala': 'Guatemala',
  'guatmala': 'Guatemala',
  'guatamela': 'Guatemala',
  'guatemla': 'Guatemala',

  // Guyana
  'guayana': 'Guyana',
  'guyna': 'Guyana',

  // Haiti
  'hati': 'Haiti',
  'hatii': 'Haiti',
  'hayti': 'Haiti',

  // Honduras
  'hondurus': 'Honduras',
  'honudras': 'Honduras',
  'hondras': 'Honduras',

  // Jamaica
  'jamica': 'Jamaica',
  'jamaca': 'Jamaica',
  'jamacia': 'Jamaica',
  'jamaika': 'Jamaica',

  // Mexico
  'mexcio': 'Mexico',
  'mexco': 'Mexico',
  'mejico': 'Mexico',
  'méxico': 'Mexico',

  // Nicaragua
  'nicarauga': 'Nicaragua',
  'nicuragua': 'Nicaragua',
  'nicargua': 'Nicaragua',

  // Panama
  'panma': 'Panama',
  'panamá': 'Panama',
  'panaam': 'Panama',

  // Paraguay
  'paraguy': 'Paraguay',
  'paraguya': 'Paraguay',
  'paraguai': 'Paraguay',
  'parguay': 'Paraguay',

  // Peru
  'perú': 'Peru',

  // Saint Kitts and Nevis
  'st kitts and nevis': 'Saint Kitts and Nevis',
  'st kitts & nevis': 'Saint Kitts and Nevis',
  'saint kitts': 'Saint Kitts and Nevis',
  'st kitts': 'Saint Kitts and Nevis',
  'saint kitts & nevis': 'Saint Kitts and Nevis',

  // Saint Lucia
  'st lucia': 'Saint Lucia',
  'saint luica': 'Saint Lucia',
  'st. lucia': 'Saint Lucia',

  // Saint Vincent and the Grenadines
  'st vincent': 'Saint Vincent and the Grenadines',
  'saint vincent': 'Saint Vincent and the Grenadines',
  'st vincent and the grenadines': 'Saint Vincent and the Grenadines',
  'saint vincent & the grenadines': 'Saint Vincent and the Grenadines',
  'svg': 'Saint Vincent and the Grenadines',

  // Suriname
  'surinam': 'Suriname',
  'suirname': 'Suriname',
  'suraname': 'Suriname',

  // Trinidad and Tobago
  'trinidad': 'Trinidad and Tobago',
  'trinidad & tobago': 'Trinidad and Tobago',
  'trinidad and tobgo': 'Trinidad and Tobago',
  'trinidadandtobago': 'Trinidad and Tobago',

  // United States
  'usa': 'United States',
  'us': 'United States',
  'united states of america': 'United States',
  'unitedstates': 'United States',
  'unites states': 'United States',
  'untied states': 'United States',
  'america': 'United States',

  // Uruguay
  'urugauy': 'Uruguay',
  'uruaguay': 'Uruguay',
  'urguay': 'Uruguay',
  'uruguai': 'Uruguay',

  // Venezuela
  'venezula': 'Venezuela',
  'venuzuela': 'Venezuela',
  'venezeula': 'Venezuela',
  'venuzela': 'Venezuela',

  // ============ OCEANIA ============

  // Australia
  'austraila': 'Australia',
  'australa': 'Australia',
  'austrlia': 'Australia',
  'austrialia': 'Australia',
  'asutralia': 'Australia',

  // Fiji
  'feji': 'Fiji',
  'fijii': 'Fiji',

  // Kiribati
  'kribati': 'Kiribati',
  'kirabati': 'Kiribati',
  'kirbati': 'Kiribati',

  // Marshall Islands
  'marshallislands': 'Marshall Islands',
  'marshal islands': 'Marshall Islands',
  'marshall ilands': 'Marshall Islands',

  // Micronesia
  'micronesa': 'Micronesia',
  'micronisia': 'Micronesia',
  'microneisa': 'Micronesia',

  // Nauru
  'naru': 'Nauru',
  'nauruu': 'Nauru',

  // New Zealand
  'newzealand': 'New Zealand',
  'new zeeland': 'New Zealand',
  'new zeland': 'New Zealand',
  'nz': 'New Zealand',
  'new zealnd': 'New Zealand',

  // Palau
  'palu': 'Palau',
  'pallau': 'Palau',

  // Papua New Guinea
  'papuanewguinea': 'Papua New Guinea',
  'papua new guniea': 'Papua New Guinea',
  'png': 'Papua New Guinea',
  'papua': 'Papua New Guinea',
  'papau new guinea': 'Papua New Guinea',

  // Samoa
  'samao': 'Samoa',
  'somoa': 'Samoa',

  // Solomon Islands
  'solomonislands': 'Solomon Islands',
  'soloman islands': 'Solomon Islands',
  'solomon ilands': 'Solomon Islands',

  // Tonga
  'tonag': 'Tonga',
  'tongaa': 'Tonga',

  // Tuvalu
  'tuvlau': 'Tuvalu',
  'tuavlu': 'Tuvalu',

  // Vanuatu
  'vanautu': 'Vanuatu',
  'vanutu': 'Vanuatu',
  'vanatu': 'Vanuatu',
};
