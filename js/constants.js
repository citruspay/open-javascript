

const urlReEx =  /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/;
const currencyMap = {
    'India' : 'INR', 'American Samoa' : 'USD', 'British Indian Ocean Territory' : 'USD', 'Ecuador' : 'USD', 'El Salvador' : 'USD',
    'Guam' : 'USD', 'Marshall Islands' : 'USD', 'Micronesia' : 'USD', 'Northern Mariana Islands' : 'USD', 'Palau' : 'USD',
    'Panama' : 'USD', 'Puerto Rico' : 'USD', 'Timor-Leste' : 'USD', 'Turks and Caicos Islands' : 'USD', 'United States of America' : 'USD',
    'Virgin Islands, U.S.' : 'USD', 'Zimbabwe' : 'USD', 'Virgin Islands, British' : 'USD', 'Ã…land Islands' : 'EUR',
    'Andorra' : 'EUR', 'Austria' : 'EUR', 'Belgium' : 'EUR', 'Cyprus' : 'EUR', 'Estonia' : 'EUR', 'Finland' : 'EUR',
    'France' : 'EUR', 'French Guiana' : 'EUR', 'Germany' : 'EUR', 'Greece' : 'EUR', 'Guadeloupe' : 'EUR', 'Ireland' : 'EUR',
    'Italy' : 'EUR', 'Latvia' : 'EUR', 'Lithuania' : 'EUR', 'Luxembourg' : 'EUR', 'Malta' : 'EUR', 'Martinique' : 'EUR',
    'Mayotte' : 'EUR', 'Monaco' : 'EUR', 'Montenegro' : 'EUR', 'Netherlands' : 'EUR', 'Portugal' : 'EUR', 'Saint BarthÃ©lemy' : 'EUR',
    'Saint Martin (French part)' : 'EUR', 'Saint Pierre and Miquelon' : 'EUR', 'San Marino' : 'EUR',
    'Slovakia' : 'EUR', 'Slovenia' : 'EUR', 'Spain' : 'EUR', 'Holy See (Vatican City State)' : 'EUR',
    'Japan' : 'JPY', 'United Kingdom' : 'GBP', 'Liechtenstein' : 'CHF', 'Switzerland' : 'CHF', 'Sweden' : 'SEK',
    'Greenland' : 'DKK', 'Denmark' : 'DKK', 'Norway' : 'NOK', 'Svalbard and Jan Mayen' : 'NOK', 'Singapore' : 'SGD',
    'Australia' : 'AUD', 'Christmas Island' : 'AUD', 'Cocos (Keeling) Islands' : 'AUD', 'Kiribati' : 'AUD', 'Nauru' : 'AUD',
    'Norfolk Island' : 'AUD', 'Tuvalu' : 'AUD', 'Canada' : 'CAD', 'United Arab Emirates' : 'AED', 'Hong Kong' : 'HKD',
    'Qatar' : 'QAR', 'Saudi Arabia' : 'SAR', 'Oman' : 'OMR', 'South Africa' : 'ZAR', 'Malaysia' : 'MYR', 'Kuwait' : 'KWD',
    'Mauritius' : 'MUR', 'Sri Lanka' : 'LKR', 'Kenya' : 'KES', 'Philippines' : 'PHP', 'New Zealand' : 'NZD', 'Niue' : 'NZD',
    'Pitcairn' : 'NZD', 'Tokelau' : 'NZD', 'Thailand' : 'THB', 'Bangladesh' : 'BDT', 'China' : 'CNY', 'Nepal' : 'NPR', 'Bahrain' : 'BHD',
};

export {urlReEx, currencyMap}