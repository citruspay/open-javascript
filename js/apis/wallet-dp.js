import cloneDeep from 'lodash/cloneDeep';
import {motoCardValidationSchema, motoCardApiFunc} from './cards';
import {baseDynamicPricingSchema,applyDynamicPricing} from './dynamic-pricing';
import {validateAndCallbackify} from './../utils';
import {getConfig} from '../config';

const dynamicPricingSchema = Object.assign({},baseDynamicPricingSchema,{
    token: { presence : true }
});

const dpCardSchema = cloneDeep(motoCardValidationSchema);

const applyWallletDynamicPricing = applyDynamicPricing(true,dynamicPricingSchema);


const makeDPCardPayment = validateAndCallbackify(dpCardSchema, (confObj) => {
    return motoCardApiFunc(confObj);
});

export {applyWallletDynamicPricing, makeDPCardPayment}