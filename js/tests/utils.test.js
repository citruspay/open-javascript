var expect = require('chai').expect;
var rewire = require('rewire');
var utils = rewire('../utils');

describe('Test cases for utils',()=>{

    it('Test for custValidate',()=>{
    let obj = {'test':'abc',paymentDetails:{'token':null}};
    let obj1= {'test':'abc',paymentDetails:null};
    let obj2 = {'test':'abc',paymentDetails:{'token':null,'test':null}};
    let schema = {'test':{presence:true}};
    let schema1 = {'mainObjectCheck':{keysCheck:['paymentDetails','test']}};
    let schema2 = {'mainObjectCheck':{keysCheck:['test']}};
    let custValidate = utils.__get__('custValidate');
    //initValidators();
    expect(custValidate({},schema)).to.deep.equal({test:["can't be blank"]});
    
    expect(custValidate({test:null},schema)).to.deep.equal({test:["can't be blank"]});
    expect(custValidate({test:null},schema,{fullMessages:true})).to.deep.equal({test:["Test can't be blank"]});
    });

    it('Tests for enhanceWithValidation',()=>{

    });

});
