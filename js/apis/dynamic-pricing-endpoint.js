import {applyNbDynamicPricing} from './net-banking-dp';
import {applyDynamicPricing as applyCardDynamicPricing} from './card-dp';
import {applyWallletDynamicPricing} from './wallet-dp';


const getDynamicPriceToken = (dpData)=>{
    var dpPaymentMode, dpDataWithPaymentMode;
    switch(dpData.paymentMode){
        case "credit":
        case "debit":
        dpPaymentMode = dpData.paymentMode==="debit"?"DEBIT_CARD":"CREDIT_CARD";
        dpDataWithPaymentMode = Object.assign({},dpData,{paymentMode:dpPaymentMode});
        return applyCardDynamicPricing(dpDataWithPaymentMode);
        case "savedCard":
        case "savedNetBanking":
        dpPaymentMode = "CITRUS_WALLET";
        dpDataWithPaymentMode = Object.assign({},dpData,{paymentMode:dpPaymentMode});
        return applyWallletDynamicPricing(dpDataWithPaymentMode);
        case "netBanking":
        dpPaymentMode = "NET_BANKING";
        dpDataWithPaymentMode = Object.assign({},dpData,{paymentMode:dpPaymentMode});
        return applyNbDynamicPricing(dpDataWithPaymentMode);
        default:
        return Promise.resolve({resultMessage:"Invalid payment mode."});

    }
};

export {getDynamicPriceToken};