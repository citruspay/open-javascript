var expect = require('chai').expect;
import {keysCheck,validateExpiryDate,cardDate,validateScheme,validateCardType,validateCvv,
    isValidCvv,isValidExpiry,cardCheck,blazeCardCheck,custFormat,validateCreditCard} from '../../validation/custom-validations';
import {initValidators} from '../../config';
import {validate} from "validate.js";
import {setAppData} from '../../utils.js'

describe('Tests for custom-validations',function(){
    let obj = {'test':'abc',paymentDetails:{'token':null}};
    let obj1= {'test':'abc',paymentDetails:null};
    let obj2 = {'test':'abc',paymentDetails:{'token':null,'test':null}};
    let schema = {'paymentDetails':{keysCheck:['token']}};
    let schema1 = {'mainObjectCheck':{keysCheck:['paymentDetails','test']}};
    let schema2 = {'mainObjectCheck':{keysCheck:['test']}};
    initValidators();
    it('keysCheck should return undefined or null if key exist',function(){
        expect(validate(obj,schema)).to.not.exist;
        expect(validate(obj1,schema)).to.not.exist;
    });

    it('should return error message for any extra keys',function(){
        expect(validate(obj2,schema)).to.deep.equal({paymentDetails:["Payment details 'test' key is not allowed in the config"]});
    });

    it('should test top level properties when property name is mainObjectCheck',function(){
        expect(validate(obj,schema1)).to.not.exist;
        expect(validate(obj,schema2)).to.deep.equal({mainObjectCheck:["Main object check 'paymentDetails' key is not allowed in the config"]});
    });

    it('should return false for falsy date',function(){
        expect(validateExpiryDate()).to.be.false;
    });
    it('should return true for true date',function(){
        expect(validateExpiryDate('12/20')).to.be.true;
        expect(validateExpiryDate('12/2020')).to.be.true;
    });
    it('should return false for date of the past',function(){
        expect(validateExpiryDate('12/16')).to.be.false;
        expect(validateExpiryDate('12/2016')).to.be.false;
    });
    it('should return the date as it is valid',function(){
        expect(cardDate('12/17')).to.be.equal('12/17');
        expect(cardDate('12/2017')).to.be.equal('12/2017');
    });
    it('should throw error for empty date',function(){
        //expect(cardDate()).to.throw(null,'Expiry date can not be blank.');
    });

    it('should return false for invalid schemes',function(){
        expect(validateScheme('abcdefs')).to.be.false;
    });
    it('should return scheme in normalized form',function(){
        expect(validateScheme('amex')).to.equal('AMEX');
        expect(validateScheme('amex',true)).to.equal('AmEx');
        //VisaElectron
        expect(validateScheme('VisaElectron')).to.equal('VisaElectron');
        expect(validateScheme('VisaElectron',true)).to.equal('VisaElectron');
        
    });

    it('should return false if cardType is not valid',function(){
        expect(validateCardType('abcdef')).to.be.false;
        expect(validateCardType()).to.be.false;
    });
    it('should return cardType in lower case if found',function(){
        expect(validateCardType('CreditCard')).to.be.equal('credit');
        expect(validateCardType('Credit')).to.be.equal('credit');
    });
    it('should give value back if scheme and cvv length match',function(){
        expect(validateCvv('1234','amex')).to.equal('1234');
        expect(validateCvv('123','visa')).to.equal('123');
    });
    it('should throw error if cvv is empty');//validateCvv or invalid length
    it('should validate length and scheme',function(){
        expect(isValidCvv(4,'amex')).to.true;
        expect(isValidCvv(3,'amex')).to.false;
        expect(isValidCvv(0,)).to.true;
        expect(isValidCvv(2,)).to.false;
        expect(isValidCvv(3,)).to.true;
        expect(isValidCvv(4,)).to.true;
        expect(isValidCvv(3,'visa')).to.true;
        expect(isValidCvv(4,'visa')).to.false;
        expect(isValidCvv(0,'maestro')).to.true;
        expect(isValidCvv(3,'maestro')).to.true;
        expect(isValidCvv(4,'maestro')).to.false;
        expect(isValidCvv(3,'abc')).to.true;
    });

    it('should validate expiry and scheme combo',function(){
        expect(isValidExpiry('11/17','abc')).to.true;
        expect(isValidExpiry('11/2017','abc')).to.true;
        
        expect(isValidExpiry(null,'maestro')).to.true;
        expect(isValidExpiry('11/16','maestro')).to.false;
        expect(isValidExpiry('11/2016','maestro')).to.false;
        expect(isValidExpiry(null,'visa')).to.false;
        expect(isValidExpiry('11/2017','visa')).to.true;
        expect(isValidExpiry('11/16','visa')).to.false;
    });

    it('should validate card details',function(){
        expect(cardCheck({},true)).to.equal(' :invalid card type');
        expect(cardCheck({type:'credit'},true)).to.equal( ':card number can not be blank.');
        const pgSettingsData = {  
   "creditCard":[  
     // "VISA",
      "MCRD",
      "DINERS"
   ],
   "debitCard":[  
      "VISA",
      "MCRD",
      "MTRO",
      "RPAY"
   ],
   "netBanking":[  
      {  
         "bankName":"Andhra Bank",
         "issuerCode":"CID016"
      },
      {  
         "bankName":"AXIS Bank",
         "issuerCode":"CID002"
      },
      {  
         "bankName":"Bank of Baroda",
         "issuerCode":"CID046"
      },
      {  
         "bankName":"Bank of India",
         "issuerCode":"CID019"
      },
      {  
         "bankName":"Bank of Maharashtra",
         "issuerCode":"CID021"
      },
      {  
         "bankName":"Catholic Syrian Bank",
         "issuerCode":"CID045"
      },
      {  
         "bankName":"Central Bank of India",
         "issuerCode":"CID023"
      },
      {  
         "bankName":"Citibank",
         "issuerCode":"CID003"
      },
      {  
         "bankName":"City Union Bank",
         "issuerCode":"CID024"
      },
      {  
         "bankName":"Corporation Bank",
         "issuerCode":"CID025"
      },
      {  
         "bankName":"DCB Bank Personal",
         "issuerCode":"CID026"
      },
      {  
         "bankName":"Deutsche Bank",
         "issuerCode":"CID006"
      },
      {  
         "bankName":"Federal Bank",
         "issuerCode":"CID009"
      },
      {  
         "bankName":"HDFC Bank",
         "issuerCode":"CID010"
      },
      {  
         "bankName":"ICICI Bank",
         "issuerCode":"CID001"
      },
      {  
         "bankName":"ICICI Corporate Bank",
         "issuerCode":"CID050"
      },
      {  
         "bankName":"IDBI Bank",
         "issuerCode":"CID011"
      },
      {  
         "bankName":"Indian Bank",
         "issuerCode":"CID008"
      },
      {  
         "bankName":"Indian Overseas Bank",
         "issuerCode":"CID027"
      },
      {  
         "bankName":"IndusInd Bank",
         "issuerCode":"CID028"
      },
      {  
         "bankName":"ING Vysya Bank (now Kotak)",
         "issuerCode":"CID029"
      },
      {  
         "bankName":"Kotak Mahindra Bank",
         "issuerCode":"CID033"
      },
      {  
         "bankName":"Punjab National Bank Retail Accounts",
         "issuerCode":"CID044"
      },
      {  
         "bankName":"SBI Bank",
         "issuerCode":"CID005"
      },
      {  
         "bankName":"State Bank of Bikaner and Jaipur",
         "issuerCode":"CID013"
      },
      {  
         "bankName":"State Bank of Hyderabad",
         "issuerCode":"CID012"
      },
      {  
         "bankName":"State Bank of Mysore",
         "issuerCode":"CID014"
      },
      {  
         "bankName":"State Bank of Travancore",
         "issuerCode":"CID015"
      },
      {  
         "bankName":"UCO Bank",
         "issuerCode":"CID070"
      },
      {  
         "bankName":"Union Bank",
         "issuerCode":"CID007"
      },
      {  
         "bankName":"United Bank of India",
         "issuerCode":"CID041"
      },
      {  
         "bankName":"Vijaya Bank",
         "issuerCode":"CID042"
      }
   ],
   "prepaid":false,
   "lazyPayEnabled":false,
   "mcpEnabled":false
};
        setAppData('pgSettingsData',pgSettingsData);
        expect(cardCheck({type:'debit',number:'4444444444444444'},true)).to.equal(' :invalid credit card number');
        expect(cardCheck({type:'credit',number:'4111111111111111'},true)).to.equal(':cardscheme is not supported');
        expect(cardCheck({type:'debit',number:'4111111111111111'},true)).to.undefined;
        expect(cardCheck({type:'debit',number:'0000000000000000'},true)).to.equal(' :invalid scheme type');

    });

    it('does the card check for blazecard',function(){
        expect(blazeCardCheck({})).to.undefined;
        expect(blazeCardCheck({cardType:'debit',cardScheme:'abc'},true)).to.equal(' :invalid scheme type');
        expect(blazeCardCheck({cardType:'debit',cardScheme:'visa',cardNo:'4444444444444444'},true)).to.equal(' :invalid credit card number');
        expect(blazeCardCheck({cardType:'abc',cardScheme:'abc',cardNo:'0000000000000000'},true)).to.equal(' :invalid card type');
        expect(blazeCardCheck({cardType:'credit',cardScheme:'abc',cardNo:'0000000000000000'},true)).to.not.equal(' :invalid card type');
        expect(blazeCardCheck({cardType:'creditCard',cardScheme:'abc',cardNo:'0000000000000000'},true)).to.not.equal(' :invalid card type');
        expect(blazeCardCheck({cardType:'debit',cardScheme:'abc',cardNo:'0000000000000000'},true)).to.not.equal(' :invalid card type');
        expect(blazeCardCheck({cardType:'debitCard',cardScheme:'abc',cardNo:'0000000000000000'},true)).to.not.equal(' :invalid card type');
    });

    it('does check the string for pattern match',()=>{
        let obj1 = {test:'abc'};
        let obj2 = {test:123};
        let schema = {'test':{custFormat:{pattern:/^def$/}}};
        let schemaWithMessage = {'test':{custFormat:{pattern:/^def$/,message:'pattern does not match'}}};
        expect(validate(null,schema)).to.undefined;
        expect(validate({test:null},schema)).to.undefined;
        expect(validate(obj1,schema)).to.deep.equal({test:["Test is invalid"]});
        expect(validate(obj1,schemaWithMessage)).to.deep.equal({test:['Test pattern does not match']});
        expect(validate(obj2,schema)).to.deep.equal({test:["Test is invalid"]});
        expect(validate(obj2,schemaWithMessage)).to.deep.equal({test:['Test pattern does not match']});
    });

    it('check validateCreditCard function',()=>{
        expect(validateCreditCard('4111111111111111','visa')).to.true;
        //expect(validateCreditCard('4111111111111111','abc')).to.false;
        expect(validateCreditCard('4444444444444444','visa')).to.false;
    });

});