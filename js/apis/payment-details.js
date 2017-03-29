import {validateAndCallbackify, setAppData, getAppData} from "./../utils";
import {getConfig} from "../config";
import {validateScheme} from "../validation/custom-validations";
import {custFetch} from "../interceptor";

const paymentDetailsSchema = {
    vanityUrl: {presence: true}
};

let MCPData = {
    calculatedMCPSchemes : []
};

let pgSettingsData;

const reduceLogic = (initial, next)=>{
    let aliasedScheme = validateScheme(next);
    if(!aliasedScheme){
        throw 'scheme mapping not found!';
    }
    if(! (initial.indexOf(aliasedScheme) > -1) ) {
        initial.push(aliasedScheme);
    }

    return initial;

};

const reducer = (arr) =>{
   // console.log(arr.reduce(reduceLogic, []));
    return arr.reduce(reduceLogic, []);
};


const pgSettingsAPIFunc = (config) =>{
    return custFetch(`${getConfig().adminUrl}/service/v1/merchant/pgsetting`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `vanity=${config.vanityUrl}`
    }).then(resp => {
        let pgData = resp.data;

        pgData.creditCard = reducer(pgData.creditCard);
        pgData.debitCard = reducer(pgData.debitCard);

        setAppData('pgSettingsData', pgData);
            return resp.data;
    });
};

const getMcpDataFunc = (config) => {
    var pgData = getAppData('pgSettingsData');
    if (pgData && pgData.mcpEnabled) {
        return getMcpData(config);
    }
    else {
    return custFetch(`${getConfig().adminUrl}/service/v1/merchant/pgsetting`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `vanity=${config.vanityUrl}`
    }).then(resp => {
        pgData = resp.data;

        pgData.creditCard = reducer(pgData.creditCard);
        pgData.debitCard = reducer(pgData.debitCard);

        //pgSettingsData = pgData;
        setAppData('pgSettingsData', pgData);

        if (resp.data.mcpEnabled) {
            MCPData.baseCurrency = config.baseAmount.currency;
            delete config.vanityUrl;
            return getMcpData(config);
        } else {
            return resp.data;
        }
    });
}
};

const getMcpData = (config) => {
    return custFetch(`${getConfig().MCPAPIUrl}`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(config)
    }).then((mcpResp)=>{
        MCPData.MCPWrapperAPIData = mcpResp.data;
        MCPData.MCPWrapperAPIData.supportedCardSchemes.forEach(function(mcpScheme){

            let aliasedScheme = validateScheme(mcpScheme);
            if(!aliasedScheme){
                throw 'Scheme mapping not found!';
            }
            pgData.creditCard.concat(pgData.debitCard).some(function(el){
                if(el === aliasedScheme){
                    MCPData.calculatedMCPSchemes.push(aliasedScheme);
                    return true;
                }
            }); //mcpScheme
        });

        return  pgData;
    });
};

const getPaymentDetails = validateAndCallbackify(paymentDetailsSchema, pgSettingsAPIFunc);

const MCPpaymentDetailsSchema = {
    mainObjectCheck: {
        keysCheck: ['merchantAccessKey', 'baseAmount', 'merchantTransactionId', 'signature', 'vanityUrl'],
    },
    merchantAccessKey: {presence: true},
    baseAmount : {
        presence: true,
        keysCheck: ['value', 'currency']
    },
    'baseAmount.value': {presence: true},
    'baseAmount.currency': {presence: true},
    signature: {presence: true},
    vanityUrl: {presence: true}
};

const getMcpCurrenciesAndCardSchemes = validateAndCallbackify(MCPpaymentDetailsSchema, getMcpDataFunc);

export {getPaymentDetails, getMcpCurrenciesAndCardSchemes, MCPData, pgSettingsData};