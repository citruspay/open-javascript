/**
 * Created by nagamai on 11/9/2016.
 */
import {validateAndCallbackify, getMerchantAccessKey} from "./../utils";
import {baseSchema} from "./../validation/validation-schema";
import cloneDeep from "lodash/cloneDeep";
import { getConfig} from "../config";
import {TRACKING_IDS} from '../constants';
import {handlePayment} from "./payment-handler";

const extWalletValidationSchema = Object.assign(cloneDeep(baseSchema), {
    paymentDetails: {
        presence: true,
        keysCheck: ['bank', 'code']
    },
    "paymentDetails.bank": {presence: true},
    "paymentDetails.code": {presence: true}
});
extWalletValidationSchema.mainObjectCheck.keysCheck.push('paymentDetails');
/* "type": "netbanking",
 "bank": "Idea Money",
 "code": "BCW009" */
const extWalletApiFunc = (confObj) => {
    const reqConf = Object.assign({}, confObj, {
        amount: {
            currency: confObj.currency || 'INR',
            value: confObj.amount
        },
        paymentToken: {
            type: 'paymentOptionToken',
            paymentMode: {
                type : "wallet",
                bank : confObj.paymentDetails.bank,
                code : confObj.paymentDetails.code
            }
        },
        merchantAccessKey: getMerchantAccessKey(confObj),
        requestOrigin: confObj.requestOrigin || TRACKING_IDS.CitrusGuest
    });
    reqConf.paymentToken.paymentMode.expiry = confObj.paymentDetails.expiry;
    delete reqConf.paymentDetails;
    delete reqConf.currency;
    const mode = (reqConf.mode) ? reqConf.mode.toLowerCase() : "";
    delete reqConf.mode;
    reqConf.deviceType = getConfig().deviceType;
    let url = `${getConfig().motoApiUrl}/${getConfig().vanityUrl}`;
    return handlePayment(reqConf,mode,url);
};
const makeExtWalletsPayment = validateAndCallbackify(extWalletValidationSchema, extWalletApiFunc);



export {makeExtWalletsPayment};


