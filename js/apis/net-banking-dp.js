import cloneDeep from 'lodash/cloneDeep';
import {motoCardValidationSchema, motoCardApiFunc} from './cards';
import {dynamicPricingFunction} from './dynamic-pricing';
import {validateAndCallbackify, schemeFromNumber} from './../utils';
import {getConfig} from '../config';

const dynamicPricingSchema = {
    email: { presence : false, email : true },
    phone : { presence:false/*, length: { maximum : 10 }*/ },
    originalAmount: { presence : true },
    currency: { presence : true },
    bankCode: { presence : true },
    signature : { presence : true }
};
const dpCardSchema = cloneDeep(motoCardValidationSchema);
let DPData;

const applyNbDynamicPricing = validateAndCallbackify(dynamicPricingSchema, (confObj) => {
    const reqConf = Object.assign({}, confObj, {
        originalAmount: {
            value: confObj.originalAmount, currency : confObj.currency
        },
        alteredAmount : {
            value: confObj.alteredAmount, currency : confObj.currency
        },
        paymentInfo : {
            cardNo : confObj.cardNo,
            issuerId : confObj.bankCode,
            paymentMode : confObj.paymentMode,
            paymentToken : confObj.paymentToken
        },
        extraParams : {
            deviceType : `${getConfig().deviceType}`
        }
    });
    reqConf.paymentInfo.cardType = schemeFromNumber(confObj.cardNo);
    delete reqConf.cardNo;
    delete reqConf.currency;
    delete reqConf.paymentMode;
    delete reqConf.bankCode;
    return dynamicPricingFunction(reqConf);
});

const makeDPCardPayment = validateAndCallbackify(dpCardSchema, (confObj) => {
    confObj.offerToken = DPData.offerToken;
    return motoCardApiFunc(confObj);
});

export {applyNbDynamicPricing, makeDPCardPayment}