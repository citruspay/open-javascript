import cloneDeep from 'lodash/cloneDeep';
import {motoCardValidationSchema, motoCardApiFunc} from './cards';
import {baseDynamicPricingSchema,applyDynamicPricing as applyDynamicPricingBaseFunction} from './dynamic-pricing';
import {validateAndCallbackify, schemeFromNumber} from './../utils';
import {getConfig} from '../config';
import {validateScheme} from '../validation/custom-validations'

const dynamicPricingSchema = Object.assign({},baseDynamicPricingSchema,{
    cardNo: { presence : true }
});

const dpCardSchema = cloneDeep(motoCardValidationSchema);

const applyDynamicPricing = applyDynamicPricingBaseFunction(false,dynamicPricingSchema);

const makeDPCardPayment = validateAndCallbackify(dpCardSchema, (confObj) => {
    return motoCardApiFunc(confObj);
});

export {applyDynamicPricing, makeDPCardPayment}