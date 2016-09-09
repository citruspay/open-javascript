import {getConfigValue,validHostedFieldTypes} from './ui-config'
const uiSetup = (setUpConfig)=>{
    "use strict";
    let {hostedFields} = setUpConfig;
    for(var i=0,length=hostedFields.length;i<length;++i){
        let {fieldType,identifier} = hostedFields[i];
        if(validHostedFieldTypes.indexOf(fieldType)!==-1){
            createField(identifier,fieldType);
        }
    }
};


const createField=(identifier,type)=>{
    "use strict";
    const invalidIdentifierMessage = `invalid identifier for field type ${type}, it should be of the form of #id or .cssClass`;
    const iframe = document.createElement('iframe');
    iframe.style.display = "block";
    //todo: url needs to be configured
    iframe.src = getConfigValue()+'#'+type;
    iframe.id = "citrus"+type;
    if(!identifier||identifier.length<=1)
        throw new Error(invalidIdentifierMessage);
    const identifierName = identifier.slice(1);
    if(identifier.indexOf('#')===0)
        document.getElementById(identifierName).appendChild(iframe);
    else if(identifier.indexOf('.')==0)
        document.getElementsByClassName(identifierName)[0].appendChild(iframe);
    else throw new Error(invalidIdentifierMessage);
}

export {uiSetup};