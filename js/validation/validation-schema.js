import {urlReEx} from '../constants';

const regEXMap = {
    url : urlReEx
};
//todo: Check why is this done
window.r2 = regEXMap.url;

export const baseSchema = {
    'mainObjectCheck':{
        keysCheck: ['merchantTxnId', 'amount', 'currency', 'userDetails', 'returnUrl',
            'notifyUrl', 'requestSignature', 'merchantAccessKey', 'customParameters', 'requestOrigin']
    },
    returnUrl: {
        presence: true,
        custFormat: {
            pattern: regEXMap.url,
            message: 'should be proper URL string'
        }
    },
    notifyUrl: {
        custFormat: {
            pattern: regEXMap.url,
            message: 'should be proper URL string'
        }
    },
    requestSignature: { presence: true },
    merchantTxnId : { presence: true },
    amount: { presence: true }, //todo: can write custom validator as - numOrStr: true
    //currency: {presence: true},
    //merchantAccessKey: { presence: true },
    userDetails: {
        presence: true,
        keysCheck: ['email', 'firstName', 'lastName', 'address', 'mobileNo']
    },
    'userDetails.email': { presence: true, email: true },
    'userDetails.address': {
        keysCheck: ['street1', 'street2', 'city', 'state', 'country', 'zip']
    },
    'userDetails.mobileNo' : {
        length: {maximum: 15}
    }
};