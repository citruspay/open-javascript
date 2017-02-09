import {validate} from "validate.js";
import {keysCheck, cardDate, custFormat, cardCheck, blazeCardCheck} from "./validation/custom-validations";
import {setAppData} from "./utils";

const apiConfMap = {
    sandboxConf: {
        blazeCardApiUrl: 'https://blazecardsbox.citruspay.com',
        blazeNetApiUrl: 'https://sboxblazenet.citruspay.com',
        motoApiUrl: 'https://sandboxadmin.citruspay.com/service/moto/authorize/struct',
        olUrl: 'https://sboxpay.blazepay.in/service/moto/authorize/struct',
        adminUrl: 'https://sandboxadmin.citruspay.com',
        MCPAPIUrl: 'https://sboxmercury.citruspay.com/multi-currency-pricing/mcp/mcpForCurrencies',
        dpApiUrl: 'https://sandboxmars.citruspay.com/dynamic-pricing/dynamicpricing',
        pgUrl: 'https://sandbox.citruspay.com',
        hostedFieldDomain: 'https://icp.citruspay.com'
    },
    prodConf: {
        blazeCardApiUrl: 'https://blazecardsbox.citruspay.com',
        blazeNetApiUrl: 'https://sboxblaze.citruspay.com',
        motoApiUrl: 'https://admin.citruspay.com/service/moto/authorize/struct',
        olUrl: 'https://pay.blazepay.in/service/moto/authorize/struct',
        adminUrl: 'https://admin.citruspay.com',
        MCPAPIUrl: 'https://mercury.citruspay.com/multi-currency-pricing/mcp/mcpForCurrencies',
        dpApiUrl: 'https://mars.citruspay.com/dynamicpricing/dynamicpricing',
        pgUrl: 'https://www.citruspay.com',
        hostedFieldDomain: 'https://mocha.citruspay.com'
    },
    stagingConf: {
        blazeCardApiUrl: 'https://blazecardsbox.citruspay.com',
        blazeNetApiUrl: 'https://sboxblazenet.citruspay.com',
        motoApiUrl: 'https://sandboxadmin.citruspay.com/service/moto/authorize/struct',
        olUrl: 'https://stgpay.blazepay.in/service/moto/authorize/struct',
        adminUrl: 'https://sandboxadmin.citruspay.com',
        MCPAPIUrl: 'https://sboxmercury.citruspay.com/multi-currency-pricing/mcp/mcpForCurrencies',
        dpApiUrl: 'https://sandboxmars.citruspay.com/dynamic-pricing/dynamicpricing',
        pgUrl: 'https://sandbox.citruspay.com',
        hostedFieldDomain: 'https://icp.citruspay.com'
    },
    olstagingConf: {
        blazeCardApiUrl: 'https://blazecardsbox.citruspay.com',
        blazeNetApiUrl: 'https://sboxblazenet.citruspay.com',
        motoApiUrl: 'https://stgpay.citruspay.com/service/moto/authorize/struct',
        adminUrl: 'https://sandboxadmin.citruspay.com',
        MCPAPIUrl: 'https://sboxmercury.citruspay.com/multi-currency-pricing/mcp/mcpForCurrencies',
        dpApiUrl: 'https://stgadmin2.citruspay.com/dynamic-pricing/dynamicpricing',
        pgUrl: 'https://stgpg2.citruspay.com',
        hostedFieldDomain: ''
    },
    olsandboxConf: {
        blazeCardApiUrl: 'https://blazecardsbox.citruspay.com',
        blazeNetApiUrl: 'https://sboxblazenet.citruspay.com',
        motoApiUrl: 'https://sboxpay.citruspay.com/service/moto/authorize/struct',
        adminUrl: 'https://sandboxadmin.citruspay.com',
        MCPAPIUrl: 'https://sboxmercury.citruspay.com/multi-currency-pricing/mcp/mcpForCurrencies',
        dpApiUrl: 'https://stgadmin2.citruspay.com/dynamic-pricing/dynamicpricing',
        pgUrl: 'https://stgpg2.citruspay.com',
        hostedFieldDomain: ''
    },
    olprodConf: {
        blazeCardApiUrl: 'https://blazecardsbox.citruspay.com',
        blazeNetApiUrl: 'https://sboxblazenet.citruspay.com',
        motoApiUrl: 'https://pay.citruspay.com/service/moto/authorize/struct',
        adminUrl: 'https://sandboxadmin.citruspay.com',
        MCPAPIUrl: '',
        dpApiUrl: '',
        pgUrl: '',
        hostedFieldDomain: ''
    },
    localConf: {
        blazeCardApiUrl: 'https://blazecardsbox.citruspay.com',
        blazeNetApiUrl: 'https://sboxblazenet.citruspay.com',
        motoApiUrl: 'http://localhost:8080/admin-site/service/moto/authorize/struct',
        olUrl: 'http://localhost:8090/service/moto/authorize/struct',
        adminUrl: 'http://localhost:8080/admin-site',
        MCPAPIUrl: 'https://sboxmercury.citruspay.com/multi-currency-pricing/mcp/mcpForCurrencies',
        dpApiUrl: 'http://localhost:8080/dynamic-pricing/dynamicpricing',
        pgUrl: 'https://sandbox.citruspay.com',
        hostedFieldDomain: 'http://localhost'
    }
};


