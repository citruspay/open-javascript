import checkCreditCard from '../../validation/credit-card-validation';
var expect = require('chai').expect;
describe('test',()=>{
    it('should return true for valid number and false otherwise',()=>{
        expect(checkCreditCard('4111111111111111')).to.true;
        expect(checkCreditCard('4444444444444444')).to.false;
    });
});