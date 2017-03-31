import {validateAndCallbackify, schemeFromNumber} from "./../utils";
import {validateScheme} from "../validation/custom-validations";
import {custFetch} from "../interceptor";
import {motoCardValidationSchema, motoCardApiFunc} from "./cards";
import {MCPData} from "./payment-details";
import cloneDeep from "lodash/cloneDeep";
import {setAppData,getAppData} from "./../utils";
//import {currencyMap} from "../constants";

const MCPCardSchema = cloneDeep(motoCardValidationSchema);

//const countryCurrencyMap = currencyMap;

//MCPCardSchema.mainObjectCheck.keysCheck.push('targetMcpCurrency');

const makeMCPCardPayment = validateAndCallbackify(MCPCardSchema, (confObj) => {
    MCPData.MCPWrapperAPIData.mcpConversionBeans.some((el) => {
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

let mcpData = cloneDeep(MCPData);

const getCardCurrencyWrapper = (data) => {
    console.log(data);
    mcpData = data.MCPData;
    const logger = getCardCurrencyInfo(data);

    console.log(logger);
    return logger;
};

const getCardCurrencyInfo = validateAndCallbackify(binServiceSchema, (confObj) => {
    const sixDigitCardNum = '' + confObj.cardNumber.substr(0, 6);
    let aliasedScheme = validateScheme(schemeFromNumber(confObj.cardNumber), false);
    let binResponse = getBinResponseFromAppData(confObj);
    if(binResponse)
        return Promise.resolve(binRepsonse);
    return custFetch(`https://bin.citruspay.com/binservice/v1/bin/${sixDigitCardNum}`, {
        method: 'get'
    }).then((resp)=> {
        // setBinResponseInAppData(confObj,resp.data);
        const currencyData = processBinData(resp, aliasedScheme);
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

    if (mcpData.mcpWrapperApiData.calculatedMCPSchemes.indexOf(aliasedScheme) > -1) {
        //for Indian cards
        if (cardCurrency === mcpData.baseCurrency) {
            return [];
        } else if (!cardCurrency) { //In case records are not found in Bin database then return all the currencies
            return mcpData.mcpWrapperApiData.MCPWrapperAPIData.mcpConversionBeans.map((el)=> {
                return {
                    currency: el.targetCurrency,
                    amount: el.amount
                }
            });
        }
        let mcpCurrency = [];
        mcpData.mcpWrapperApiData.MCPWrapperAPIData.mcpConversionBeans.some((el)=> {
            if (cardCurrency === el.targetCurrency) {
                mcpCurrency = [{currency: el.targetCurrency, amount: el.amount}];
                return true;
            }
        });
        return mcpCurrency;
    } else {
        return [];
    }
};
const setBinResponseInAppData = (cardInfo, binResponse, currency)=>{
    var binResponseList = getAppData('binResponseList')||[];
    let timeStamp = new Date().getTime();
    let key = cardInfo.cardNumber;
    let paymentMode = cardInfo.cardType;
    binResponseList.push({key : key,value:binResponse,timeStamp:timeStamp,paymentMode:paymentMode});
    setAppData('binResponseList', binResponseList);
};
const getBinResponseFromAppData = (cardInfo)=>{
    let key = cardInfo.cardNumber;
    var binResponseList = getAppData('binResponseList');
    if(binResponseList&&binResponseList.length>0){
        var binResponse = binResponseList.filter((value)=>{return value.key===key;});
        if(binResponse && binResponse.length>0)
        {
            return binResponse[0].value;
        }
    }
};
export {makeMCPCardPayment, getCardCurrencyInfo, getCardCurrencyWrapper};