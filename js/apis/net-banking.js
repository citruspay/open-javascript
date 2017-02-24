import {
    validateAndCallbackify,
    getMerchantAccessKey,
    isExternalJsConsumer,
    doValidation
} from "./../utils";
import {baseSchema} from "./../validation/validation-schema";
import cloneDeep from "lodash/cloneDeep";
import {getConfig} from "../config";
import {TRACKING_IDS} from "../constants";
import {handlePayment} from "./payment-handler";
import {savedAPIFunc,savedPaymentValidationSchema} from './common-saved-payment';
import {addDpTokenFromCacheIfNotPresent} from './dynamic-pricing';

const NBAPIFunc = (confObj, apiUrl) => {
    //if(getAppData('net_banking')) confObj.offerToken = getAppData('net_banking')['offerToken'];
    confObj = addDpTokenFromCacheIfNotPresent(confObj,{issuerId:confObj.paymentDetails.bankCode});
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
    return handlePayment(reqConf,mode,apiUrl);
};

const netBankingValidationSchema = Object.assign(cloneDeep(baseSchema), {
    paymentDetails: {
        presence: true,
        keysCheck: ['paymentMode', 'bankCode']
    },
    "paymentDetails.bankCode": {presence: true}
});

netBankingValidationSchema.mainObjectCheck.keysCheck.push('paymentDetails');


const makeNetBankingPayment = validateAndCallbackify(netBankingValidationSchema, (confObj) => {
    return NBAPIFunc(confObj);
});


//------------------- makeBlazeNBPayment ----------------//

const makeBlazeNBPayment = validateAndCallbackify(netBankingValidationSchema, (confObj) => {
    const apiUrl = `${getConfig().motoApiUrl}/moto/authorize/struct/${getConfig().vanityUrl}`;
    return NBAPIFunc(confObj, apiUrl);
});

//------------------- makeSavedNBPayment ----------------//
const makeSavedNBPayment = (paymentObj)=>{
    let paymentData = cloneDeep(paymentObj);
    if (isExternalJsConsumer(paymentData.requestOrigin)) {
        var additionalConstraints = {
            paymentDetails: {presence: true},
            "paymentDetails.token": {presence: true}
        };
        doValidation(paymentData, additionalConstraints);
    }
    if(paymentObj.paymentDetails){
        //js clients will send token inside paymentDetails
        //v3 and icp send it inside paymentObj itself
        if(!paymentObj.token && paymentObj.paymentDetails.token)
            paymentData.token = paymentObj.paymentDetails.token;
        delete paymentData.paymentDetails;
    }
    let makeSavedNBPaymentInternal = validateAndCallbackify(savedPaymentValidationSchema, (confObj)=> {
    const apiUrl = `${getConfig().motoApiUrl}/${getConfig().vanityUrl}`;
    return savedAPIFunc(confObj, apiUrl);
    });
    return makeSavedNBPaymentInternal(paymentData);
};

export {
    makeNetBankingPayment,
    makeSavedNBPayment,
    makeBlazeNBPayment
}