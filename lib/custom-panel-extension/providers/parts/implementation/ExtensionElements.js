'use strict';

var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;

var domQuery = require('min-dom/lib/query'),
    domClosest = require('min-dom/lib/closest'),
    domify = require('min-dom/lib/domify'),
    forEach = require('lodash/collection/forEach');

var elementHelper = require('bpmn-js-properties-panel/lib/helper/ElementHelper'),
    cmdHelper = require('bpmn-js-properties-panel/lib/helper/CmdHelper'),
    utils = require('bpmn-js-properties-panel/lib/Utils');

function getSelectBox(node, id) {
    var currentTab = domClosest(node, 'div.bpp-properties-tab');
    var query = 'select[name=selectedExtensionElement]' + (id ? '[id=cam-extensionElements-' + id + ']' : '');
    return domQuery(query, currentTab);
}

function getSelected(node, id) {
    var selectBox = getSelectBox(node, id);
    return {
        value: (selectBox || {}).value,
        idx: (selectBox || {}).selectedIndex
    };
}

function generateElementId(prefix) {
    prefix = prefix + '_';
    return utils.nextId(prefix);
}

var CREATE_EXTENSION_ELEMENT_ACTION = 'create-extension-element',
    REMOVE_EXTENSION_ELEMENT_ACTION = 'remove-extension-element';

module.exports = function (element, bpmnFactory, options) {

    var id = options.id,
        prefix = options.prefix || 'elem',
        label = options.label || id,
        idGeneration = (options.idGeneration === false) ? options.idGeneration : true;

    var modelProperty = options.modelProperty || 'id';

    var getElements = options.getExtensionElements;

    var hideControls = options.hideControls;

    var createElement = options.createExtensionElement,
        canCreate = typeof createElement === 'function';

    var removeElement = options.removeExtensionElement,
        canRemove = typeof removeElement === 'function';

    var onSelectionChange = options.onSelectionChange;

    var hideElements = options.hideExtensionElements,
        canBeHidden = typeof hideElements === 'function';

    var setOptionLabelValue = options.setOptionLabelValue;

    var defaultSize = options.size || 5,
        resizable = options.resizable;

    var selectionChanged = function (element, node, event, scope) {
        if (typeof onSelectionChange === 'function') {
            return onSelectionChange(element, node, event, scope);
        }
    };

    var createOption = function (value) {
        return '<option value="' + value + '" data-value data-name="extensionElementValue">' + value + '</option>';
    };

    var initSelectionSize = function (selectBox, optionsLength) {
        if (resizable) {
            selectBox.size = optionsLength > defaultSize ? optionsLength : defaultSize;
        }
    };

    var cannotProceed = function(){
      if(typeof hideControls === 'function'){
          return hideControls();
      }
    };

    return {
        id: id,
        html: '<div class="bpp-row bpp-element-list" ' +
        (canBeHidden ? 'data-show="hideElements"' : '') + '>' +
        '<label for="cam-extensionElements-' + id + '">' + label + '</label>' +
        '<div class="bpp-field-wrapper">' +
        '<select id="cam-extensionElements-' + id + '"' +
        'name="selectedExtensionElement" ' +
        'size="' + defaultSize + '" ' +
        'data-list-entry-container ' +
        'data-on-change="selectElement">' +
        '</select>' +
        (canCreate ? '<button class="add" ' +
            'id="cam-extensionElements-create-' + id + '" ' +
            'data-action="createElement">' +
            '<span>+</span>' +
            '</button>' : '') +
        (canRemove ? '<button class="clear" ' +
            'id="cam-extensionElements-remove-' + id + '" ' +
            'data-action="removeElement" ' +
            'data-disable="disableRemove">' +
            '<span>-</span>' +
            '</button>' : '') +
        (canCreate ? '<button class="edit" ' +
            'id="cam-extensionElements-edit-' + id + '" ' +
            'data-action="editForm"> ' +
            '<span>Edit Form</span>': '') +
            '</button>' +
        '</div>' +
        '</div>',

        get: function (element, node) {
            var elements = getElements(element);

            var result = [];
            forEach(elements, function (elem) {
                result.push({
                    extensionElementValue: elem.get(modelProperty)
                });
            });

            var selectBox = getSelectBox(node.parentNode, id);
            initSelectionSize(selectBox, result.length);

            return result;
        },

        set: function (element, values, node) {
            var action = this.__action;
            delete this.__action;

            var bo = getBusinessObject(element);
            var extensionElements = bo.get('extensionElements');

            if (action.id === CREATE_EXTENSION_ELEMENT_ACTION) {
                var commands = [];
                if (!extensionElements) {
                    extensionElements = elementHelper.createElement('bpmn:ExtensionElements', {values: []}, bo, bpmnFactory);
                    commands.push(cmdHelper.updateProperties(element, {extensionElements: extensionElements}));
                }
                commands.push(createElement(element, extensionElements, action.value));
                return commands;

            }
            else if (action.id === REMOVE_EXTENSION_ELEMENT_ACTION) {
                return removeElement(element, extensionElements, action.value, action.idx);
            }

        },

        createListEntryTemplate: function (value, index, selectBox) {
            initSelectionSize(selectBox, selectBox.options.length + 1);
            return createOption(value.extensionElementValue);
        },

        deselect: function (element, node) {
            var selectBox = getSelectBox(node, id);
            selectBox.selectedIndex = -1;
        },

        getSelected: function (element, node) {
            return getSelected(node, id);
        },

        setControlValue: function (element, node, option, property, value, idx) {
            node.value = value;

            if (!setOptionLabelValue) {
                node.text = value;
            }
            else {
                setOptionLabelValue(element, node, option, property, value, idx);
            }
        },

        createElement: function (element, node) {
            if (cannotProceed()){
                console.log('Cannot create fields');
                return;
            }

            // create option template
            var generatedId;
            if (idGeneration) {
                generatedId = generateElementId(prefix);
            }

            var selectBox = getSelectBox(node, id);
            var template = domify(createOption(generatedId));

            // add new empty option as last child element
            selectBox.appendChild(template);

            // select last child element
            selectBox.lastChild.selected = 'selected';
            selectionChanged(element, node);

            // update select box size
            initSelectionSize(selectBox, selectBox.options.length);

            this.__action = {
                id: CREATE_EXTENSION_ELEMENT_ACTION,
                value: generatedId
            };

            return true;
        },

        removeElement: function (element, node) {
            if (cannotProceed()){
                console.log('Cannot remove fields');
                return;
            }

            var selection = getSelected(node, id);

            var selectBox = getSelectBox(node, id);
            selectBox.removeChild(selectBox.options[selection.idx]);

            // update select box size
            initSelectionSize(selectBox, selectBox.options.length);

            this.__action = {
                id: REMOVE_EXTENSION_ELEMENT_ACTION,
                value: selection.value,
                idx: selection.idx
            };

            return true;
        },

        editForm: function (element, node) {
            if (cannotProceed()){
                console.log('Cannot edit form');
                return;
            }

            var taskId = document.getElementById('camunda-id').value;
            console.log(taskId);
            window.dgrControls.loadLayoutDesigner(taskId);
        },

        hideElements: function (element, entryNode, node, scopeNode) {
            return !hideElements(element, entryNode, node, scopeNode);
        },

        disableRemove: function (element, entryNode, node, scopeNode) {
            return (getSelected(entryNode, id) || {}).idx < 0;
        },

        selectElement: selectionChanged
    };

};
