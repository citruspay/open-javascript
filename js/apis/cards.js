import {validateAndCallbackify, getMerchantAccessKey, schemeFromNumber} from './../utils';
import {savedNBValidationSchema, savedAPIFunc} from './net-banking';
import {baseSchema} from './../validation/validation-schema';
import cloneDeep from 'lodash/cloneDeep';
import {handlersMap, getConfig} from '../config';
import {validateCardType, validateScheme, cardDate, validateCvv} from '../validation/custom-validations';
//import $ from 'jquery';
import {custFetch} from '../interceptor';
import {urlReEx} from '../constants';


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
    //"paymentDetails.type" : { presence: true },
    //"paymentDetails.scheme": { presence: true},
    //"paymentDetails.number": {presence: true },
    "paymentDetails.holder": {presence: true, format: regExMap.name}
    // "paymentDetails.cvv": {presence: true, format: regExMap.CVV},
    // "paymentDetails.expiry": {presence: true, cardDate: true}

});

motoCardValidationSchema.mainObjectCheck.keysCheck.push('paymentDetails');

const motoCardApiFunc = (confObj) => {
    const cardScheme = schemeFromNumber(confObj.paymentDetails.number);
    let paymentDetails;
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

    var d = confObj.paymentDetails.expiry.slice(3);
    if (d.length == 2) {
        var today = new Date();
        var year = today.getFullYear().toString().slice(0, 2);
        confObj.paymentDetails.expiry = confObj.paymentDetails.expiry.toString().slice(0, 3) + year + d;
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
        requestOrigin: "CJSG"
    });
    reqConf.paymentToken.paymentMode.expiry = confObj.paymentDetails.expiry;
    reqConf.offerToken = getConfig().dpOfferToken;
    delete reqConf.paymentDetails;
    delete reqConf.currency;
    const mode = reqConf.mode.toLowerCase();
    delete reqConf.mode;
    if (mode !== 'dropout') {
        reqConf.returnUrl = "http://localhost:8090/blade/returnUrl"; //window.location.protocol + '//' + window.location.host + '/blade/returnUrl';
    }
    return custFetch(`${getConfig().motoApiUrl}/moto/authorize/struct/${getConfig().vanityUrl}`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(reqConf)
    }).then(function (resp) {
        if (resp.data.redirectUrl) {
            if (mode === "dropout") {
                window.location = resp.data.redirectUrl;
            }
            else {
                winRef = openPopupWindow("");
                setTimeout(function(){
                    winRef.location.replace(resp.data.redirectUrl);
                    if (!isIE()) {
                        workFlowForModernBrowsers(winRef)
                    } else {
                        workFlowForIE(winRef);
                    }
                },1000);
            }
        } else {
            handlersMap['serverErrorHandler'](resp.data);
        }
    });

};

const makeMotoCardPayment = validateAndCallbackify(motoCardValidationSchema, motoCardApiFunc);

let winRef = null;
let transactionCompleted = false;

const openPopupWindow = (url) => {

    if (winRef == null || winRef.closed) {

        const w = 680;
        const h = 550;

        const dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
        const dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;

        const width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
        const height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

        const left = ((width / 2) - (w / 2)) + dualScreenLeft;
        const top = ((height / 2) - (h / 2)) + dualScreenTop;
        winRef = window.open(url, 'PromoteFirefoxWindowName', 'scrollbars=yes, resizable=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);
    } else {
        winRef.focus();
    }

    return winRef;

};

const isIE = () => {
    const ua = window.navigator.userAgent;

    const ie10orless = ua.indexOf('MSIE ');
    const ie11 = ua.indexOf('Trident/');
    const edge = ua.indexOf('Edge/');

    return !!(ie10orless > -1 || ie11 > -1 || edge > -1);
};

const workFlowForModernBrowsers = (winRef) => {

    var intervalId = setInterval(function () {
        if (transactionCompleted) {
            return clearInterval(intervalId);
        }
        if (winRef) {
            if (winRef.closed === true) {
                clearInterval(intervalId);
                windowResp.txstatus = "cancelled";
                handlersMap['transactionHandler']({txnStatus : "cancelled", pgRespCode : "111", txMessage : "Transaction cancelled by user"});
            }
        } else {
            clearInterval(intervalId);
        }
    }, 500);
};

const workFlowForIE = (winRef) => {
    const intervalId = setInterval(function(){
        if(transactionCompleted){
            return clearInterval(intervalId);
        }
        if(winRef) {
            if (winRef.closed) {
                clearInterval(intervalId);
                handlersMap['transactionHandler']({txnStatus : "cancelled", pgRespCode : "111", txMessage : "Transaction cancelled by user"});
            }
        }
    },500);
};

window.notifyTransactionToGoodBrowsers = function (data) {
    transactionCompleted = true;
    data = JSON.parse(data);
    handlersMap['transactionHandler'](data);
    setTimeout(function () {
        parent.postMessage('closeWallet', '*');
    }, 6000);
};

//------------------- makeSavedCardPayment ----------------//

const savedCardValidationSchema = Object.assign({}, savedNBValidationSchema, {CVV: {presence: true}});
savedCardValidationSchema.mainObjectCheck.keysCheck.push('CVV');

const makeSavedCardPayment = validateAndCallbackify(savedCardValidationSchema, (confObj)=> {
    const apiUrl = `${getConfig().motoApiUrl}/moto/authorize/struct/${getConfig().vanityUrl}`;
    return savedAPIFunc(confObj, apiUrl);
});

export {
    makeBlazeCardPayment, getmerchantCardSchemes, motoCardValidationSchema, motoCardApiFunc,
    makeMotoCardPayment, makeSavedCardPayment
};