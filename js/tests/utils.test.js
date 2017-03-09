var expect = require('chai').expect;
var rewire = require('rewire');
var utils = rewire('../utils');
var sinon = require('sinon');

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
         let obj = {'test':'abc',paymentDetails:{'token':null}};
         let obj1 = {};
          let schema = {'test':{presence:true}};
        let enhanceWithValidation = utils.__get__('enhanceWithValidation');
        let callback = sinon.spy();
        let enhanceWithValidationResult = enhanceWithValidation(schema,callback);
        enhanceWithValidationResult(obj);
        sinon.assert.calledOnce(callback);
        sinon.assert.calledWithExactly(callback,obj);
        let callback1 = sinon.spy();
        let enhanceWithValidationResult1= enhanceWithValidation(schema,callback1);
        expect(function(){enhanceWithValidationResult(obj1);}).to.throw();
        sinon.assert.notCalled(callback1);
        console.log('reached ehere');
        //enhanceWithValidation(obj);
        //sinon.assert.calledOnce(callback);



    });

    it('Test for callbackify',(/*done*/)=>{
        /*let callbackify = utils.__get__('callBackify');
        let resolvedPromise = Promise.resolve('test');
        let rejectedPromise = Promise.reject('error');
        let promise = new Promise((resolve,reject)=>{

        });
        let stub = sinon.stub();
        let callback = sinon.spy();
       // stub.withArgs(callback).returns(resolvedPromise);
        stub.returns(resolvedPromise);
        //stub.withArgs(12).returns(rejectedPromise);
        let callbackifyResult = callbackify(stub);
        callbackifyResult(callback);
        sinon.assert.calledOnce(callback);
        done();*/
        //sinon.assert.calledWithExactly(callback,'test');
    });
    it('Test cases for isUrl',()=>{
        var isUrl = utils.isUrl;
        expect(isUrl('abc')).to.false;
        expect(isUrl('http://www.google.com')).to.true;
        expect(isUrl('https://www.google.com')).to.true;
        expect(isUrl('ftp://www.google.com')).to.true;
        expect(isUrl(undefined)).to.false;
    });

    it('Test cases for Trim',()=>{
        var trim = utils.trim;
        expect(trim(0)).to.equal(0);
        expect(trim(false)).to.equal.false;
        expect(trim(' false')).to.equal('false');
        expect(trim(' abc def xyz ')).to.equal('abcdefxyz');
    });

    it('Test case for convertToFloat',()=>{
        var convertToFloat = utils.convertToFloat;
        expect(convertToFloat(false)).to.be.false;
        expect(convertToFloat(0)).to.be.equal('0');
        expect(convertToFloat('abc')).to.be.equal('abc');
        expect(convertToFloat(10,2)).to.equal("10.00");
        expect(convertToFloat(NaN)).to.equal.NaN;
    });

});
