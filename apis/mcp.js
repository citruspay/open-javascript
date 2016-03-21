import {validateAndCallbackify, getMerchantAccessKey} from './../utils';
import {getConfig} from '../config';
import {validateCardType, validateScheme} from '../validation/custom-validations';
import {custFetch} from '../interceptor';
import {motoCardValidationSchema, motoCardApiFunc} from './cards';
import {MCPData, pgSettingsData} from './payment-details';
import cloneDeep from 'lodash/cloneDeep';
import {currencyMap} from '../constants';

const MCPCardSchema = cloneDeep(motoCardValidationSchema);

const countryCurrencyMap =  currencyMap;

//MCPCardSchema.mainObjectCheck.keysCheck.push('currencyToken');
MCPCardSchema.mainObjectCheck.keysCheck.push('targetMcpCurrency');
//MCPCardSchema.currencyToken = {presence: true};
//MCPCardSchema.targetMcpCurrency = {presence: true};

//hello nagama
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
    return custFetch( `https://citrusapi.citruspay.com/binservice/v2/bin/${sixDigitCardNum}`, {
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

        let cardCurrency = countryCurrencyMap[resp.data.country];

        if(MCPData.calculatedMCPSchemes.indexOf(aliasedScheme) > -1){
            if(cardCurrency === MCPData.baseCurrency || cardCurrency === undefined){
                return [];
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

