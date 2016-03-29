import cloneDeep from 'lodash/cloneDeep';
import {motoCardValidationSchema, motoCardApiFunc} from './cards';
import {validateCardType, validateScheme} from '../validation/custom-validations';
import {validateAndCallbackify, schemeFromNumber} from './../utils';
import {custFetch} from '../interceptor';
/*


 {
 "ruleName" : "TEST2",
 "email" : "test",
 "phone" : "020234234234",
 "merchantTransactionId" : "2424124",
 "merchantAccessKey" : "5VHM1C4CEUSLOEPO8PH2",
 "signature" : "fe3caad9d8877340eb5cccf4d7701482cfff556d",
 "originalAmount" : {
 "value" : 20.12, "currency" : "INR"
 },
 "alteredAmount" : {
 "value" : 9.12, "currency" : "INR"
 },
 "paymentInfo":{
 "cardNo" : "242344",
 "cardType" : "VISA",
 "issuerId" : "CID010",
 "paymentMode" : "NET_BANKING",
 "paymentToken" : "3423DF3SD4DF4DF4DF4D4F4D"
 },
 "extraParams":{
 "param1" : "value1",
 "param2" : "value2"
 }
 }


 */
const dynamicPricingSchema = {
    email: { presence : true, email : true },
    phone : { length: { maximum : 10 } },
    originalAmount: { presence : true },
    currency: { presence : true },
    cardNo: { presence : true },
    signature : { presence : true }
};

const applyDynamicPricing = validateAndCallbackify(dynamicPricingSchema, (confObj) => {
    const reqConf = Object.assign({}, confObj, {
        originalAmount: {
            value: confObj.originalAmount, currency : confObj.currency
        },
        alteredAmount : {
            value: confObj.alteredAmount, currency : confObj.currency
        },
        paymentInfo : {
            cardNo : confObj.cardNo,
            issuerId : confObj.issuerId,
            paymentMode : confObj.paymentMode,
            paymentToken : confObj.paymentToken
        }
    });
    reqConf.paymentInfo.cardType = schemeFromNumber(confObj.cardNo);
    delete reqConf.cardNo;
    delete reqConf.currency;
    delete reqConf.paymentMode;
    /*
     {
     "ruleName": "NbOffer",
     "email": "sumittest@mailinator.com",
     "phone": "9876543210",
     "merchantTransactionId": "145916641089568",
     "merchantAccessKey": "26FP5J2YIH2WELONI1M6",
     "signature": "87c1d1899037a1ba21a4efba28b0237f32fa7626",
     "originalAmount": {
     "value": "10.00",
     "currency": "INR"
     },
     "alteredAmount": {
     "value": "9.00",
     "currency": "INR"
     },
     "paymentInfo": {
     "cardNo": "4111111111111111",
     "cardType": "VISA",
     "issuerId": "",
     "paymentMode": "DEBIT_CARD",
     "paymentToken": ""
     },
     "extraParams": {
     "deviceType": "DESKTOP"
     }
     }
     * */
    return custFetch('https://sandboxmars.citruspay.com/dynamic-pricing/dynamicpricing/validateRuleForPayment', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(reqConf)

    });
});

export {applyDynamicPricing}