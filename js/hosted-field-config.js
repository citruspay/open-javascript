const HOSTED_FIELD_DOMAIN = 'http://localhost';//'https://mocha.citruspay.com';
const CREDIT_CARD_GENERATOR_URL = HOSTED_FIELD_DOMAIN + '/cards.html';

const getConfigValue = (key) =>{
    "use strict";
    switch(key){
        case 'hostedFieldDomain':
            return HOSTED_FIELD_DOMAIN;
        case 'hostedFieldUrl':
            return CREDIT_CARD_GENERATOR_URL;
    }
};
const validHostedFieldTypes = ["cvv","expiry","number"];
const validPaymentTypes = ["credit","debit"];
const validCardSetupTypes = validPaymentTypes.concat(["card","savedCard"]);
const supportedStyleKeys = [
    "color","font-family","font-size-adjust","font-size","font-stretch","font-style", 
    "font-variant-alternates","font-variant-caps","font-variant-east-asian","font-variant-ligatures",
    "font-variant-numeric","font-variant","font-weight","font","line-height","opacity",
    "outline text-shadow","transition","-moz-osx-font-smoothing","-moz-tap-highlight-color",
    "-moz-transition","-webkit-font-smoothing","-webkit-tap-highlight-color","-webkit-transition"
];
const specialStyleKeys = [':focus','.valid','.invalid','.valid:focus','.invalid:focus'
,'::-webkit-input-placeholder',':-moz-placeholder',':-ms-input-placeholder','::-moz-placeholder'];
export {getConfigValue,validHostedFieldTypes,validCardSetupTypes,validPaymentTypes,supportedStyleKeys,specialStyleKeys};
