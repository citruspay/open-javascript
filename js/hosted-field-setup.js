import {
    getConfigValue,
    validHostedFieldTypes,
    validCardSetupTypes,
    specialStyleKeys
} from "./hosted-field-config";
import {setAppData, getElement,getAppData,getUid} from "./utils";
import {postMessageToChild, getCitrusFrameId,getCitrusFrameIdForSavedCard,postMessageToSavedCardFrame} from "./apis/hosted-field-payment";
import {makeSavedCardHostedFieldPayment} from './apis/hosted-field-payment';
import some from '../node_modules/lodash/some';
import {validateScheme} from "./validation/custom-validations";

//parent call
const create = (setUpConfig,callback) => {
    "use strict";
    let {
        hostedFields,
        setupType,
        style
    } = setUpConfig;
    if (validCardSetupTypes.indexOf(setupType) === -1)
        throw new Error(`invalid setupType "${setupType}", setupType should have one of these values ` + validCardSetupTypes); 
   let hostedFieldsCopy = hostedFields.map((hostedField)=>hostedField);
  
    for (var i = 0, length = hostedFieldsCopy.length; i < length; ++i) {
        let {
            fieldType
        } = hostedFieldsCopy[i];
        if (validHostedFieldTypes.indexOf(fieldType) !== -1) {
            let newUid = getNewUid(setupType);
            hostedFieldsCopy[i]._uid = newUid;
            //this condition is specific to hosted field with saved card
            if (hostedFieldsCopy[i].savedCardScheme)
                hostedFieldsCopy[i].savedCardScheme = validateScheme(hostedFieldsCopy[i].savedCardScheme, true);
            addIframe(hostedFieldsCopy[i], setupType, style, callback);
            setHostedFieldsInAppData(hostedFieldsCopy[i],setupType);
        } else {
            throw new Error(`invalid fieldType "${fieldType}", fieldType should have one of these values ` + validHostedFieldTypes);
        }
    }
    //setStyle(style,hostedFields,cardType);
};

//parent call
const setHostedFieldsInAppData=(hostedField,setupType)=>{
    var hostedFields = getAppData('hostedFields' + '-' + setupType);
    if(hostedFields)
    {
        hostedFields = hostedFields.filter((hostedFieldInternal)=>{
                return hostedField.selector !== hostedFieldInternal.selector;
        });
        hostedFields.push(hostedField)
    }else
    {
        hostedFields = [hostedField];
    }
    setAppData('hostedFields' + '-' + setupType, hostedFields);
};

//parent call
const getNewUid = (setupType)=>{
     //if(setupType==='savedCard'){
        var hostedFields = getAppData('hostedFields' + '-' + setupType);
        var newUid; 
        var isExistingId;
       do{

           newUid = getUid();
           isExistingId = some(hostedFields,(hostedField)=>{
                return hostedField._uid === newUid;
            });
       }while(isExistingId); 
   //}
   return newUid;
};


//parent call
const addIframe = (hostedField, cardType, style,callback) => {
    "use strict";
    if(cardType==="savedCard")
    {
        /*if(!hostedField.savedMaskedCardNumber){
            throw new Error(`savedMaskedCardNumber property is required in hostedField for setupType ${cardType}`);
        }*/
        if(!hostedField.savedCardScheme){
             console.warn(`savedCardScheme property is required in hostedField for setupType ${cardType}`);
        }
    }
    let {selector, fieldType} = hostedField;
    let element = getElement(selector);
    const iframe = document.createElement('iframe');
    var defaultStyle = {
        width: '100%',
        float: 'left',
        height: '100%',
        /*'marginBottom': '1em',
         'display': 'block',
         backgroundColor: 'transparent',*/
        border: 'none',
        /*outline: '0',
         fontSize: '16px',
         padding: 0,
         boxShadow: 'none',
         borderRadius: 0,
         position: 'relative'*/
    };
    //frameborder="0" allowtransparency="true" scrolling="no"
    iframe.setAttribute('frameborder', 0);
    iframe.setAttribute('allowtransparency', true);
    iframe.setAttribute('scrolling', 'no');
    //iframe.setAttribute('tabindex', '-1');
    Object.assign(iframe.style, defaultStyle);
    //todo: url needs to be configured
    iframe.src = getConfigValue('hostedFieldUrl') + '#' + fieldType + '-' + cardType;
    if(cardType!='savedCard')
    {
        iframe.id = getCitrusFrameId(fieldType, cardType);
        iframe.name = iframe.id;
    }else{
        iframe.id = getCitrusFrameIdForSavedCard(hostedField);
        iframe.name = iframe.id;
    }
    iframe.onload = () => {
        //console.log('inside iframe onload');
        passAttributesToHostedField(style, hostedField, cardType);
        let hostedFieldInstance = Object.create(Object.prototype,{makePayment:{
            value:makeSavedCardHostedFieldPayment(iframe.id),
            writable:false,
            configurable:false,
            enumerable:false
            }});
        if(callback)
            callback(hostedFieldInstance);   

    };
    //todo:check is it really doing anything otherwise remove it.
    iframe.onfocus = ()=> {
        //console.log('inside iframe onfocus');
        var inputElements = document.getElementsByTagName('input');
        if (inputElements && inputElements.length > 0)
            inputElements[0].focus();
    };
    
    if (element) {
        element.appendChild(iframe);
        element.className += ' citrus-hosted-field';
    }

};
//todo:rename to setStyle and other attributes
//parent call
const passAttributesToHostedField = (attributes, hostedField, cardType) => {

    let hostedFrameAttributes = {
        messageType: 'style'
    };
    let {selector, fieldType} = hostedField;
    if (attributes) {
        if (attributes[selector]) {
            hostedFrameAttributes.specificStyle = attributes[selector];
        }
        if (attributes['input']) {
            hostedFrameAttributes.commonStyle = attributes['input'];
        }
        for (var i = 0; i < specialStyleKeys.length; ++i) {
            var specialStyleKey = specialStyleKeys[i];
            hostedFrameAttributes['input' + specialStyleKey] = attributes[specialStyleKey] || attributes['input' + specialStyleKey];
            hostedFrameAttributes[selector + specialStyleKey] = attributes[specialStyleKey] || attributes[selector + specialStyleKey];
        }
    }
    hostedFrameAttributes.hostedField = hostedField;
    hostedFrameAttributes.cardType = cardType;
    //Object.assign(hostedFrameAttributes,attributes);
    if(cardType.toLowerCase()!=='savedcard')
    postMessageToChild(fieldType, cardType, hostedFrameAttributes, true);
    else
    postMessageToSavedCardFrame(hostedField,hostedFrameAttributes);

};

export {
    create
};