import {netbanking, makeSavedNBPayment} from './net-banking';
import {makeMotoCardPayment, makeSavedCardPayment} from './cards';
const makePayment = (paymentObj) => {
    
    const paymentMode = paymentObj.paymentDetails.paymentMode.toLowerCase().replace(/\s+/g, '');
    
    



};

export {makePayment};