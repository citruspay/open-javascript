import {custFetch} from "../interceptor";
import {getConfig} from "../config";
import {setAppData,getAppData} from "./../utils";

const MAX_CACHE_LENGTH = 10;
//cache timeout in milliseconds 6minutes
const CACHE_TIMEOUT = 300000;

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
export {dynamicPricingFunction,getDpTokenFromAppData};