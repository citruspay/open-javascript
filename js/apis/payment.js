import {handlersMap} from "../config";
import {setAppData} from "./../utils";
import {makeNetBankingPayment} from "./net-banking";
import {makeHostedFieldPayment} from "./hosted-field-payment"

const makePayment = (paymentObj) => {
    switch (paymentObj.paymentDetails.paymentMode.toLowerCase()) {
        //todo : needs to be checked for PCI compliant merchants
        case "card" :
            makeHostedFieldPayment(paymentObj);
            break;
        case "netbanking" :
            setAppData('paymentObj', paymentObj);
            makeNetBankingPayment(paymentObj);
            break;
        //todo: message needs to be structured
        default :
            handlersMap['errorHandler']("Invalid payment mode");
            return;
    }
};

export {
    makePayment
};