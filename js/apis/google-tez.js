/**
 * Created by nagamai on 30/10/2017
 */
import {getMerchantAccessKey, validateAndCallbackify} from "./../utils";
import {getConfig} from "../config";
import {TRACKING_IDS} from "../constants";
import {handlePayment} from "./payment-handler";


const gTezApiFunc = (confObj) => {
    const reqConf = Object.assign({}, confObj, {
        amount: {
            currency: confObj.currency || 'INR',
            value: confObj.amount
        },
        paymentToken: {
            type: 'paymentOptionToken',
            paymentMode: {
                type: confObj.paymentDetails.type,
                code: confObj.paymentDetails.code,
                holder: confObj.paymentDetails.holder
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
    return handlePayment(reqConf, mode, url);
};
//Validation schema will be blank for v3 and icp clients
const makeGTezPayment = validateAndCallbackify({}, gTezApiFunc);

export {makeGTezPayment};