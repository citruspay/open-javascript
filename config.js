import {validate} from 'validate.js';
import {keysCheck, cardDate, custFormat, cardCheck, blazeCardCheck} from './validation/custom-validations';

const apiConfMap = {
    sandboxConf : {
        blazeCardApiUrl : 'https://blazecardsbox.citruspay.com',
        blazeNetApiUrl : 'https://sboxblazenet.citruspay.com',
        motoApiUrl: 'https://sandboxadmin.citruspay.com/service',
        MCPAPIUrl: 'https://sboxmercury.citruspay.com/multi-currency-pricing/mcp/mcpForCurrencies',
        dpApiUrl: 'https://sandboxmars.citruspay.com/dynamic-pricing/dynamicpricing'
    },
    prodConf : {
        blazeCardApiUrl : 'https://blazecardsbox.citruspay.com',
        blazeNetApiUrl : 'https://sboxblaze.citruspay.com',
        motoApiUrl: 'https://admin.citruspay.com/service',
        MCPAPIUrl: 'https://mercury.citruspay.com/multi-currency-pricing/mcp/mcpForCurrencies',
        dpApiUrl: 'https://mars.citruspay.com/dynamic-pricing/dynamicpricing'
    }
};


//const apiUrl = "https://sandboxadmin.citruspay.com/service";
const apiUrl = 'https://sboxblazenet.citruspay.com';
const handlersMap = {
    errorHandler: (error) => { //default Error Handler
        if (console.error) {
            console.error('Error thrown from citrus.js sdk: ', error);
        } else {
            console.log('Error thrown from citrus.js sdk: ', error);
        }
    },
    serverErrorHandler: (error) => {
        console.error("Error from server. handled in default server error handler", JSON.stringify(error));
    }
};

let env = 'prod';

const configMap = {
    merchantAccessKey: '',
    vanityUrl: '',
    env: 'prod',
    blazeCardApiUrl: apiConfMap[env + 'Conf'].blazeCardApiUrl,
    blazeNetApiUrl: apiConfMap[env + 'Conf'].blazeNetApiUrl,
    motoApiUrl: apiConfMap[env + 'Conf'].motoApiUrl,
    MCPAPIUrl: apiConfMap[env + 'Conf'].MCPAPIUrl
};

const setConfig = (configObj) => {
    configObj.env && (env = configObj.env);
    Object.assign(configMap, {
        blazeCardApiUrl: apiConfMap[env+'Conf'].blazeCardApiUrl,
        blazeNetApiUrl: apiConfMap[env+'Conf'].blazeNetApiUrl,
        motoApiUrl : apiConfMap[env+'Conf'].motoApiUrl,
        MCPAPIUrl: apiConfMap[env+'Conf'].MCPAPIUrl,
        dpApiUrl:apiConfMap[env+'Conf'].dpApiUrl
    }, configObj);
    return Object.assign({}, configMap);
};

const getConfig = () => {
    return Object.assign({}, configMap);
};

const getParameterByName = (name, url) => {
    if (!url) url = window.location.href;
    url = url.toLowerCase(); // This is just to avoid case sensitiveness
    name = name.replace(/[\[\]]/g, "\\$&").toLowerCase();// This is just to avoid case sensitiveness for query parameter name
    let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
};

const init = () => {
    validate.validators.keysCheck = keysCheck;
    validate.validators.cardDate = cardDate;
    validate.validators.cardCheck = cardCheck;
    validate.validators.blazeCardCheck = blazeCardCheck;
    validate.validators.custFormat = custFormat;

    //for back button cancellation scenario

    if (history && history.pushState) {
        if (getParameterByName('fromBank') === 'yes') {
            console.log('for cancellation API ==> from bank! ', localStorage.getItem('blazeCardcancelRequestObj'));
            let urlWithQS = window.location.href;
            urlWithQS = urlWithQS.replace('&fromBank=yes', '');
            urlWithQS = urlWithQS.replace('fromBank=yes&', '');
            urlWithQS = urlWithQS.replace('?fromBank=yes', '');
            window.history.pushState({path: urlWithQS}, '', urlWithQS);
        }else {
        console.log('for cancellation API ==> not from bank!');
        }
    }


};


export {init, handlersMap, configMap, setConfig, getConfig};