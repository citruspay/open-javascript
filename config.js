import {validate} from 'validate.js';
import {keysCheck, cardDate, custFormat, cardCheck, blazeCardCheck} from './validation/custom-validations';

const apiConfMap = {
    sandboxConf : {
        blazeCardApiUrl : 'https://blazecardsbox.citruspay.com',
        blazeNetApiUrl : 'https://sboxblazenet.citruspay.com',
        motoApiUrl: 'https://sandboxadmin.citruspay.com/service',
        MCPAPIUrl: 'https://sboxmercury.citruspay.com/multi-currency-pricing/mcp/mcpForCurrencies'
    },
    prodConf : {
        blazeCardApiUrl : 'https://blazecardsbox.citruspay.com',
        blazeNetApiUrl : 'https://sboxblaze.citruspay.com',
        motoApiUrl: 'https://admin.citruspay.com/service',
        MCPAPIUrl: 'https://mercury.citruspay.com/multi-currency-pricing/mcp/mcpForCurrencies'
    }
};


//const apiUrl = "https://sandboxadmin.citruspay.com/service";
const apiUrl = 'https://sboxblazenet.citruspay.com';
const handlersMap = {
    errorHandler: (error) =>{ //default Error Handler
        if(console.error){
            console.error('Error thrown from citrus.js sdk: ', error);
        }else{
            console.log('Error thrown from citrus.js sdk: ', error);
        }
    },
    serverErrorHandler: (error) => {
        console.error("Error from server. handled in default server error handler", JSON.stringify(error));
        //console.log(error);
    }
};

let env = 'prod';

const configMap = {
    merchantAccessKey:'',
    vanityUrl:'',
    env: 'prod',
    blazeCardApiUrl: apiConfMap[env+'Conf'].blazeCardApiUrl,
    blazeNetApiUrl: apiConfMap[env+'Conf'].blazeNetApiUrl,
    motoApiUrl : apiConfMap[env+'Conf'].motoApiUrl,
    MCPAPIUrl: apiConfMap[env+'Conf'].MCPAPIUrl
};

const setConfig = (configObj) => {
    configObj.env && (env = configObj.env);
    Object.assign(configMap, {
        blazeCardApiUrl: apiConfMap[env+'Conf'].blazeCardApiUrl,
        blazeNetApiUrl: apiConfMap[env+'Conf'].blazeNetApiUrl,
        motoApiUrl : apiConfMap[env+'Conf'].motoApiUrl,
        MCPAPIUrl: apiConfMap[env+'Conf'].MCPAPIUrl
    }, configObj);
    return Object.assign({}, configMap);
};

const getConfig = () => {
    console.log(configMap);
    return Object.assign({}, configMap);
};


const init = () => {
    validate.validators.keysCheck = keysCheck;
    validate.validators.cardDate = cardDate;
    validate.validators.cardCheck = cardCheck;
    validate.validators.blazeCardCheck = blazeCardCheck;
    validate.validators.custFormat = custFormat;
};



export {init, handlersMap, configMap, setConfig, getConfig};