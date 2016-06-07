import {validateAndCallbackify, getMerchantAccessKey} from './../utils';
import {getConfig} from '../config';
import {validateCardType, validateScheme} from '../validation/custom-validations';
import {custFetch} from '../interceptor';

const  makeWallletPayment = (confObj) => {

    // const paymentDetails = Object.assign({}, confObj.paymentDetails, {
    //     type: validateCardType(confObj.paymentDetails.type),
    //     scheme: validateScheme(schemeFromNumber(confObj.paymentDetails.number))
    // });
    //
    // const reqConf = Object.assign({}, confObj, {
    //     amount: {
    //         currency: confObj.currency || 'INR',
    //         value: confObj.amount
    //     },
    //     paymentToken: {
    //         type: 'paymentOptionToken',
    //         paymentMode: paymentDetails
    //     },
    //     merchantAccessKey: getMerchantAccessKey(confObj),
    //     requestOrigin: "CJSG"
    // });

    // delete reqConf.paymentDetails;
    // delete reqConf.currency;
    
    
    

    return custFetch('https://betawallet.citruspay.com/rest/v1/orangepocket/pay', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Authorization' : reqConf.access_token
        },
        mode: 'cors',
        body: JSON.stringify(reqConf)
    })

};

export {makeWallletPayment};