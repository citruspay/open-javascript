import cloneDeep from 'lodash/cloneDeep';
import {motoCardValidationSchema, motoCardApiFunc} from './cards';
import {baseDynamicPricingSchema,applyDynamicPricing as applyDynamicPricingBaseFunction} from './dynamic-pricing';
import {validateAndCallbackify} from './../utils';

const dynamicPricingSchema = Object.assign({},baseDynamicPricingSchema,{
    cardNo: { presence : true }
});

const dpCardSchema = cloneDeep(motoCardValidationSchema);

const applyDynamicPricing = applyDynamicPricingBaseFunction(false,dynamicPricingSchema);

const makeDPCardPayment = validateAndCallbackify(dpCardSchema, (confObj) => {
    return motoCardApiFunc(confObj);
});

export {applyDynamicPricing, makeDPCardPayment}