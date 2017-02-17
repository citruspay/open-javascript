import {custFetch} from '../interceptor';
import {getConfig} from '../config';
import {setAppData,getAppData} from "./../utils";
import {validateAndCallbackify, schemeFromNumber} from './../utils';


const MAX_CACHE_LENGTH = 10;
//cache timeout in milliseconds 6minutes
const CACHE_TIMEOUT = 300000;

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
    //setAppData(confObj.paymentInfo.paymentMode.toLowerCase(), {'offerToken': ''});
    let dpRepsonse = getDpResponseFromAppData(confObj.paymentInfo,dpAction);
    if(dpRepsonse)
        return Promise.resolve(dpRepsonse);
    return custFetch(`${getConfig().dpApiUrl}${dpAction}`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(confObj)
    }).then(function (resp) {
        if (resp.data.offerToken) {
            //let dpOfferToken = resp.data.offerToken;
            //setAppData(confObj.paymentInfo.paymentMode.toLowerCase(), { 'offerToken' : dpOfferToken });
            setDpResponseInAppData(confObj.paymentInfo,dpAction,resp.data);
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

const applyDynamicPricing = (isWallet,dynamicPricingSchema)=>{ 
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

const getDpResponseFromAppData=(paymentInfo,dpAction)=>{
    var dpRepsonseList = getAppData('dpRepsonseList');
    let key = getCacheKey(paymentInfo);
    let paymentMode = paymentInfo.paymentMode.toLowerCase();
    let timeStamp = new Date().getTime();
    if(dpRepsonseList && dpRepsonseList.length>0){
        var dpOfferToken = dpRepsonseList.filter((value)=>{return value.key===key && value.dpAction===dpAction && value.paymentMode===paymentMode;});
        if(dpOfferToken && dpOfferToken.length>0)
        {
            if(timeStamp-dpOfferToken[0].timeStamp<=CACHE_TIMEOUT)
                return dpOfferToken[0].value;
            else{
                removeDpToken(dpOfferToken[0]);
            }
        }
    }
};
const removeDpToken=(dpCachedResponse)=>{
    var dpRepsonseList = getAppData('dpRepsonseList');
     if(dpRepsonseList && dpRepsonseList.length>0){
         var dpTokenIndex = dpRepsonseList.indexOf(dpCachedResponse);
         if(dpTokenIndex!==-1)
            dpRepsonseList.splice(dpTokenIndex,1);
     }
};

const getDpTokenFromAppData = (paymentInfo)=>{
    let key = getCacheKey(paymentInfo);
    var dpRepsonseList = getAppData('dpRepsonseList');
    if(dpRepsonseList&&dpRepsonseList.length>0){
         var dpResponse = dpRepsonseList.filter((value)=>{return value.key===key;});
        if(dpResponse && dpResponse.length>0)
        {
            return dpResponse[0].value.offerToken;
        } 
    }
}

const addDpTokenFromCacheIfNotPresent=(paymentData,paymentInfo)=>{
    let offerToken;
    if(!paymentData.offerToken){
        offerToken = getDpTokenFromAppData(paymentInfo);
        if(offerToken)
        paymentData.offerToken = offerToken;
    }
    return paymentData;
}

const getCacheKey=(paymentInfo)=>{ 
    let key;
    if(paymentInfo.cardNo){
        key = paymentInfo.cardNo;
    }else if(paymentInfo.issuerId){
        key = paymentInfo.issuerId;
    }else if(paymentInfo.paymentToken){
        key = paymentInfo.paymentToken;
    }
    return key;
};

const setDpResponseInAppData=(paymentInfo,dpAction,dpResponse)=>{
    var dpRepsonseList = getAppData('dpRepsonseList')||[];
    let key = getCacheKey(paymentInfo);
    let paymentMode = paymentInfo.paymentMode.toLowerCase();
    let timeStamp = new Date().getTime();
    if(dpRepsonseList.length>MAX_CACHE_LENGTH)
        dpRepsonseList.splice(0);
    var dpOfferToken = dpRepsonseList.filter((value)=>{return value.key===key;});
    if(dpOfferToken && dpOfferToken.length>0)
        removeDpToken(dpOfferToken[0]);
    dpRepsonseList.push({key:key,value:dpResponse,dpAction:dpAction,timeStamp:timeStamp,paymentMode:paymentMode});
    setAppData('dpRepsonseList',dpRepsonseList);
};

export {dynamicPricingFunction,applyDynamicPricing,baseDynamicPricingSchema,addDpTokenFromCacheIfNotPresent};
