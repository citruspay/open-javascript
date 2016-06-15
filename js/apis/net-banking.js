import {validateAndCallbackify, getMerchantAccessKey} from './../utils';
import {baseSchema} from './../validation/validation-schema';
import cloneDeep from 'lodash/cloneDeep';
import {handlersMap,getConfig} from '../config';
import {custFetch} from '../interceptor';

let windowResp = { txstatus : "" , txMessage : "Transaction cancelled by user" };

const NBAPIFunc = (confObj, apiUrl) => {
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
        requestOrigin: "CJSG"
    });
    delete reqConf.bankCode;
    delete reqConf.currency;
    return custFetch(apiUrl, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(reqConf)
    }).then(function(resp){
        if(resp.data.redirectUrl) {
            var winRef = openPopupWindow(resp.data.redirectUrl);
            if (!isIE()) {
                workFlowForModernBrowsers(winRef)
            } else {
                workFlowForIE(winRef);
            }
        }
    });
};

let winRef = null;
let transactionCompleted = false;

const openPopupWindow =  (url) => {

    if (winRef == null || winRef.closed) {

        const w = 680;
        const h = 550;

        const dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
        const dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;

        const width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
        const height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

        const left = ((width / 2) - (w / 2)) + dualScreenLeft;
        const top = ((height / 2) - (h / 2)) + dualScreenTop;
        winRef = window.open(url, 'PromoteFirefoxWindowName', 'scrollbars=yes, resizable=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);
    } else {
        winRef.focus();
    }


    return winRef;

};

const isIE = () => {
    const ua = window.navigator.userAgent;

    const ie10orless = ua.indexOf('MSIE ');
    const ie11 = ua.indexOf('Trident/');
    const edge = ua.indexOf('Edge/');

    return !!(ie10orless > -1 || ie11 > -1 || edge > -1);
};

const workFlowForModernBrowsers = (winRef) => {

    var intervalId = setInterval(function () {
        if (transactionCompleted) {
            return clearInterval(intervalId);
        }
        if (winRef) {
            if (winRef.closed === true) {
                clearInterval(intervalId);
                windowResp.txstatus = "cancelled";
                handlersMap['transactionHandler'](windowResp);
            }
        } else {
            clearInterval(intervalId);
        }
    }, 500);

};

const workFlowForIE = (winRef) => {

    const intervalId = setInterval(function () {
        if (transactionCompleted) {
            return clearInterval(intervalId);
        }
        if (winRef) {
            if (typeof winRef.setInterval !== 'function') {
                clearInterval(intervalId);
                windowResp.txstatus = "cancelled";
                handlersMap['transactionHandler'](windowResp);
            }
        } else {
            clearInterval(intervalId);
        }
        try {
            winRef.IEPollingFunc && winRef.IEPollingFunc(function (data) {
                console.log('from cb to function Available');
                notifyTransactionToGoodBrowsers(data);
            });
        } catch (e) {
            console.log('Exception: ', e)
        }

    }, 500);

};

window.notifyTransactionToGoodBrowsers = function (data) {
    transactionCompleted = true;
    data = JSON.parse(data);
    handlersMap['transactionHandler'](data);
    var showObj = {
        TxStatus: data.TxStatus,
        TxMsg: data.TxMsg,
        pgRespCode: data.pgRespCode
    };
    setTimeout(function () {
        parent.postMessage('closeWallet', '*');
    }, 6000);
};

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


const makeNetBankingPayment = validateAndCallbackify(netBankingValidationSchema, (confObj) => {
    const apiUrl = `${getConfig().motoApiUrl}/moto/authorize/struct/${getConfig().vanityUrl}`;
    return NBAPIFunc(confObj, apiUrl);
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

//------------------- makeBlazeNBPayment ----------------//

const makeBlazeNBPayment = validateAndCallbackify(netBankingValidationSchema, (confObj) => {
    const apiUrl = `${getConfig().motoApiUrl}/moto/authorize/struct/${getConfig().vanityUrl}`;
    return NBAPIFunc(confObj, apiUrl);
});


//------------------- makeSavedNBPayment ----------------//


const savedNBValidationSchema = Object.assign(cloneDeep(baseSchema), {
    token: {presence: true}
});

savedNBValidationSchema.mainObjectCheck.keysCheck.push('token');

const savedAPIFunc = (confObj, url) => {
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
        requestOrigin: "CJSW"
    });

    confObj.CVV && (reqConf.paymentToken.cvv = confObj.CVV);

    delete reqConf.currency;
    delete reqConf.token;
    delete reqConf.CVV; //will delete if present

    return custFetch(url, { //for Blazenet use `${getConfig().blazeNetApiUrl}/netbank/chksumtrans`
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        //mode: 'cors',
        body: JSON.stringify(reqConf)
    })
};

const makeSavedNBPayment = validateAndCallbackify(savedNBValidationSchema, (confObj)=>{
    const apiUrl = `${getConfig().motoApiUrl}/moto/authorize/struct/${getConfig().vanityUrl}`;
    return savedAPIFunc(confObj, apiUrl);
});

export {makeNetBankingPayment, makeSavedNBPayment, makeBlazeNBPayment, savedAPIFunc, savedNBValidationSchema}