const getCancelResponse = (obj) => {

    //function returns a sample response of cancel scenario

    /*
     {
     "merchantTxnId": "145456502",
     "amount": {
     "currency": "INR",
     "value": "1.00"
     },
     "userDetails": {
     "email": "prashant.gupta@citruspay.com",
     "firstName": "nagama",
     "lastName": "inamdar",
     "address": {
     "street1": "abcstree1",
     "street2": "abcstree2",
     "city": "abcstree2",
     "state": "MS",
     "country": "IND",
     "zip": "411038"
     },
     "mobileNo": "993494949"
     },
     "returnUrl": "https://stgjs.citruspay.com/blade/returnUrl",
     "notifyUrl": "https://salty-plateau-1529.herokuapp.com/notifyUrl.sandbox.php",
     "merchantAccessKey": "18IZE4MDYJTCKUCJ3N67",
     "requestSignature": "7ed68d66c1ee994e12980183762e70e3c46be2fe",
     "customParameters": {
     "productName": "123"
     },
     "requestOrigin": "CJSG",
     "paymentToken": {
     "type": "paymentOptionToken",
     "paymentMode": {
     "type": "credit",
     "number": "4111111111111111",
     "holder": "Test",
     "expiry": "12/2020",
     "cvv": "123",
     "scheme": "VISA"
     }
     }
     }
    * */
    const maskedCardNumber = (obj.paymentToken.paymentMode.number) ? maskedCard(6,11, obj.paymentToken.paymentMode.number) : "";
    return  {
        TxStatus : "CANCELED",
        TxId : obj.merchantTxnId,
        TxRefNo : "",
        pgTxnNo : "",
        pgRespCode: "3",
        TxMsg: "Transaction Cancelled By Customer",
        amount :  obj.amount.value,
        authIdCode :  "",
        issuerRefNo :  obj.paymentToken.paymentMode.code || "",
        signature :  "",
        transactionId :  "",
        paymentMode :  obj.paymentToken.paymentMode.type,
        TxGateway :  "",
        currency :  obj.amount.currency,
        maskedCardNumber : maskedCardNumber,
        cardType :  obj.paymentToken.paymentMode.scheme || "",
        encryptedCardNumber :  "",
        expiryMonth :  "",
        expiryYear :  "",
        cardHolderName :  obj.paymentToken.paymentMode.scheme.holder || "",
        txn3DSecure :  "",
        eci :  "",
        cardCode :  "",
        txnType :  "SALE",
        requestedCurrency :  "",
        requestedAmount :  "",
        dccCurrency :  "",
        dccAmount :  "",
        exchangeRate :  "",
        dccOfferId :  "",
        mcpCurrency :  "",
        mcpAmount :  "",
        offerExchangeRate :  "",
        firstName :  obj.firstName || "",
        lastName :  obj.lastName || "",
        email :  obj.email || "",
        addressStreet1 :  obj.userDetails.address.street1 || "",
        addressStreet2 :  obj.userDetails.address.street2 || "",
        addressCity :  obj.userDetails.address.city || "",
        addressState :  obj.userDetails.address.state || "",
        addressCountry :  obj.userDetails.address.country || "",
        addressZip :  obj.userDetails.address.zip || "",
        mobileNo :  obj.mobileNo || "",
        isCOD :  "",
        txnDateTime : "",
        impsMmid :  "",
        impsMobileNumber :  ""
    };

};

const maskedCard = (initial, end, card) => {
    const mask = "XXXXXX";
    return card.substring(0, initial) + mask + card.substring(end);
};

// //Formats d to MM/dd/yyyy HH:mm:ss format
// const formatDate  function formatDate(d){
//     function addZero(n){
//         return n < 10 ? '0' + n : '' + n;
//     }
//
//     return addZero(d.getMonth()+1)+"/"+ addZero(d.getDate()) + "/" + d.getFullYear() + " " +
//         addZero(d.getHours()) + ":" + addZero(d.getMinutes()) + ":" + addZero(d.getMinutes());
// }
//
// var str = 'Fri Jan 27 2012 08:01:00 GMT+0530 (India Standard Time)';
// var date = new Date(Date.parse(str));
// var formatted = formatDate(date);

export {getCancelResponse, maskedCard};