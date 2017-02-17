import {getMerchantAccessKey, getAppData,setAppData} from "./../utils";
import {baseSchema} from "./../validation/validation-schema";
import cloneDeep from "lodash/cloneDeep";
import {TRACKING_IDS} from "../constants";
import {handlePayment} from "./payment-handler";
import { addDpTokenFromCacheIfNotPresent} from "./dynamic-pricing"

const savedPaymentValidationSchema = Object.assign(cloneDeep(baseSchema), {
    token: {presence: true}
});

savedPaymentValidationSchema.mainObjectCheck.keysCheck.push('token');

const savedAPIFunc = (confObj, url) => {
    setAppData('paymentObj',confObj);
    //console.log(confObj);
    //if(getAppData('citrus_wallet')) confObj.offerToken = getAppData('citrus_wallet')['offerToken'];
    confObj = addDpTokenFromCacheIfNotPresent(confObj,{paymentToken:confObj.token});
    const reqConf = Object.assign({}, confObj, {
        amount: {
            currency: confObj.currency,
            value: confObj.amount
        },
        paymentToken: {
            type: 'paymentOptionIdToken',
            id: confObj.token
        },
        merchantAccessKey: getMerchantAccessKey(confObj),
        requestOrigin: confObj.requestOrigin || TRACKING_IDS.CitrusWallet
    });

    confObj.CVV && (reqConf.paymentToken.cvv = confObj.CVV);

    delete reqConf.currency;
    delete reqConf.token;
    delete reqConf.CVV;
    const mode = (reqConf.mode) ? reqConf.mode.toLowerCase() : "";
    delete reqConf.mode;
    return handlePayment(reqConf,mode);
};

export {savedAPIFunc,savedPaymentValidationSchema};
