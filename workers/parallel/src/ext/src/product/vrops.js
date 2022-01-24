

export const prodConfig = {
    ENABLE_RECORDING_PBC: 1,
    CHANGE_RECORDING_TARGET: 1,
    ENABLE_RECORDING_VROPS: 1,

    print: function() {
        console.log("vrops: prodConfig.print");
    },

    recordPBC: function() {
        console.log("vrops: recordPBC");
    },

    changeTarget: function(orig_target, message_type){
        return this._appendInfoOnTargetElement(orig_target, message_type);
    },

    _appendInfoOnTargetElement: function(target, type){
        let targetTemp = target;
        if(targetTemp.tagName.indexOf("DIV")>=0){
            if(targetTemp.getAttribute("id") === null && (type === 20)) {
                let tempBrotherInfo = this._getBrotherClassname(targetTemp);
                if (tempBrotherInfo) {
                    if (tempBrotherInfo.indexOf("vropsNavi") >= 0) {
                        targetTemp.setAttribute("brother",tempBrotherInfo);
                        targetTemp.setAttribute("parent","DIV");
                        targetTemp.setAttribute("child",targetTemp.innerText);
                    }
                }
            }
        } else if (targetTemp.tagName.indexOf("SPAN")>=0){
            if(targetTemp.getAttribute("id") === null && (type === 20)) {
                let parentNode = targetTemp.parentNode;
                let parent_TagName = parentNode.tagName;
                if(parent_TagName.indexOf("LI")>=0){
                    let tempBrotherInfo = this._getParentClassName(targetTemp);
                    if (tempBrotherInfo) {
                        if (tempBrotherInfo.indexOf("vropsEnvNavi") >= 0) {
                            targetTemp.setAttribute("brother",tempBrotherInfo);
                            targetTemp.setAttribute("parent","SPAN");
                            targetTemp.setAttribute("child",targetTemp.innerText);
                        }
                    }
                } else {
                    let tempBrotherInfo = this._getBrotherClassname(targetTemp);
                    if (tempBrotherInfo) {
                        if (tempBrotherInfo.indexOf("vropsNavi") >= 0) {
                            targetTemp.setAttribute("brother",tempBrotherInfo);
                            targetTemp.setAttribute("parent","SPAN");
                            targetTemp.setAttribute("child",targetTemp.innerText);
                        }
                    }
                }

            }
        } else if (targetTemp.tagName === "A"){
            if(targetTemp.getAttribute("id") === null && (type === 20)) {
                let tempBrotherInfo =this._getSelfInnerText_NotTranslate(targetTemp);
                if (tempBrotherInfo) {
                    if (tempBrotherInfo.indexOf("vropsSortA") >= 0) {
                        targetTemp.setAttribute("brother",tempBrotherInfo);
                    }
                }
            }
        }
        else if(targetTemp.tagName === "LI"){
            if(type === 20) {
                let tempItSelfInfo = this._getItSelf(targetTemp);
                if (tempItSelfInfo) {
                    if (tempItSelfInfo.indexOf("vropsEnvNavi") >= 0) {
                        targetTemp.setAttribute("brother",tempItSelfInfo);
                        targetTemp.setAttribute("parent","LI");
                        targetTemp.setAttribute("child",targetTemp.innerText);
                    }
                }
            }
        }
        return targetTemp;
    },

     _getBrotherClassname: function(element){
        let result;
        let element_Tag = element.tagName;
        let parentNode = element.parentNode; // x-grid-cell-inner-treecolumn
        let parentClassName_Mark = "x-grid-cell-inner-treecolumn";
        if(element_Tag.toLowerCase().indexOf("div") >= 0 && parentNode !== null) {
            let parentClassName = parentNode.className;
            if(parentClassName!= null && parentClassName.indexOf(parentClassName_Mark) >= 0) {
                let nextBrotherSibling = element.nextElementSibling;
                let nextBrotherSibling_ClassName = nextBrotherSibling.className;
                if(nextBrotherSibling_ClassName){
                    if(nextBrotherSibling_ClassName.indexOf("adpknd") || nextBrotherSibling_ClassName.indexOf("resknd")){
                        result = "vropsNavi" + nextBrotherSibling_ClassName;
                    }
                }
            }
        } else if(element_Tag.toLowerCase().indexOf("span") >= 0 && parentNode !== null) {
            let parentClassName = parentNode.className;
            if(parentClassName!= null && parentClassName.indexOf(parentClassName_Mark) >= 0) {
                let previousBrotherSibling = element.previousElementSibling;
                let previousBrotherSibling_ClassName = previousBrotherSibling.className;
                if(previousBrotherSibling_ClassName){
                    if(previousBrotherSibling_ClassName.indexOf("resknd")>=0){
                    result = "vropsNavi" + previousBrotherSibling_ClassName;
                    }
                }
            }
        }
        return result;
    },

     _getSelfInnerText_NotTranslate: function(element){
        let result;
        let element_Tag = element.tagName;
        let parentNode = element.parentNode;
        let parentClassName_Mark = "resknd";
        if(element_Tag === "A" && parentNode !== null) {
            let previousElementSibling = element.previousElementSibling;
            if (previousElementSibling){
                if(previousElementSibling.tagName === "IMG" && previousElementSibling.src.indexOf(parentClassName_Mark)>=0){
                    let innerText = element.innerText;
                    if(innerText){
                        result = "vropsSortA" + "|" + "link" +"|"+ innerText;
                    }
                }
            } else {
                let parentClassName = parentNode.className;
                if(parentClassName!= null && parentClassName.indexOf(parentClassName_Mark) >= 0){
                    let innerText = element.innerText;
                    if(innerText){
                        result = "vropsSortA" + "|" + parentClassName +"|"+ innerText;
                    }
                }
            }
        }
        return result;
    },

     _getParentClassName: function(element){
        let result;
        let element_Tag = element.tagName;
        let parentNode = element.parentNode;
        let element_InnerText = element.innerText;
        if(element_Tag.toLowerCase().indexOf("span") >= 0 && parentNode !== null && element_InnerText !== null) {
            let parentClassName = parentNode.className;
            if(parentClassName!= null && (parentClassName.indexOf(element_InnerText) >= 0 || parentClassName.indexOf("vC Ops Clusters-vCenter Operations")>=0)){
                result = "vropsEnvNavi" + parentClassName;
            }
        }
        return result;
    },

     _getItSelf: function(element){
        let result;
        let element_Tag = element.tagName;
        let element_ClassName = element.className;
        let element_InnerText = element.innerText;
        if(element_Tag ==="LI" && element_InnerText !== null) {
            if(element_ClassName != null && (element_ClassName.indexOf(element_InnerText) >= 0 || element_ClassName.indexOf("vC Ops Clusters-vCenter Operations")>=0)){
                result = "vropsEnvNavi" + element_ClassName;
            }
        }
        return result;
    },

     findElement_VROPS_AllObjectsLeftNavi: function(top_frame,request,brotherNodeClass,parentClass,childClass){
        let elt;
        let specificString = "end-";
        if(brotherNodeClass && parentClass){
            if(parentClass.indexOf("SPAN")>=0 || parentClass.indexOf("DIV")>=0){
                let selfClassName = removeSpecificStringInClassName(request.class,specificString);
                let brotherClassName = brotherNodeClass.substring(9);
                let brotherElement = top_frame.document.getElementsByClassName(brotherClassName);
                let targetElement;
                let brotherElement_Length = brotherElement.length;
                console.log("brotherElement_Length",brotherElement_Length);
                if(brotherElement_Length === 1) {
                    targetElement = brotherElement.item(0);
                    let parentNode = targetElement.parentNode;
                    let parent_Children = parentNode.childNodes;
                    parent_Children.forEach(function (element) {
                        if(removeSpecificStringInClassName(element.className,specificString).indexOf(selfClassName)>=0){
                            elt = element;
                        }
                    });
                } else if (brotherElement_Length > 1 && childClass){
                    console.log("brotherElement_Length > 1 && childClass",brotherElement_Length,childClass);
                    let tempElement
                    for (let i = 0 ; i< brotherElement_Length; i++){
                        tempElement = brotherElement.item(i);
                        let tempNextElementSibling = tempElement.nextElementSibling;
                        console.log("tempElement > 1 && tempNextElementSibling",tempElement,tempNextElementSibling);
                        if(tempNextElementSibling){
                            let tempNextElementSibling_innerHTML = tempNextElementSibling.innerHTML.trim();
                            console.log("tempNextElementSibling_innerHTML",tempNextElementSibling_innerHTML);
                            if(tempNextElementSibling_innerHTML){
                                console.log("tempNextElementSibling_innerHTML",tempNextElementSibling_innerHTML);
                                if(tempNextElementSibling_innerHTML.indexOf(childClass.trim()) >= 0){
                                    if(tempNextElementSibling_innerHTML.indexOf(childClass.trim()) === 0){
                                        elt = tempNextElementSibling;
                                        console.log("tempNextElementSibling",elt);
                                        break;
                                    } else {
                                        if (tempNextElementSibling_innerHTML.indexOf("vSAN Datastores") > 0){
                                        } else {
                                            elt = tempNextElementSibling;
                                            break;
                                        }
                                    }
                                } else if(tempNextElementSibling_innerHTML.indexOf("vRealize Operations Manager Adapter")>=0){
                                    elt = tempNextElementSibling;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        return elt;
    },

    findElement_VROPS_EnvNavi: function(top_frame,request,brotherNodeClass,parentClass,childClass){
        let elt;
        let brotherClassName = brotherNodeClass.substring(12).trim();
        let brotherElement = top_frame.document.getElementsByClassName(brotherClassName);
        let innerText = childClass;
        let tagName = parentClass;
        let tempElement;
        if(tagName === "LI"){
            tempElement = brotherElement.item(0);
            if(tempElement.className.indexOf(innerText)>=0 || tempElement.className.indexOf("vC Ops Clusters-vCenter Operations")>=0){
                elt = tempElement;
            }

        } else if(tagName === "SPAN"){
            for (let i = 0 ; i< brotherElement.length; i++){
                tempElement = brotherElement.item(i);
                if(tempElement.className.indexOf(innerText)>=0 || tempElement.className.indexOf("vC Ops Clusters-vCenter Operations")>=0){
                    elt = tempElement.firstElementChild;
                }
            }
        }
        return elt;
    },

    findElement_VROPS_SortA_NotTranslate: function(top_frame,request,brotherNodeClass,parentClass,childClass){
        let elt;
        let temp = brotherNodeClass.split("|");
        let parentClassName = temp[1];
        let innerText = temp[2];
        if(parentClassName === "link"){
            let elements = top_frame.document.getElementsByClassName(parentClassName);
            let element;
            for(let i=0 ; i< elements.length; i++){
                element = elements.item(i);
                if(element.tagName === "A" && element.innerText===innerText){
                    elt = element;
                }
            }
        } else {
            let parentElement = top_frame.document.getElementsByClassName(parentClassName);
            let parentElement_length  = parentElement.length ;
            if(parentElement_length > 0){
                let parentNode;
                let parent_Children;
                for(let i = 0; i < parentElement_length ;i++){
                    parentNode = parentElement.item(i);
                    parent_Children = parentNode.childNodes;
                    parent_Children.forEach(function (element) {
                        if(element.tagName === "A" && element.innerText===innerText){
                            elt = element;
                        }
                    });
                }
            }
        }
        return elt;
    },
};