import cloneDeep from 'lodash/cloneDeep';
import {motoCardValidationSchema, motoCardApiFunc} from './cards';
import {validateCardType, validateScheme} from '../validation/custom-validations';
import {validateAndCallbackify, schemeFromNumber} from './../utils';
import {custFetch} from '../interceptor';
import {getConfig} from '../config';

let DPData;

const dynamicPricingFunction = (confObj) => {

    let dpAction;
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
        },
        extraParams : {
            deviceType : `${getConfig().deviceType}`
        }
    });
    reqConf.paymentInfo.cardType = schemeFromNumber(confObj.cardNo);
    delete reqConf.cardNo;
    delete reqConf.currency;
    delete reqConf.paymentMode;

    if(!reqConf.ruleName && !reqConf.alteredAmount.value)
    {
        dpAction = '/searchAndApplyRuleForPayment';
    }
    else if (!reqConf.alteredAmount.value) {
        dpAction = '/calculatePricingForPayment';
    }
    else{
        dpAction = '/validateRuleForPayment';
    }

    return custFetch(`${getConfig().dpApiUrl}${dpAction}`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(reqConf)
    }).then(function(resp){
        DPData = resp.data;
        return resp.data;
    });

};