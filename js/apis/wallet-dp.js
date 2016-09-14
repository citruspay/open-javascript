import cloneDeep from 'lodash/cloneDeep';
import {motoCardValidationSchema, motoCardApiFunc} from './cards';
import {dynamicPricingFunction} from './dynamic-pricing';
import {validateAndCallbackify} from './../utils';
import {getConfig} from '../config';

const dynamicPricingSchema = {
    email: { presence : false, email : true },
    phone : {presence:false, length: { maximum : 10 } },
    originalAmount: { presence : true },
    currency: { presence : true },
    token: { presence : true },
    signature : { presence : true }
};

const dpSchema = () => {



};
const dpCardSchema = cloneDeep(motoCardValidationSchema);

const applyWallletDynamicPricing = validateAndCallbackify(dynamicPricingSchema, (confObj) => {
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
            paymentToken : confObj.token
        },
        extraParams : {
            deviceType : `${getConfig().deviceType}`
        }
    });
    delete reqConf.token;
    delete reqConf.currency;
    delete reqConf.paymentMode;
    return dynamicPricingFunction(reqConf);
});

const makeDPCardPayment = validateAndCallbackify(dpCardSchema, (confObj) => {
    return motoCardApiFunc(confObj);
});

export {applyWallletDynamicPricing, makeDPCardPayment}