/**
 * Created by lukaj on 07/11/2016.
 */

'use strict';

var cmdHelper = require('bpmn-js-properties-panel/lib/helper/CmdHelper');

var domQuery = require('min-dom/lib/query'),
    domAttr = require('min-dom/lib/attr'),
    domClosest = require('min-dom/lib/closest');

var filter = require('lodash/collection/filter'),
    forEach = require('lodash/collection/forEach'),
    keys = require('lodash/object/keys');

var domify = require('min-dom/lib/domify');

var TABLE_ROW_DIV_SNIPPET = '<div class="bpp-field-wrapper bpp-table-row">';
var DELETE_ROW_BUTTON_SNIPPET = '<button class="clear" data-action="deleteElement">' +
    '<span>X</span>' +
    '</button>';

function createInputRowTemplate(value, properties, canRemove, dataObjects) {
    var template = TABLE_ROW_DIV_SNIPPET;
    template += createInputTemplate(value, properties, canRemove, dataObjects);
    template += '</div>';

    return template;
}

function createInputTemplate(value, properties, canRemove, dataObjects) {
    //<camunda:property name="id_product_service" value="id_contractor" />
    // => {name: "id_product_service", value: "id_contractor"}
    // value = {name: "id_product_service", value: "id_contractor"}
    // properties = ["name", "value"]


    var columns = properties.length;
    var template = '';

    //set name
    template += '<div class="bpp-field-wrapper bpp-table-row">';
    template += '<label class="bpp-table-row-columns-1">' + value.name + '</label>';
    template += '<input type="hidden" value="'+ value.name +'" name="name"/>';
    template += '</div>';

    //set value
    if(dataObjects){
        //build select to choose data object

        template += '<select id="camunda-table-row-cell-input-value" name="value" data-value>';
        template += '<option value="">--</option>' ;

        for(var i=0; i< dataObjects.length; i++){
            var doName = dataObjects[i].name;
            template += '<option value="' + doName+ '" disabled>' + doName + '</option>' ;

            var istanze = dataObjects[i].instances;
            if(istanze && istanze !== null) {
                for (var j = 0; j < istanze.length; j++) {
                    template += '<option value="' + istanze[j]+ '" disabled> &nbsp;&nbsp;&nbsp;&nbsp;' + istanze[j] + '</option>' ;

                    for(var k=0; k < dataObjects[i].fields.length; k++){
                        template += '<option value="'+ istanze[j]+'.' +dataObjects[i].fields[k].fieldName
                            +'" >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +  dataObjects[i].fields[k].fieldName + '</option>' ;
                    }
                }
            }
        }
        template +=  '</select>';
    }else{
        template += '<div class="bpp-field-wrapper bpp-table-row">';
        template += '<input class="bpp-table-row-columns-1"' +
            'id="camunda-table-row-cell-input-value" ' +
            'type="text" ' +
            'name="value" data-value />';
        template += '</div>';
    }

    return template;
}

function createLabelRowTemplate(labels) {
    var template = '<div class="bpp-field-wrapper bpp-table-row">';
    template += '<label class="bpp-table-row-columns-1">' + 'Campi per regola' + '</label>';
    template += '</div>';

    return template;
}

function createLabelTemplate(labels) {
    var columns = labels.length;
    var template = '';
    forEach(labels, function(label) {
        template += '<label class="bpp-table-row-columns-' + columns + '">' + label + '</label>';
    });
    return template;
}

function pick(elements, properties) {
    return (elements || []).map(function(elem) {
        var newElement = {};
        forEach(properties, function(prop) {
            newElement[prop] = elem[prop] || '';
        });
        return newElement;
    });
}

function diff(element, node, values, oldValues, editable) {
    return filter(values, function(value, idx) {
        return !valueEqual(element, node, value, oldValues[idx], editable, idx);
    });
}

function valueEqual(element, node, value, oldValue, editable, idx) {
    if (value && !oldValue) {
        return false;
    }
    var allKeys = keys(value).concat(keys(oldValue));

    return allKeys.every(function(key) {
        var n = value[key] || undefined;
        var o = oldValue[key] || undefined;
        return !editable(element, node, key, idx) || n === o;
    });
}

function getEntryNode(node) {
    return domClosest(node, '[data-entry]', true);
}


