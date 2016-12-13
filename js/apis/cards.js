import {
    validateAndCallbackify,
    getMerchantAccessKey,
    schemeFromNumber,
    getAppData,
    isV3Request,
    isIcpRequest,
    isUrl
} from "./../utils";
import {savedNBValidationSchema, savedAPIFunc} from "./net-banking";
import {baseSchema} from "./../validation/validation-schema";
import cloneDeep from "lodash/cloneDeep";
import {handlersMap, getConfig} from "../config";
import {validateCardType, validateScheme, cardDate, validateCvv} from "../validation/custom-validations";
import {custFetch} from "../interceptor";
import {urlReEx, TRACKING_IDS, PAGE_TYPES} from "../constants";
import {getCancelResponse, refineMotoResponse} from "./response";
import {singleHopDropOutFunction} from "./singleHop";
import {handleDropIn, openPopupWindowForDropIn, handleOlResponse} from "./drop-in";
//import $ from 'jquery';

const regExMap = {
    'cardNumber': /^[0-9]{15,19}$/,
    'name': /^(?!\s*$)[a-zA-Z .]{1,50}$/,
    'CVV': /^[0-9]{3,4}$/, //todo: handle cases for amex
    url: urlReEx
};

let cancelApiResp;

const blazeCardValidationSchema = {
    mainObjectCheck: {
        /* keysCheck: ['cardNo', 'expiry', 'cvv', 'cardHolderName',
         'email', 'phone', 'amount', 'currency', 'returnUrl', 'notifyUrl', 'merchantTransactionId', 'merchantAccessKey',
         'signature', 'cardType','cardScheme'],*/
        blazeCardCheck: true
    },
    expiry: {presence: true, cardDate: true},
    cvv: {presence: true, format: regExMap.CVV},
    //cardHolderName : { presence: true, format: regExMap.name },
    email: {presence: true, email: true},
    phone: {length: {maximum: 10}},
    amount: {presence: true},
    currency: {presence: true},
    cardType: {presence: true},
    returnUrl: {
        presence: true,
        custFormat: {
            pattern: regExMap.url,
            message: 'should be proper URL string'
        }
    },
    notifyUrl: {
        custFormat: {
            pattern: regExMap.url,
            message: 'should be proper URL string'
        }
    },
    merchantAccessKey: {presence: true},
    signature: {presence: true}
};

let makeBlazeCardPaymentConfObj;

const makeBlazeCardPayment = validateAndCallbackify(blazeCardValidationSchema, (confObj) => {
    makeBlazeCardPaymentConfObj = confObj;
    //needed to convert cardType and cardScheme with server expected values
    const paymentDetails = Object.assign({}, confObj, {
        cardType: validateCardType(confObj.cardType),
        cardScheme: confObj.cardScheme//validateScheme(confObj.cardScheme)
    });

    return custFetch(getConfig().blazeCardApiUrl + '/cards-gateway/rest/cardspg/mpi', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(paymentDetails)
    }).then(function (resp) {
        //to handler back button cancellation scenario

        if (history && history.pushState) {
            let href = window.location.href;
            let appendChar = href.indexOf('?') > -1 ? '&' : '?';
            let newurl = window.location.href + appendChar + 'fromBank=yes';
            window.history.pushState({path: newurl}, '', newurl);
            makeBlazeCardPaymentConfObj.citrusTransactionId = resp.data.citrusTransactionId;
            localStorage.setItem('blazeCardcancelRequestObj', JSON.stringify(makeBlazeCardPaymentConfObj));
        }
        return resp;
    });

});

const merchantCardSchemesSchema = {
    merchantAccessKey: {presence: true}
};

const getmerchantCardSchemes = validateAndCallbackify(merchantCardSchemesSchema, (confObj) => {

    return custFetch(getConfig().blazeCardApiUrl + '/cards-gateway/rest/cardspg/merchantCardSchemes/getEnabledCardScheme', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(confObj)
    });
});

//moto implementation

const motoCardValidationSchema = Object.assign(cloneDeep(baseSchema), {
    paymentDetails: {
        presence: true,
        cardCheck: true,
        keysCheck: ['type', 'number', 'holder', 'cvv', 'expiry']
    },
    "paymentDetails.holder": {presence: true, format: regExMap.name}
});

motoCardValidationSchema.mainObjectCheck.keysCheck.push('paymentDetails');