const handlersMap = {
    errorHandler: (error) => { //default Error Handler
        if (console.error) {
            console.error('Error thrown from citrus.js sdk: ', error);
        } else {
            console.log('Error thrown from citrus.js sdk: ', error);
        }
    },
    serverErrorHandler: (error) => {
        console.error("Error thrown from citrus.js sdk:", JSON.stringify(error));
    },
    transactionHandler: (response) => {
        console.log("Transaction status :", response);
    }
};

let env = 'sandbox';

const configMap = Object.assign({
        merchantAccessKey: '',
        vanityUrl: '',
        env: env
    },
    apiConfMap[env + 'Conf']
);

const setConfig = (configObj) => {
    configObj.env && (env = configObj.env);
    //todo: need to validate the configobj with accesskey and vanity url(to be kept mandatory)
    // if(configObj.env) {
    Object.assign(configMap, apiConfMap[env + 'Conf'], configObj);
    //todo: later to be changed with prod return url
    configMap.dropInReturnUrl = "https://mocha.citruspay.com/" + "static/returnUrl.html";
    // }
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

function getDeviceType() {
    //todo: initialize as "DESKTOP" and get rid of the else
    let device = "WEB"; //initiate as web
    // device detection
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4))) {
        device = "MOBILE";
    }
    else {
        device = "DESKTOP";
    }
    return device;
}

//todo:ideally we don't need to set the config url three times
//as we are calling setConfig three times we are setting it three times
//add our own custom validators to validate.validators object
const init = () => {
    initValidators();
    let deviceType = getDeviceType();
    setConfig({deviceType});
    // let page = "CJS";
    // setConfig({page});
    let url = (window.location !== window.parent.location)
        ? document.referrer
        : document.location;
    setAppData('parentUrl', url);
    //todo:remove these three lines below later, it seems not to be used anywhere
    setAppData('isValidCard', {"isValidCard": false, "txMsg": "Invalid card number"});
    setAppData('isValidExpiry', {"isValidExpiry": false, "txMsg": "Invalid expiry date"});
    setAppData('isValidCvv', {"isValidCvv": false, "txMsg": "Invalid cvv"});

    //for back button cancellation scenario
    if (history && history.pushState) {
        if (getParameterByName('fromBank') === 'yes') {
            //console.log('for cancellation API ==> from bank! ', localStorage.getItem('blazeCardcancelRequestObj'));
            let urlWithQS = window.location.href;
            urlWithQS = urlWithQS.replace('&fromBank=yes', '');
            urlWithQS = urlWithQS.replace('fromBank=yes&', '');
            urlWithQS = urlWithQS.replace('?fromBank=yes', '');
            window.history.pushState({path: urlWithQS}, '', urlWithQS);
        } else {
            //console.log('for cancellation API ==> not from bank!');
        }
    }
};

const initValidators = ()=>{
    validate.validators.keysCheck = keysCheck;
    validate.validators.cardDate = cardDate;
    validate.validators.cardCheck = cardCheck;
    validate.validators.blazeCardCheck = blazeCardCheck;
    validate.validators.custFormat = custFormat;
};

export {init, initValidators, handlersMap, configMap, setConfig, getConfig};