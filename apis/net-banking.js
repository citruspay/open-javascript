import {validateAndCallbackify, getMerchantAccessKey} from './../utils';
import {baseSchema} from './../validation/validation-schema';
import cloneDeep from 'lodash/cloneDeep';
import {getConfig} from '../config';
import {custFetch} from '../interceptor';

/*

const netBankingConfig = {
    "merchantTxnId": "nosdfjlkeuwjffasdf1354",
    "amount": 1.00,
    "userDetails": {
        "email": "nikhil.yeole1@gmail.com",
        "firstName": "nikhil",
        "lastName": "yeole",
        "address": {
            "street1": "abcstree1",
            "street2": "abcstree2",
            "city": "Pune",
            "state": "MS",
            "country": "IND",
            "zip": "411038"
        },
        "mobileNo": "99349494944"
    },
    //"bankName" : 'AXIS Bank',
    "bankCode": "CID002",
    "returnUrl": "http://locahost:3000/returnUrl",
    //"notifyUrl": "<%= notifyUrl>",
    "merchantAccessKey": "66PT1PDZ38A5OB1PTF01",
    "requestSignature": "e87dd86b0a888e7c2f90b8c6754d1369da4b2b88"
};

*/

const netBankingValidationSchema = Object.assign(cloneDeep(baseSchema), {
    bankCode: {presence: true}
});

netBankingValidationSchema.mainObjectCheck.keysCheck.push('bankCode');


const makeNetBankingPayment = validateAndCallbackify(netBankingValidationSchema,(confObj) => {
    const reqConf = Object.assign({}, confObj, {
        amount: {
            currency: 'INR',
            value: confObj.amount
        },
        paymentToken: {
            type: 'paymentOptionToken',
            paymentMode: {
                type: 'netbanking',
                code: confObj.bankCode
            }
        },
        merchantAccessKey: getMerchantAccessKey(confObj),
        //requestOrigin: "CJSG"
    });

    delete reqConf.bankCode;

    console.log('net banking Config for fetch: ', reqConf);

    //${apiUrl}/moto/authorize/struct/${getConfig().vanityUrl}

    return custFetch(`${getConfig().blazeNetApiUrl}/netbank/chksumtrans`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        //mode: 'cors',
        body: JSON.stringify(reqConf)
    }).then(resp => {
        console.log('response from netbanking request: ', resp.data );
        return resp.data;
    });
});

/*
//api data
 {
    "merchantTxnId": "nosdfjlkeuwjffasdf1354",
    "amount": {
        "currency": "INR",
        "value": "1.00" // todo: check if we can send it as float
    },
    "userDetails": {
        "email": "nikhil.yeole1@gmail.com",
        "firstName": "nikhil",
        "lastName": "yeole",
        "address": {
            "street1": "abcstree1",
            "street2": "abcstree2",
            "city": "Pune",
            "state": "MS",
            "country": "IND",
            "zip": "411038"
        },
        "mobileNo": "99349494944"
    },
    "returnUrl": "http://localhost:3000/returnUrl",
    "paymentToken": {
        "type": "paymentOptionToken",
        "paymentMode": {
            "type": "netbanking",
            //"bank": "AXIS Bank",
            "code": "CID002"
        }
    },
    "notifyUrl": "<%= notifyUrl>",
    "merchantAccessKey": "66PT1PDZ38A5OB1PTF01",
    "requestSignature": "e87dd86b0a888e7c2f90b8c6754d1369da4b2b88",
    //"requestOrigin": "CJSG"
*/



export {makeNetBankingPayment}

