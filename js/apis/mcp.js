import {validateAndCallbackify} from "./../utils";
import {validateScheme} from "../validation/custom-validations";
import {custFetch} from "../interceptor";
import {motoCardValidationSchema, motoCardApiFunc} from "./cards";
import {MCPData} from "./payment-details";
import cloneDeep from "lodash/cloneDeep";
import {currencyMap} from "../constants";

const MCPCardSchema = cloneDeep(motoCardValidationSchema);

const countryCurrencyMap =  currencyMap;

//MCPCardSchema.mainObjectCheck.keysCheck.push('targetMcpCurrency');

const makeMCPCardPayment = validateAndCallbackify(MCPCardSchema, (confObj) => {
    MCPData.MCPWrapperAPIData.mcpConversionBeans.some((el) => {
        if(el.targetCurrency === confObj.targetMcpCurrency){
            confObj.currencyToken = el.token;
            return true;
        }
    });
    return motoCardApiFunc(confObj);
});

const binServiceSchema = {
    cardNumber: {presence: true}
};

const getCardCurrencyInfo = validateAndCallbackify(binServiceSchema, (confObj) => {
    const sixDigitCardNum = ''+confObj.cardNumber.substr(0,6);
    return custFetch(`https://bin.citruspay.com/binservice/v1/bin/${sixDigitCardNum}`, {
        method: 'get'
    }).then((resp)=>{
        let aliasedScheme;
        if(resp.data.cardscheme){
            aliasedScheme = validateScheme(resp.data.cardscheme);
            if(!aliasedScheme){
                throw 'scheme mapping not found!';
            }
        }else{
            throw 'Not valid card!'
        }
        let cardCurrency;
        resp.data.currency_code ? cardCurrency = resp.data.currency_code : cardCurrency = "";

        if(MCPData.calculatedMCPSchemes.indexOf(aliasedScheme) > -1){
            if (cardCurrency === MCPData.baseCurrency) {
                return [];
            } else if (!cardCurrency) {
                return MCPData.MCPWrapperAPIData.mcpConversionBeans.map((el)=> {
                    return {
                        currency: el.targetCurrency,
                        amount: el.amount
                    }
                });
            }else{
                return MCPData.MCPWrapperAPIData.mcpConversionBeans.map((el)=>{
                    return {
                        currency: el.targetCurrency,
                        amount: el.amount
                    }
                });
            }
        }else{
            return [];
        }
    });
});
export {makeMCPCardPayment, getCardCurrencyInfo};