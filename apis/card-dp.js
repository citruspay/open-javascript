import cloneDeep from 'lodash/cloneDeep';
import {motoCardValidationSchema, motoCardApiFunc} from './cards';
import {validateCardType, validateScheme} from '../validation/custom-validations';
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
    originalAmount : { presence : true },
    cardNumber : {presence : true}
};

const dynamicPricing = validateAndCallbackify(dynamicPricingSchema, (confObj) => {

                         console.log(confObj);

                         }).then(function(resp){

                                 return resp;

                         });

export {dynamicPricing}