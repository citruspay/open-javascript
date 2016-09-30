const CREDIT_CARD_GENERATOR_URL = 'http://localhost/cards.php'
const getConfigValue = (key) =>{
    "use strict";
    return CREDIT_CARD_GENERATOR_URL;
}
const validHostedFieldTypes = ["cvv","expiry","number"];
const validCardTypes = ["credit", "debit", "card"];
export {getConfigValue,validHostedFieldTypes,validCardTypes};