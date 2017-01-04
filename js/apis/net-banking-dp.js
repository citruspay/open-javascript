import cloneDeep from 'lodash/cloneDeep';
import {motoCardValidationSchema, motoCardApiFunc} from './cards';
import {applyDynamicPricing,baseDynamicPricingSchema} from './dynamic-pricing';
import {validateAndCallbackify} from './../utils';
import {getConfig} from '../config';

const dynamicPricingSchema = Object.assign({},baseDynamicPricingSchema, {
    bankCode: { presence : true }
});
const dpCardSchema = cloneDeep(motoCardValidationSchema);

const applyNbDynamicPricing = applyDynamicPricing(false,dynamicPricingSchema);

//not being used anywhere probably
const makeDPCardPayment = validateAndCallbackify(dpCardSchema, (confObj) => {
    return motoCardApiFunc(confObj);
});

export {applyNbDynamicPricing, makeDPCardPayment}