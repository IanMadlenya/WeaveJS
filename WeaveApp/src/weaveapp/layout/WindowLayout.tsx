import * as React from "react";
import * as ReactDOM from "react-dom";
import * as weavejs from "weavejs";
import * as _ from "lodash";
import {Weave} from "weavejs";
import ReactUtils = weavejs.util.ReactUtils;
import DraggableDiv = weavejs.ui.DraggableDiv;
import DraggableDivState = weavejs.ui.DraggableDivState;
import WeaveComponentRenderer = weavejs.ui.WeaveComponentRenderer;
import Div = weavejs.ui.Div;
import LinkableVariable = weavejs.core.LinkableVariable;
import Structure = weavejs.util.Structure;
import WeavePathArray = weavejs.util.WeavePathArray;
import WeavePath = weavejs.path.WeavePath;
import MouseUtils = weavejs.util.MouseUtils;
import MiscUtils = weavejs.util.MiscUtils;
import ILinkableVariable = weavejs.api.core.ILinkableVariable;
import {AbstractLayout, PanelDragEvent, LayoutProps} from "weaveapp/layout/AbstractLayout";

export interface PanelState
{
    id?: WeavePathArray;
    position?: DraggableDivState;
    maximized?: boolean;
}

export interface WindowLayoutState
{
    panels:PanelState[];
    title:string;
}

const stateStructure:Structure = {
    panels: [
        {
            id: MiscUtils.nullableStructure(["string"]),
            position: {
                left: "string",
                top: "string",
                width: "string",
                height: "string"
            },
            maximized: "boolean"
        }
    ],
    title: "string"
};

export default class WindowLayout extends AbstractLayout<LayoutProps, {}> implements ILinkableVariable
{
    private linkableState = Weave.linkableChild(this, new LinkableVariable(null, null, MiscUtils.normalizeStructure({}, stateStructure)), this.forceUpdate, true);
    private overlay:Div;

    constructor(props:LayoutProps)
    {
        super(props);
    }

    setSessionState(state:WindowLayoutState):void
    {
        if (Array.isArray(state))
        {
            state = {
                panels: state
            } as any;
        }
        this.linkableState.state = MiscUtils.normalizeStructure(state, stateStructure);
    }

    getSessionState():WindowLayoutState
    {
        return this.linkableState.state as WindowLayoutState;
    }

    get title()
    {
        return this.getSessionState().title;
    }

    componentDidMount():void
    {
        var document = ReactUtils.getDocument(this);
        document.addEventListener("mouseup", this.onMouseUp);
    }

    componentWillUnmount():void
    {
        var document = ReactUtils.getDocument(this);
        document.removeEventListener("mouseup", this.onMouseUp);
    }

    bringPanelForward(id:WeavePathArray):void
    {
        var panelState:PanelState = null;
        var state = this.getSessionState();
        var panels = state.panels.filter(item => {
            if (_.isEqual(id, item.id))
            {
                panelState = item;
                return false;
            }
            return true;
        });

        if (!panelState)
            return;

        state.panels = panels;
        state.panels.push(panelState);
        this.setSessionState(state);
    }

    onReposition(id:WeavePathArray, position:DraggableDivState)
    {
        this.updatePanelState(id, {position});
    }

    addPanel(id:WeavePathArray):void
    {
        var state = this.getSessionState();
        state.panels = state.panels.concat({id, position: WindowLayout.generatePosition()});
        this.setSessionState(state);
    }

    replacePanel(id:WeavePathArray, newId:WeavePathArray)
    {
        var panelState:PanelState = null;
        var state = this.getSessionState();
        state.panels.forEach(item => {
            if (_.isEqual(id, item.id))
                panelState = item;
        });
        if (panelState)
            panelState.id = newId;
        else
            console.error("Could not find id in this layout", id);
        this.setSessionState(state);
    }

    static generatePosition():DraggableDivState
    {
        return {
            left: WindowLayout.fudgePercent(5, 3),
            top: WindowLayout.fudgePercent(5, 3),
            width: "50%",
            height: "50%"
        };
    }

    static fudgePercent(n:number, delta:number):string
    {
        return Math.round(n - delta + Math.random() * 2 * delta) + '%';
    }

    removePanel(id:WeavePathArray):void
    {
        var state = this.getSessionState();
        state.panels = state.panels.filter(item => !_.isEqual(id, item.id));
        this.setSessionState(state);
    }

    maximizePanel(id:WeavePathArray, maximized:boolean):void
    {
        this.updatePanelState(id, {maximized});
    }

    getPanelIds():WeavePathArray[]
    {
        return this.getSessionState().panels.map(panel => panel.id);
    }

    updatePanelState(id:WeavePathArray, diff:PanelState):void
    {
        var state = this.getSessionState();
        state.panels = state.panels.map(item => (
            _.isEqual(item.id, id)
            ?	_.merge({}, item, diff) as PanelState
            :	item
        ));
        this.setSessionState(state);
    }

