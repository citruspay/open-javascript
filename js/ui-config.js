const HOSTED_FIELD_DOMAIN = 'http://localhost'
const CREDIT_CARD_GENERATOR_URL =  HOSTED_FIELD_DOMAIN + '/cards.html';
const getConfigValue = (key) =>{
    "use strict";
    switch(key){
        case 'hostedFieldDomain':
            return HOSTED_FIELD_DOMAIN;
        case 'hostedFieldUrl':
            return CREDIT_CARD_GENERATOR_URL;
    }
}
const validHostedFieldTypes = ["cvv","expiry","number"];
const validPaymentTypes = ["credit","debit"];
const validCardSetupTypes = validPaymentTypes.concat(["card"]);
export {getConfigValue,validHostedFieldTypes,validCardSetupTypes,validPaymentTypes};