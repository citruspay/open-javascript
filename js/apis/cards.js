import {
    validateAndCallbackify,
    getMerchantAccessKey,
    schemeFromNumber,
    getAppData,
    isV3Request,
    isIcpRequest,
    isExternalJsConsumer,
    doValidation
} from "./../utils";
import {makeMCPCardPayment} from "./mcp";
import {savedPaymentValidationSchema, savedAPIFunc} from "./common-saved-payment";
import {baseSchema} from "./../validation/validation-schema";
import cloneDeep from "lodash/cloneDeep";
import {getConfig} from "../config";
import {validateCardType, validateScheme, cardDate, validateCvv} from "../validation/custom-validations";
import {custFetch} from "../interceptor";
import {urlReEx, TRACKING_IDS} from "../constants";
import {handlePayment} from "./payment-handler";
import {getDpTokenFromAppData} from "./dynamic-pricing";

const regExMap = {
    'cardNumber': /^[0-9]{15,19}$/,
    'name': /^(?!\s*$)[a-zA-Z .]{1,50}$/,
    'CVV': /^[0-9]{3,4}$/, //todo: handle cases for amex
    url: urlReEx
};

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
    //if MCP is applied on the transaction DP won't be applicable for V3 transactions, this is a temporary fix.
    //This code needs to be changed corresponding to v3, since ICP and JS clients need a flexible approach over here.
    /*if (getAppData('credit_card') && confObj.paymentDetails.type.toLowerCase() === "credit" && !(confObj.currencyToken))
        confObj.offerToken = getAppData('credit_card')['offerToken'];
    if (getAppData('debit_card') && confObj.paymentDetails.type.toLowerCase() === "debit" && !(confObj.currencyToken))
        confObj.offerToken = getAppData('debit_card')['offerToken'];*/
    if(!confObj.currencyToken)
    {
        let offerToken = getDpTokenFromAppData({cardNo:confObj.paymentDetails.number});
        if(offerToken)
        confObj.offerToken = offerToken;
    }
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
    return handlePayment(reqConf, mode);
};

const makeMotoCardPayment = (paymentData)=> {
    // delete paymentData.paymentDetails.paymentMode;
    const makeMotoCardPaymentInternal = validateAndCallbackify(motoCardValidationSchema, motoCardApiFunc);
    return makeMotoCardPaymentInternal(paymentData);
};

const savedCardValidationSchema = Object.assign({}, savedPaymentValidationSchema);
savedCardValidationSchema.mainObjectCheck.keysCheck.push('CVV');

const makeSavedCardPayment = (paymentObj)=> {
    let paymentData = cloneDeep(paymentObj);
    //validate can only check regex against strings so need to convert cvv to string
    //if it was being set as number
    if (paymentData.paymentDetails.cvv)
        paymentData.paymentDetails.cvv = paymentData.paymentDetails.cvv.toString();
    if (isExternalJsConsumer(paymentData.requestOrigin)) {
        var additionalConstraints = {
            paymentDetails: {presence: true},
            "paymentDetails.cvv": {presence: true, format: regExMap.CVV},
            "paymentDetails.token": {presence: true}
        };
        doValidation(paymentData, additionalConstraints);
    }

    if (paymentObj.paymentDetails) {
        if (!paymentObj.token && paymentObj.paymentDetails.token)
            paymentData.token = paymentObj.paymentDetails.token;
        if (!paymentObj.CVV && paymentObj.paymentDetails.cvv)
            paymentData.CVV = paymentObj.paymentDetails.cvv;
        delete paymentData.paymentDetails;
    }
    if (isCvvGenerationRequired(paymentData)) {
        paymentData.CVV = Math.floor(Math.random() * 900) + 100;
    }
    let makeSavedCardPaymentInternal = validateAndCallbackify(savedCardValidationSchema, (paymentData)=> {
        const apiUrl = `${getConfig().motoApiUrl}/${getConfig().vanityUrl}`;

        return savedAPIFunc(paymentData, apiUrl);
    });
    return makeSavedCardPaymentInternal(paymentData);
};

const isCvvGenerationRequired = (paymentData)=> {
    if ((isV3Request(paymentData.requestOrigin) || isIcpRequest()) && !paymentData.CVV)
        return true;
    return false;
};
//Function to identify if the payment request requires MCP or not
//It can be used to check for other features such as EMI, subscription etc. in future.
const makeCardPaymentWrapper = (paymentObj)=> {
    let paymentData = cloneDeep(paymentObj);
    delete paymentData.paymentDetails.paymentMode;
    //The parameter to identify the mcp request.
    if (paymentData.targetMcpCurrency)
        makeMCPCardPayment(paymentData);
    else
        makeMotoCardPayment(paymentData);
};

export {
    makeBlazeCardPayment, getmerchantCardSchemes, motoCardValidationSchema, motoCardApiFunc,
    makeMotoCardPayment, makeSavedCardPayment, makeCardPaymentWrapper
};