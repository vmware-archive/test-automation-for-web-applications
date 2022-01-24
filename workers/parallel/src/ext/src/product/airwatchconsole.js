export const prodConfig = {
    ENABLE_RECORDING_SELECTION: 1,

    print: function() {
        console.log("vrops: prodConfig.print");
    },

    removeFocusOnSelect: function(element, request){
        let element_tagName = element.tagName;
        if(element_tagName.indexOf("SELECT") >=0){
            if(request.action == "20"){
                $(element).blur();
            }
        }
    }

};