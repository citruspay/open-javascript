import {custFetch} from '../interceptor';
import {getConfig} from '../config';
import  {setAppData} from './../utils';

const dynamicPricingFunction = (confObj) => {
    let dpAction;
    if (!confObj.ruleName && !confObj.alteredAmount.value) {
        dpAction = '/searchAndApplyRuleForPayment';
    }
    else if (!confObj.alteredAmount.value) {
        dpAction = '/calculatePricingForPayment';
    }
    else {
        dpAction = '/validateRuleForPayment';
    }

    return custFetch(`${getConfig().dpApiUrl}${dpAction}`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(confObj)
    }).then(function (resp) {
        if (resp.data.offerToken) {
            let dpOfferToken = resp.data.offerToken;
            setAppData(confObj.paymentInfo.paymentMode.toLowerCase(), { 'offerToken' : dpOfferToken });
        }
        return resp.data;
    });
};
export {dynamicPricingFunction};