import {validateAndCallbackify, getMerchantAccessKey, getAppData, setAppData} from "./../utils";
import {baseSchema} from "./../validation/validation-schema";
import cloneDeep from "lodash/cloneDeep";
import {handlersMap, getConfig, setConfig} from "../config";
import {custFetch} from "../interceptor";
import {getCancelResponse, refineMotoResponse} from "./response";
import {singleHopDropOutFunction, singleHopDropInFunction} from "./singleHop";
import {TRACKING_IDS, PAGE_TYPES} from '../constants';
import {handleDropIn, openPopupWindowForDropIn} from './drop-in';
let cancelApiResp;
let requestOrigin;
const NBAPIFunc = (confObj, apiUrl) => {
    if(getAppData('net_banking')) confObj.offerToken = getAppData('net_banking')['offerToken'];
    requestOrigin = confObj.requestOrigin ||TRACKING_IDS.CitrusGuest;
    const reqConf = Object.assign({}, confObj, {
        amount: {
            currency: 'INR',
            value: confObj.amount
        },
        paymentToken: {
            type: 'paymentOptionToken',
            paymentMode: {
                type: 'netbanking',
                code: confObj.paymentDetails.bankCode
            }
        },
        merchantAccessKey: getMerchantAccessKey(confObj),
        requestOrigin: confObj.requestOrigin || TRACKING_IDS.CitrusGuest
    });
    delete reqConf.bankCode;
    delete reqConf.currency;
    delete reqConf.paymentDetails;
    const mode = (reqConf.mode) ? reqConf.mode.toLowerCase() : "";
    delete reqConf.mode;
    cancelApiResp = getCancelResponse(reqConf);
    setConfig({cancelApiResp});
    //var winRef = openPopupWindow("");
    //var winRef = window.open("",'PromoteFirefoxWindowName', 'scrollbars=yes, top= 1000, left= 1000 ,visible=none;');
    //if (mode === 'dropout' || getConfig().page === PAGE_TYPES.ICP) {
    //} else {
    if (mode === 'dropin' && getConfig().page !== PAGE_TYPES.ICP) {
        reqConf.returnUrl = getConfig().dropInReturnUrl;
        winRef = openPopupWindowForDropIn(winRef);
        
    }
    if (getConfig().page === PAGE_TYPES.ICP) {

        return custFetch(apiUrl, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqConf)
        });

    }
    else {
        return custFetch(apiUrl, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqConf)
        }).then(function (resp) {
            handlePayment(resp.data,mode);
        });
    }
};

let winRef = null;

const netBankingValidationSchema = Object.assign(cloneDeep(baseSchema), {
    paymentDetails: {
        presence: true,
        keysCheck: ['paymentMode', 'bankCode']
    },
    "paymentDetails.bankCode": {presence: true}
});

netBankingValidationSchema.mainObjectCheck.keysCheck.push('paymentDetails');


const makeNetBankingPayment = validateAndCallbackify(netBankingValidationSchema, (confObj) => {
    const apiUrl = `${getConfig().motoApiUrl}/${getConfig().vanityUrl}`;
    return NBAPIFunc(confObj, apiUrl);
});
//wrapper function call
const netbanking = validateAndCallbackify(netBankingValidationSchema, (confObj) => {
    const apiUrl = `${getConfig().motoApiUrl}/${getConfig().vanityUrl}`;
    return NBAPIFunc(confObj, apiUrl);
});

//------------------- makeBlazeNBPayment ----------------//

const makeBlazeNBPayment = validateAndCallbackify(netBankingValidationSchema, (confObj) => {
    const apiUrl = `${getConfig().motoApiUrl}/moto/authorize/struct/${getConfig().vanityUrl}`;
    return NBAPIFunc(confObj, apiUrl);
});

//------------------- makeSavedNBPayment ----------------//

const savedNBValidationSchema = Object.assign(cloneDeep(baseSchema), {
    token: {presence: true}
});

savedNBValidationSchema.mainObjectCheck.keysCheck.push('token');

const savedAPIFunc = (confObj, url) => {
    setAppData('paymentObj',confObj);
    if(getAppData('citrus_wallet')) confObj.offerToken = getAppData('citrus_wallet')['offerToken'];
    requestOrigin = confObj.requestOrigin || TRACKING_IDS.CitrusWallet;
    const reqConf = Object.assign({}, confObj, {
        amount: {
            currency: confObj.currency,
            value: confObj.amount
        },
        paymentToken: {
            type: 'paymentOptionIdToken',
            id: confObj.token
        },
        merchantAccessKey: getMerchantAccessKey(confObj),
        requestOrigin: confObj.requestOrigin || TRACKING_IDS.CitrusWallet
    });

    confObj.CVV && (reqConf.paymentToken.cvv = confObj.CVV);

    delete reqConf.currency;
    delete reqConf.token;
    delete reqConf.CVV;
    const mode = (reqConf.mode) ? reqConf.mode.toLowerCase() : "";
    delete reqConf.mode;
    if (mode === 'dropin' && getConfig().page !== PAGE_TYPES.ICP) {
        reqConf.returnUrl = getConfig().dropInReturnUrl;
        winRef = openPopupWindowForDropIn(winRef);
        
    }
    if (getConfig().page === PAGE_TYPES.ICP) {
        return custFetch(url, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqConf)
        });
    }
    else {
        return custFetch(url, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqConf)
        }).then(function (resp) {
            if (getConfig().page !== PAGE_TYPES.ICP) {
                handlePayment(resp.data,mode);
            }
        });
    }
};
const handlePayment = (resp,mode)=>{
    if (resp.redirectUrl) {
        if (mode === "dropout") {
            (requestOrigin === TRACKING_IDS.SSLV3Guest || requestOrigin === TRACKING_IDS.SSLV3Wallet || requestOrigin === TRACKING_IDS.SSLV3Nitro)?window.location = resp.redirectUrl:singleHopDropOutFunction(resp.redirectUrl);
                }
                else {
                 handleDropIn(resp,winRef);
                }
    } else {
        if (winRef) {
            winRef.close();
        }
        const response = refineMotoResponse(resp);
        handlersMap['serverErrorHandler'](response);
    }
};

const makeSavedNBPayment = validateAndCallbackify(savedNBValidationSchema, (confObj)=> {
    const apiUrl = `${getConfig().motoApiUrl}/${getConfig().vanityUrl}`;
    return savedAPIFunc(confObj, apiUrl);
});

export {
    makeNetBankingPayment,
    makeSavedNBPayment,
    makeBlazeNBPayment,
    savedAPIFunc,
    savedNBValidationSchema,
    netbanking
}