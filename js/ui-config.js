const CREDIT_CARD_GENERATOR_URL = 'https://icp.citruspay.com/cards.php'
const getConfigValue = (key) =>{
    "use strict";
    return CREDIT_CARD_GENERATOR_URL;
}
const validHostedFieldTypes = ["cvv","expiry","number"];
export {getConfigValue,validHostedFieldTypes};