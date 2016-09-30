const HOSTED_FIELD_DOMAIN = 'http://localhost:8080'
const CREDIT_CARD_GENERATOR_URL =  HOSTED_FIELD_DOMAIN + '/cards.php';
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
const validCardTypes = ["credit", "debit", "card"];
export {getConfigValue,validHostedFieldTypes,validCardTypes};