/**
 * @param  {Object} options
 * @param  {string} options.id
 * @param  {Array<string>} options.modelProperties
 * @param  {Array<string>} options.labels
 * @param  (Object) options.dataObjects
 * @param  {Function} options.getElements - this callback function must return a list of business object items
 * @param  {Function} options.removeElement
 * @param  {Function} options.addElement
 * @param  {Function} options.updateElement
 * @param  {Function} options.editable
 * @param  {Function} options.setControlValue
 * @param  {Function} options.show
 *
 *
 * @return {Object}
 */
module.exports = function(options) {

    var id              = options.id,
        modelProperties = options.modelProperties,
        labels          = options.labels;

    var labelRow = createLabelRowTemplate(labels);

    var getElements   = options.getElements;

    var removeElement = options.removeElement,
        canRemove     = typeof removeElement === 'function';

    var addElement = options.addElement,
        canAdd     = typeof addElement === 'function',
        addLabel   = options.addLabel || 'Add Value';

    var updateElement = options.updateElement,
        canUpdate     = typeof updateElement === 'function';

    var editable        = options.editable || function() { return true; },
        setControlValue = options.setControlValue;

    var show       = options.show,
        canBeShown = typeof show === 'function';

    var dataObjects = options.dataObjects;

    var elements = function(element, node) {
        return pick(getElements(element, node), modelProperties);
    };

    var factory = {
        id: id,
        html:  '<div class="bpp-table" data-show="showTable">' +
            '<div class="bpp-field-wrapper bpp-table-row">' +
        labelRow +
        '</div>' +
        '<div data-list-entry-container>' +
        '</div>' +
        '</div>',

        get: function(element, node) {
            var boElements = elements(element, node, this.__invalidValues);

            var invalidValues = this.__invalidValues;

            delete this.__invalidValues;

            forEach(invalidValues, function(value, idx) {
                var element = boElements[idx];

                forEach(modelProperties, function(prop) {
                    element[prop] = value[prop];
                });
            });

            return boElements;
        },

        set: function(element, values, node) {
            var action = this.__action || {};
            delete this.__action;

            if (action.id === 'delete-element') {
                return removeElement(element, node, action.idx);
            }
            else if (action.id === 'add-element') {
                return addElement(element, node);
            }
            else if (canUpdate) {
                var commands = [],
                    valuesToValidate = values;

                if (typeof options.validate !== 'function') {
                    valuesToValidate = diff(element, node, values, elements(element, node), editable);
                }

                var self = this;

                forEach(valuesToValidate, function(value) {
                    var validationError,
                        idx = values.indexOf(value);

                    if (typeof options.validate === 'function') {
                        validationError = options.validate(element, value, node, idx);
                    }

                    if (!validationError) {
                        var cmd = updateElement(element, value, node, idx);

                        if (cmd) {
                            commands.push(cmd);
                        }
                    } else {
                        // cache invalid value in an object by index as key
                        self.__invalidValues = self.__invalidValues || {};
                        self.__invalidValues[idx] = value;

                        // execute a command, which does not do anything
                        commands.push(cmdHelper.updateProperties(element, {}));
                    }
                });

                return commands;
            }
        },
        createListEntryTemplate: function(value, index, selectBox) {
            if(value.name == 'task_type' || value.name == 'id_rule'){
                return createInputRowTemplate(value, modelProperties, canRemove);
            }
            return createInputRowTemplate(value, modelProperties, canRemove, dataObjects);
        },

        editable: function(element, rowNode, input, prop, value, idx) {
            var entryNode = domClosest(rowNode, '[data-entry]');
            return editable(element, entryNode, prop, idx);
        },

        show: function(element, entryNode, node, scopeNode) {
            entryNode = getEntryNode(entryNode);
            return show(element, entryNode, node, scopeNode);
        },

        showTable: function(element, entryNode, node, scopeNode) {
            entryNode = getEntryNode(entryNode);
            var elems = elements(element, entryNode);
            return elems && elems.length && (!canBeShown || show(element, entryNode, node, scopeNode));
        },

        validateListItem: function(element, value, node, idx) {
            if (typeof options.validate === 'function') {
                return options.validate(element, value, node, idx);
            }
        }

    };

    if (setControlValue) {
        factory.setControlValue = function(element, rowNode, input, prop, value, idx) {
            var entryNode = getEntryNode(rowNode);
            setControlValue(element, entryNode, input, prop, value, idx);
        };
    }

    return factory;

};
