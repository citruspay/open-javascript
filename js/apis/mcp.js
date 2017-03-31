import {validateAndCallbackify, schemeFromNumber} from "./../utils";
import {validateScheme} from "../validation/custom-validations";
import {custFetch} from "../interceptor";
import {motoCardValidationSchema, motoCardApiFunc} from "./cards";
import {MCPData} from "./payment-details";
import cloneDeep from "lodash/cloneDeep";
import {setAppData,getAppData} from "./../utils";

const MAX_CACHE_LENGTH = 10;
//cache timeout in milliseconds 6minutes
const CACHE_TIMEOUT = 300000;

const MCPCardSchema = cloneDeep(motoCardValidationSchema);

let mcpData = cloneDeep(MCPData);

const makeMCPCardPaymentWrapper = (data) => {
    mcpData = getAppData('mcpData');
    return makeMCPCardPayment(data);
};

const makeMCPCardPayment = validateAndCallbackify(MCPCardSchema, (confObj) => {
    mcpData.MCPWrapperAPIData.mcpConversionBeans.some((el) => {
        if (el.targetCurrency === confObj.targetMcpCurrency) {
            confObj.currencyToken = el.token;
            return true;
        }
    });
    return motoCardApiFunc(confObj);
});

const binServiceSchema = {
    cardNumber: {presence: true}
};

const getCardCurrencyWrapper = (data) => {
    console.log(data);
    mcpData = data.MCPData;
    setAppData('mcpData',mcpData.mcpWrapperApiData);
    return getCardCurrencyInfo(data);
};

const getCardCurrencyInfo = validateAndCallbackify(binServiceSchema, (confObj) => {
    const sixDigitCardNum = '' + confObj.cardNumber.substr(0, 6);
    let aliasedScheme = validateScheme(schemeFromNumber(confObj.cardNumber), false);
    let binResponse = getBinResponseFromAppData(confObj.cardNumber);
    if(binResponse)
        return Promise.resolve(binResponse.currencyData);
    return custFetch(`https://bin.citruspay.com/binservice/v1/bin/${sixDigitCardNum}`, {
        method: 'get'
    }).then((resp)=> {
        // setBinResponseInAppData(confObj,resp.data);
        const currencyData = processBinData(resp, aliasedScheme);
        console.log(currencyData);
        setBinResponseInAppData(confObj, resp.data, currencyData);
        return currencyData;
    });
});

const processBinData = (resp, aliasedScheme) => {
    if (resp.data.cardscheme) {
        aliasedScheme = validateScheme(resp.data.cardscheme, false);
        if (!aliasedScheme) {
            throw 'scheme mapping not found!';
        }
    } else if (!aliasedScheme) {
        throw 'Not valid card!'
    }
    let cardCurrency;
    resp.data.currency_code ? cardCurrency = resp.data.currency_code : cardCurrency = "";
    //if (getConfig(''))
    if (mcpData.mcpWrapperApiData.calculatedMCPSchemes.indexOf(aliasedScheme) > -1) {
        //for Indian cards
        if (cardCurrency === mcpData.baseCurrency) {
            return [];
        } else if (!cardCurrency) { //In case records are not found in Bin database then return all the currencies
            return mcpData.mcpWrapperApiData.MCPWrapperAPIData.mcpConversionBeans.map((el)=> {
                return {
                    currency: el.targetCurrency,
                    amount: el.amount,
                    token: el.token
                }
            });
        }
        let mcpCurrency = [];
        mcpData.mcpWrapperApiData.MCPWrapperAPIData.mcpConversionBeans.some((el)=> {
            if (cardCurrency === el.targetCurrency) {
                mcpCurrency = [{currency: el.targetCurrency, amount: el.amount, token: el.token}];
                return true;
            }
        });
        return mcpCurrency;
    } else {
        return [];
    }
};
const setBinResponseInAppData = (cardInfo, binResponse, currencyData)=>{
    var binResponseList = getAppData('binResponseList')||[];
    let timeStamp = new Date().getTime();
    let key = cardInfo.cardNumber;
    let paymentMode = cardInfo.cardType;
    binResponseList.push({key : key,value:binResponse,timeStamp:timeStamp,paymentMode:paymentMode,currencyData:currencyData});
    if(binResponseList.length>MAX_CACHE_LENGTH)
        binResponseList.splice(0);
    setAppData('binResponseList', binResponseList);
};

const removeMcpToken=(mcpCachedResponse)=>{
    var binResponseList = getAppData('binResponseList');
    if(binResponseList && binResponseList.length>0){
        var mcpTokenIndex = binResponseList.indexOf(mcpCachedResponse);
        if(mcpTokenIndex!==-1)
            binResponseList.splice(mcpTokenIndex,1);
    }
};
const getBinResponseFromAppData = (key)=>{
   // let key = cardInfo.cardNumber;
    var binResponseList = getAppData('binResponseList');
    let timeStamp = new Date().getTime();
    if(binResponseList&&binResponseList.length>0){
        var binResponse = binResponseList.filter((value)=>{return value.key===key});
        if(binResponse && binResponse.length>0)
        {
            if(timeStamp-mcpToken[0].timeStamp<=CACHE_TIMEOUT)
                return binResponse[0].value;
            else{
                removeMcpToken(binResponse[0]);
            }
        }
    }
};
export {makeMCPCardPayment, getCardCurrencyInfo, getCardCurrencyWrapper, makeMCPCardPaymentWrapper};