//this code has become hosted-field-specific for dropin case
//for the time being, look into it later
const motoCardApiFunc = (confObj) => {
    const cardScheme = schemeFromNumber(confObj.paymentDetails.number);
    let paymentDetails;
    //todo:refactor this if else later
    if (cardScheme === 'maestro') {
        paymentDetails = Object.assign({}, confObj.paymentDetails, {
            type: validateCardType(confObj.paymentDetails.type),
            scheme: validateScheme(cardScheme),
            expiry: confObj.paymentDetails.expiry,
            cvv: confObj.paymentDetails.cvv
        });
    } else {
        paymentDetails = Object.assign({}, confObj.paymentDetails, {
            type: validateCardType(confObj.paymentDetails.type),
            scheme: validateScheme(cardScheme),
            expiry: cardDate(confObj.paymentDetails.expiry),
            cvv: validateCvv(confObj.paymentDetails.cvv, cardScheme)
        });
    }
    if (confObj.paymentDetails.expiry) {
        var d = confObj.paymentDetails.expiry.slice(3);
        if (d.length == 2) {
            var today = new Date();
            var year = today.getFullYear().toString().slice(0, 2);
            confObj.paymentDetails.expiry = confObj.paymentDetails.expiry.toString().slice(0, 3) + year + d;
        }
    }
    if (getAppData('credit_card') && confObj.paymentDetails.type.toLowerCase() === "credit") confObj.offerToken = getAppData('credit_card')['offerToken'];
    if (getAppData('debit_card') && confObj.paymentDetails.type.toLowerCase() === "debit") confObj.offerToken = getAppData('debit_card')['offerToken'];
    const reqConf = Object.assign({}, confObj, {
        amount: {
            currency: confObj.currency || 'INR',
            value: confObj.amount
        },
        paymentToken: {
            type: 'paymentOptionToken',
            paymentMode: paymentDetails
        },
        merchantAccessKey: getMerchantAccessKey(confObj),
        requestOrigin: confObj.requestOrigin || TRACKING_IDS.CitrusGuest
    });
    reqConf.paymentToken.paymentMode.expiry = confObj.paymentDetails.expiry;
    // reqConf.offerToken = getAppData().dpOfferToken;
    delete reqConf.paymentDetails;
    delete reqConf.currency;
    const mode = (reqConf.mode) ? reqConf.mode.toLowerCase() : "";
    delete reqConf.mode;
    reqConf.deviceType = getConfig().deviceType;
    //const env = `${getConfig().isOl}`;
    let isOl = getConfig().isOlEnabled;
    //env.toLowerCase().contains('ol') ?  isOl = true :  isOl = false;
    cancelApiResp = getCancelResponse(reqConf);
    let corsString;
    isOl ? corsString = 'no-cors' : corsString = 'cors';
    let url;
    isOl ? url = `${getConfig().olUrl}/${getConfig().vanityUrl}` : url = `${getConfig().motoApiUrl}/${getConfig().vanityUrl}`;
    if (mode === 'dropin' && getConfig().page !== PAGE_TYPES.ICP ) {
        reqConf.returnUrl = getConfig().dropInReturnUrl;
        if(getConfig().page!== PAGE_TYPES.HOSTED_FIELD)
            winRef = openPopupWindowForDropIn(winRef);
    }
    if (getConfig().page === PAGE_TYPES.ICP) {
        return custFetch(url, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify(reqConf)
        });
    }
    else {
        return custFetch(url, {
        //     return custFetch(`${getConfig().motoApiUrl}/struct/${getConfig().vanityUrl}`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: corsString,
            body: JSON.stringify(reqConf)
        }).then(function (resp) {
            if (getConfig().page === PAGE_TYPES.HOSTED_FIELD) return resp;
            if (getConfig().page !== PAGE_TYPES.ICP) {
                if (resp.data.redirectUrl) {
                    if (mode === "dropout") {
                        //logic for OL
                        if (isV3Request(reqConf.requestOrigin)) {
                            let htmlStr = resp.data.redirectUrl.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
                            if (isUrl(htmlStr) && !(getConfig().isSingleHop)) {
                                window.location = resp.data.redirectUrl;
                            }
                            isUrl(htmlStr) ? singleHopDropOutFunction(htmlStr) : handleOlResponse(htmlStr);
                        }
                    }
                    else {//the code will never reach this point for the time being (or at least should not reach)
                        if (winRef && winRef.closed) {
                            handlersMap["serverErrorHandler"](cancelApiResp);
                            return;
                        }
                        handleDropIn(resp.data, winRef);
                    }
                } else {
                    if (winRef) {
                        winRef.close();
                    }
                    const response = refineMotoResponse(resp.data);
                    handlersMap['serverErrorHandler'](response);
                }
            }
        });
    }
};

const makeMotoCardPayment = validateAndCallbackify(motoCardValidationSchema, motoCardApiFunc);

//this variable is not being assigned anywhere for the time being
//after changes were made for hosted fields in this file, although
//the variable is used in unreachable portions of code for the time being.
let winRef = null;

const savedCardValidationSchema = Object.assign({}, savedNBValidationSchema);
savedCardValidationSchema.mainObjectCheck.keysCheck.push('CVV');

const makeSavedCardPayment = (paymentObj)=>{
    let paymentData = cloneDeep(paymentObj);
    if(paymentObj.paymentDetails){
        if(!paymentObj.token && paymentObj.paymentDetails.token)
            paymentData.token = paymentObj.paymentDetails.token;
        delete paymentData.paymentDetails;
    } 
    let makeSavedCardPaymentInternal = validateAndCallbackify(savedCardValidationSchema, (paymentData)=> {
        const apiUrl = `${getConfig().motoApiUrl}/${getConfig().vanityUrl}`;
        if(isCvvGenerationRequired(paymentData)) { paymentData.CVV = Math.floor(Math.random()*900) + 100; }
        return savedAPIFunc(paymentData, apiUrl);
    });
    return makeSavedCardPaymentInternal(paymentData);
};

const isCvvGenerationRequired = (paymentData)=>{
    if((isV3Request(paymentData.requestOrigin)||isIcpRequest())&&!paymentData.CVV)
        return true;
    return false;
};

export {
    makeBlazeCardPayment, getmerchantCardSchemes, motoCardValidationSchema, motoCardApiFunc,
    makeMotoCardPayment, makeSavedCardPayment
};