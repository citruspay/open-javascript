import {getConfigValue,validHostedFieldTypes, validCardSetupTypes} from './ui-config'
const uiSetup = (setUpConfig)=>{
    "use strict";
    let {hostedFields,cardType} = setUpConfig;
    if(validCardSetupTypes.indexOf(cardType) ===-1)
        throw new Error( `invalid cardType "${cardType}", cardType should have one of these values `+validCardSetupTypes);
    for(var i=0,length=hostedFields.length;i<length;++i){
        let {fieldType,identifier} = hostedFields[i];
        if(validHostedFieldTypes.indexOf(fieldType)!==-1){
            appendIframe(identifier,fieldType,cardType.toLowerCase());
        }
        else{
            throw new Error( `invalid fieldType "${fieldType}", fieldType should have one of these values `+validHostedFieldTypes);
        }
    }
};


const appendIframe=(identifier,type,cardType)=>{
    "use strict";
    const invalidIdentifierMessage = `invalid identifier for field type "${type}", it should be of the form of #id or .cssClass`;
    const iframe = document.createElement('iframe');
   var defaultStyle ={
    width: '100%',
    float: 'left',
    height: '52px',
    'marginBottom': '1em',
    'display': 'block',
    backgroundColor: 'transparent',
    border: 'none',
    outline: '0',
    fontSize: '16px',
    padding: 0,
    boxShadow: 'none',
    borderRadius: 0,
    position: 'relative'
   };
    //frameborder="0" allowtransparency="true" scrolling="no"
   iframe.setAttribute('frameborder',0);
    iframe.setAttribute('allowtransparency',true);
    iframe.setAttribute('scrolling','no');
   Object.assign(iframe.style,defaultStyle);
    //todo: url needs to be configured
    iframe.src = getConfigValue('hostedFieldUrl')+'#'+type+'-'+ cardType;
    iframe.id = "citrus"+type+ "-" + cardType;
    if(!identifier||identifier.length<=1)
        throw new Error(invalidIdentifierMessage);
    const identifierName = identifier.slice(1);
    if(identifier.indexOf('#')===0)
        document.getElementById(identifierName).appendChild(iframe);
    else if(identifier.indexOf('.')==0)
        document.getElementsByClassName(identifierName)[0].appendChild(iframe);
    else throw new Error(invalidIdentifierMessage);
};
export {uiSetup};