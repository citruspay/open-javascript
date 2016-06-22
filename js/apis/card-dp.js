import cloneDeep from 'lodash/cloneDeep';
import {motoCardValidationSchema, motoCardApiFunc} from './cards';
import {dynamicPricingFunction} from './dynamic-pricing';
import {validateAndCallbackify, schemeFromNumber} from './../utils';
import {getConfig} from '../config';
import {validateScheme} from '../validation/custom-validations'

const dynamicPricingSchema = {
    email: { presence : true, email : true },
    phone : { length: { maximum : 10 } },
    originalAmount: { presence : true },
    currency: { presence : true },
    cardNo: { presence : true },
    signature : { presence : true }
};
const dpCardSchema = cloneDeep(motoCardValidationSchema);

const applyDynamicPricing = validateAndCallbackify(dynamicPricingSchema, (confObj) => {
    const reqConf = Object.assign({}, confObj, {
        originalAmount: {
            value: confObj.originalAmount, currency : confObj.currency
        },
        alteredAmount : {
            value: confObj.alteredAmount, currency : confObj.currency
        },
        paymentInfo : {
            cardNo : confObj.cardNo,
            issuerId : confObj.issuerId,
            paymentMode : confObj.paymentMode,
            paymentToken : confObj.paymentToken
        },
        extraParams : {
            deviceType : `${getConfig().deviceType}`
        }
    });
    reqConf.paymentInfo.cardType = validateScheme(schemeFromNumber(confObj.cardNo));
    delete reqConf.cardNo;
    delete reqConf.currency;
    delete reqConf.paymentMode;
    return dynamicPricingFunction(reqConf);
});

const makeDPCardPayment = validateAndCallbackify(dpCardSchema, (confObj) => {
    return motoCardApiFunc(confObj);
});

export {applyDynamicPricing, makeDPCardPayment}