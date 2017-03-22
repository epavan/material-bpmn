var _ = require('lodash');


/**
 * A palette provider for BPMN 2.0 elements.
 */
function PaletteProvider(palette, create, elementFactory, spaceTool, lassoTool, handTool, globalConnect, translate) {

    this._palette = palette;
    this._create = create;
    this._elementFactory = elementFactory;
    this._spaceTool = spaceTool;
    this._lassoTool = lassoTool;
    this._handTool = handTool;
    this._globalConnect = globalConnect;
    this._translate = translate;

    palette._providers = [];
    palette.registerProvider(this);
}

module.exports = PaletteProvider;

PaletteProvider.$inject = [
    'palette',
    'create',
    'elementFactory',
    'spaceTool',
    'lassoTool',
    'handTool',
    'globalConnect',
    'translate'
];


PaletteProvider.prototype.getPaletteEntries = function (element) {

    var actions  = {},
        create = this._create,
        elementFactory = this._elementFactory,
        spaceTool = this._spaceTool,
        lassoTool = this._lassoTool,
        handTool = this._handTool,
        globalConnect = this._globalConnect,
        translate = this._translate;

    function createAction(type, group, className, title, options) {

        function createListener(event) {
            var shape = elementFactory.createShape(_.assign({ type: type }, options));

            if (options) {
                shape.businessObject.di.isExpanded = options.isExpanded;
            }

            create.start(event, shape);
        }

        var shortType = type.replace(/^bpmn\:/, '');

        return {
            group: group,
            className: className,
            title: title || translate('Create {type}', { type: shortType }),
            action: {
                dragstart: createListener,
                click: createListener
            }
        };
    }

    function createParticipant(event, collapsed) {
        create.start(event, elementFactory.createParticipantShape(collapsed));
    }

    _.assign(actions, {
        'hand-tool': {
            group: 'tools',
            className: 'bpmn-icon-hand-tool',
            title: translate('Activate the hand tool'),
            action: {
                click: function(event) {
                    handTool.activateHand(event);
                }
            }
        },
        'lasso-tool': {
            group: 'tools',
            className: 'bpmn-icon-lasso-tool',
            title: translate('Activate the lasso tool'),
            action: {
                click: function(event) {
                    lassoTool.activateSelection(event);
                }
            }
        },
        'space-tool': {
            group: 'tools',
            className: 'bpmn-icon-space-tool',
            title: translate('Activate the create/remove space tool'),
            action: {
                click: function(event) {
                    spaceTool.activateSelection(event);
                }
            }
        },
        'global-connect-tool': {
            group: 'tools',
            className: 'bpmn-icon-connection-multi',
            title: translate('Activate the global connect tool'),
            action: {
                click: function(event) {
                    globalConnect.toggle(event);
                }
            }
        },
        'tool-separator': {
            group: 'tools',
            separator: true
        },
        'create.start-event': createAction(
            'bpmn:StartEvent', 'event', 'bpmn-icon-start-event-none'
        ),
        'create.intermediate-event': createAction('bpmn:IntermediateThrowEvent', 'event',
            'bpmn-icon-intermediate-event-none', translate('Create IntermediateThrowEvent/BoundaryEvent')
        ),
        'create.end-event': createAction(
            'bpmn:EndEvent', 'event', 'bpmn-icon-end-event-none'
        ),
        'create.exclusive-gateway': createAction(
            'bpmn:ExclusiveGateway', 'gateway', 'bpmn-icon-gateway-xor'
        ),
        'create.task': createAction(
            'bpmn:Task', 'activity', 'bpmn-icon-task'
        ),
        // 'create.participant-expanded': createAction (
        //     'bpmn:Participant', 'collaboration', 'bpmn-icon-participant', 'createParticipant', 'createParticipant'
        // )
        'create.participant-expanded': {
            group: 'collaboration',
            className: 'bpmn-icon-participant',
            title: translate('Create Pool/Participant'),
            action: {
                dragstart: createParticipant,
                click: createParticipant
            }
        }
    });

    // _.extend(actions, {
    //     'create.script-task': {
    //         group: 'activity',
    //         className: 'bpmn-icon-script-task',
    //         title: 'Create a new ScriptTask',
    //         action: {
    //             dragstart: function (event) {
    //                 var shape = elementFactory.createShape({type: 'bpmn:ScriptTask'});
    //                 create.start(event, shape);
    //             }
    //         }
    //     },
    //     'create.call-activity': { //added existing BPMN 2.0 activity
    //         group: 'activity',
    //         className: 'bpmn-icon-call-activity',
    //         title: 'Create a new CallActivity',
    //         action: {
    //             dragstart: function (event) {
    //                 var shape = elementFactory.createShape({type: 'bpmn:CallActivity'});
    //                 create.start(event, shape);
    //             },
    //             click: function (event) { //added action on click on palette of element
    //                 console.log("call-activity click action fired " + event);
    //             }
    //         }
    //     },
    //     'create.service-task': {
    //         group: 'activity',
    //         className: 'bpmn-icon-service-task',
    //         title: 'Create a new ServiceTask',
    //         action: {
    //             dragstart: function (event) {
    //                 var shape = elementFactory.createShape({type: 'bpmn:ServiceTask'});
    //                 create.start(event, shape);
    //             }
    //         }
    //     }
    // });

    return actions;
};