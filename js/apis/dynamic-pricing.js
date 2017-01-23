import {custFetch} from "../interceptor";
import {getConfig} from "../config";
import {setAppData, validateAndCallbackify, schemeFromNumber} from "./../utils";

const baseDynamicPricingSchema = {
    email: { presence : false, email : true },
    phone : {presence:false},
    originalAmount: { presence : true },
    currency: { presence : true },
    signature : { presence : true }/*this is DPSignature*/
};

const dynamicPricingFunction = (confObj) => {
    let dpAction;
    if (!confObj.ruleName && !confObj.alteredAmount.value) {
        dpAction = '/searchAndApplyRuleForPayment';
    }
    else if (!confObj.alteredAmount.value) {
        dpAction = '/calculatePricingForPayment';
    }
    else {
        dpAction = '/validateRuleForPayment';
    }
    setAppData(confObj.paymentInfo.paymentMode.toLowerCase(), {'offerToken': ''});
    return custFetch(`${getConfig().dpApiUrl}${dpAction}`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(confObj)
    }).then(function (resp) {
        if (resp.data.offerToken) {
            let dpOfferToken = resp.data.offerToken;
            setAppData(confObj.paymentInfo.paymentMode.toLowerCase(), { 'offerToken' : dpOfferToken });
        }
        return resp.data;
    });
     /*if (confObj.ruleName && confObj.alteredAmount.value) {
        dpAction = '/validateRuleForPayment';//it doesn't validate the altered amount is valid for the rule or not,if the signature matches , returns the same altered amount back as it is?
    }
    else if (confObj.ruleName) {
        dpAction = '/calculatePricingForPayment';//gives the right altered amount back, if not passed, need to check what happens if wrong altered amount is passed, but does not fail.
    }
    else if(!confObj.alteredAmount.value) {
        dpAction = '/searchAndApplyRuleForPayment';//gives the right altered amount back, even if passed wrong, work only for transaction above 100
    }
    else{
        let invalidCombinationErrorMessage = "For applying dynamic pricing, 1.pass either both ruleName & alteredAmount.value to validate the rule or 2.only ruleName without "+
        "alteredAmount.value to calculate alteredAmount.value or 3.pass neither alteredAmount.value nor ruleName to search and apply the best "+
        "rule ";
        throw new Error(invalidCombinationErrorMessage);
    }*/
    /* if(confObj.ruleName && confObj.alteredAmount.value)// /validateRuleForPayment
    else if confObj.ruleName /calculatePricingForPayment
    else /searchAndApplyRuleForPayment */

};

const applyDynamicPricing = (isWallet, dynamicPricingSchema) => {
  return  validateAndCallbackify(dynamicPricingSchema,(data)=>{
 const reqConf = Object.assign({}, data, {
        originalAmount: {
            value: data.originalAmount, currency : data.currency
        },
        alteredAmount : {
            value: data.alteredAmount, currency : data.currency
        },
        paymentInfo : {
            cardNo : data.cardNo,
            issuerId : data.bankCode,
            paymentMode : data.paymentMode,
            paymentToken : isWallet?data.token:data.paymentToken
        },
        extraParams : {
            deviceType : `${getConfig().deviceType}`
        }
    });
    if(data.cardNo)
        reqConf.paymentInfo.cardType = schemeFromNumber(data.cardNo);
    delete reqConf.token;
    delete reqConf.cardNo;
    delete reqConf.currency;
    delete reqConf.paymentMode;
    delete reqConf.bankCode;
    return dynamicPricingFunction(reqConf);
});
};

export {dynamicPricingFunction,applyDynamicPricing,baseDynamicPricingSchema};