    onDragStart(panelDragged:WeavePathArray, event:React.DragEvent)
    {
        // (event as any).dataTransfer.setDragImage(this.rootLayout.getElementFromId(panelDragged), 0, 0);
        PanelDragEvent.setPanelId(event, panelDragged);
    }

    onDrag=(panelDragged:WeavePathArray, event:React.DragEvent)=>
    {
        console.log("dragging", event);
    }

    onDrop=(event:React.DragEvent)=>
    {
        var panelDragged = PanelDragEvent.getPanelId(event);
        var sourceLayout= PanelDragEvent.getLayout(event, Weave.getWeave(this));

        /* If this drop is indeed from a paneldrag, prevent default behavior. */
        if (panelDragged && sourceLayout) event.preventDefault();

        // remove the panel from the other layout;
        // add it to this layout;
        if (sourceLayout && sourceLayout != this)
        {
            var offsetPoint = MouseUtils.getOffsetPoint(ReactDOM.findDOMNode(this) as HTMLElement, event.nativeEvent as MouseEvent);
            sourceLayout.removePanel(panelDragged);
            var state = this.getSessionState();
            state.panels = state.panels.concat({
                id: panelDragged,
                position: {
                    left: offsetPoint.x,
                    top: offsetPoint.y,
                    width: "50%",
                    height: "50%"
                }
            });
            this.setSessionState(state);
        }
        this.hideOverlay();
    };

    onDragLeave=(event:React.DragEvent):void=>
    {
        if (!MouseUtils.isMouseOver(ReactDOM.findDOMNode(this) as HTMLElement, event.nativeEvent as DragEvent, false))
            this.hideOverlay();
    };

    onDragEnd=(event:React.DragEvent):void=>
    {
        this.hideOverlay();
    }

    onMouseUp=(event:MouseEvent):void=>
    {
        this.hideOverlay();
    }

    onDragOver=(event:React.DragEvent)=>
    {
        event.preventDefault(); // allows the drop event to be triggered
        if (!PanelDragEvent.hasPanelId(event))
            return;

        event.dataTransfer.dropEffect = "move"; // hides the + icon browsers display

        var offsetPoint = MouseUtils.getOffsetPoint(ReactDOM.findDOMNode(this) as HTMLElement, event.nativeEvent as MouseEvent);

        this.overlay.setState({
            style: {
                position: "absolute",
                visibility: "visible",
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                left: offsetPoint.x,
                top: offsetPoint.y,
                width: "50%",
                height: "50%",
                pointerEvents: "none"
            }
        });
    };

    hideOverlay=()=>
    {
        this.overlay.setState({
            style: {}
        });
    }

    render():JSX.Element
    {
        var weave = Weave.getWeave(this);
        var state = this.getSessionState();
        return (
            <div
                ref={ReactUtils.registerComponentRef(this)}
                {...this.props as React.HTMLAttributes}
                onDragOver={this.onDragOver}
                onDrop={this.onDrop}
                onDragLeave={ this.onDragLeave }
                onDragEnd={ this.onDragEnd }
                style={
                    _.merge({flex: 1}, this.props.style, {
                        position: "relative",
                        overflow: "hidden"
                    })
                }
            >
                {
                    state.panels.map(state => {
                        var key = JSON.stringify(state.id);
                        var style = {
                            left: 0,
                            top: 0,
                            width: "100%",
                            height: "100%",
                            minWidth: "5%",
                            minHeight: "5%"
                        };
                        if (!state.maximized)
                            _.merge(style, state.position);

                        return (
                            <DraggableDiv
                                key={key}
                                liveMoving={true}
                                liveResizing={false}
                                onDragStart={this.onDragStart.bind(this, state.id)}
                                onDrag={this.onDrag.bind(this, state.id)}
                                movable={!state.maximized}
                                resizable={!state.maximized}
                                getExternalOverlay={() => this.overlay}
                                className="weave-window"
                                style={style}
                                onMouseDown={(event) => this.bringPanelForward(state.id)}
                                draggable={!this.props.panelRenderer}
                                onReposition={this.onReposition.bind(this, state.id)}
                            >
                                {
                                    this.props.panelRenderer
                                    ?	this.props.panelRenderer(state.id, {maximized: state.maximized}, this.props.panelRenderer)
                                    :	<WeaveComponentRenderer weave={weave} path={state.id}/>
                                }
                            </DraggableDiv>
                        );
                    })
                }
                <Div ref={(c:Div) => { this.overlay = c; }} style={{position: "absolute", visibility: "hidden"}}/>
            </div>
        );
    }
}

Weave.registerClass(
    WindowLayout,
    'weavejs.layout.WindowLayout',
    [ILinkableVariable],
    "Window Layout"
);
