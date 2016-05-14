import * as ReactDOM from "react-dom";
import * as React from "react";
import * as _ from "lodash";
import {HBox, VBox} from "./FlexBox";
import ReactUtils from "../utils/ReactUtils";
import SmartComponent from "../ui/SmartComponent";
import prefixer from "./VendorPrefixer";
import CenteredIcon from "./CenteredIcon";
import Button from "../semantic-ui/Button";
import MouseUtils from "../utils/MouseUtils";

const mouseevents:string[] = ["mouseover", "mouseout", "mouseleave"];
const LEFT:"left" = "left";
const RIGHT:"right" = "right";
const TOP:"top" = "top";
const BOTTOM:"bottom" = "bottom";
const TOP_LEFT:"top-left" = "top-left";
const TOP_RIGHT:"top-right" = "top-right";
const BOTTOM_RIGHT:"bottom-right" = "bottom-right";
const BOTTOM_LEFT:"bottom-left" = "bottom-left";
const ENTER_KEYCODE = 13;
const ESC_KEYCODE = 27;

type Handle = (
	typeof LEFT | typeof RIGHT |
	typeof TOP | typeof BOTTOM |
	typeof TOP_LEFT | typeof TOP_RIGHT |
	typeof BOTTOM_RIGHT | typeof BOTTOM_LEFT
);

export interface DraggableDivProps extends React.HTMLProps<DraggableDiv>
{
	onReposition?:(position:DraggableDivState)=>void;
	resizable?:boolean;
	movable?:boolean;
}

export interface DraggableDivState
{
	top:number;
	left:number;
	width: number;
	height: number;
}

export default class DraggableDiv extends SmartComponent<DraggableDivProps, DraggableDivState>
{
	private element:HTMLElement;
	private mouseDownOffset: {
		x: number,
		y: number
	}
	private moving:boolean;
	private activeResizeHandle:Handle;

	constructor(props:DraggableDivProps)
	{
		super(props);
		var style = props.style || {};
		this.setState({
			top: style.top,
			left: style.left,
			width: style.width,
			height: style.height
		});
		
	}
	
	static defaultProps:DraggableDivProps =	{
		resizable: true,
		movable: true
	}

	componentDidMount()
	{
		// if initial width height are provided
		// use it otherwise default to element position
		var style = this.props.style || {};
		var newState = {
			top: style.top !== undefined ? this.element.offsetTop : (window.innerHeight - this.element.offsetHeight) / 2,
			left: style.left !== undefined ? this.element.offsetLeft : (window.innerWidth - this.element.offsetWidth) / 2,
			width: this.element.offsetWidth,
			height: this.element.offsetHeight
		};
		if(this.props.onReposition)
		this.props.onReposition(newState);
			this.setState(newState);
		document.addEventListener("mouseup", this.onDragEnd, true);
		document.addEventListener("mousemove", this.onDrag, true);
	}
	
	private onDragStart=(event:React.DragEvent)=>
	{
		if(this.props.movable)
		{
			event.preventDefault();
			event.stopPropagation();
			this.moving = true;
			this.mouseDownOffset = MouseUtils.getOffsetPoint(this.element, event as any);
		}
		if(this.props.onDragStart)
			this.props.onDragStart(event);
	}
	
	private onResizeStart(event:React.MouseEvent, handle:Handle)
	{
		this.activeResizeHandle = handle;
		this.mouseDownOffset = MouseUtils.getOffsetPoint(this.element, event as any);
	}
	
	private onDrag=(event:MouseEvent)=>
	{
		if (!this.activeResizeHandle && !this.moving)
			return;
		
		var mouseOffset = MouseUtils.getOffsetPoint(this.element, event as MouseEvent)
		var parentMouseOffset = MouseUtils.getOffsetPoint(this.element.parentElement, event as MouseEvent);
		var parentWidth = (this.element.offsetParent as HTMLElement).offsetWidth;
		var parentHeight = (this.element.offsetParent as HTMLElement).offsetHeight;
		var oldRight:number = this.state.left + this.state.width;
		var oldBottom:number = this.state.top + this.state.height;
		var edgeBuffer = 25;
		
		var mouseDeltaX = mouseOffset.x - this.mouseDownOffset.x;
		var mouseDeltaY = mouseOffset.y - this.mouseDownOffset.y;
		var newState:DraggableDivState = _.clone(this.state);
		var style = this.props.style || {};
		var minWidth:number = Number(style.minWidth) || 0;
		var minHeight:number = Number(style.minHeight) || 0;
		// don't resize if mouse goes out of screen

		if (this.activeResizeHandle)
		{
			if (this.activeResizeHandle.indexOf(LEFT) >= 0)
			{
				newState.left = this.state.left + mouseDeltaX;
				newState.left = Math.max(newState.left, oldRight - parentWidth);
				newState.left = Math.min(newState.left, oldRight - minWidth, parentWidth - edgeBuffer);
				newState.width = oldRight - newState.left;
			}
			
			if (this.activeResizeHandle.indexOf(TOP) >= 0)
			{
				newState.top = this.state.top + mouseDeltaY;
				newState.top = Math.max(newState.top, 0);
				newState.top = Math.min(newState.top, oldBottom - minHeight, parentHeight - edgeBuffer);
				newState.height = oldBottom - newState.top;
			}
			
			if (this.activeResizeHandle.indexOf(RIGHT) >= 0)
			{
				newState.width = this.state.width + mouseDeltaX;
				newState.width = Math.max(newState.width, minWidth, edgeBuffer - this.state.left);
				newState.width = Math.min(newState.width, parentWidth);
				this.mouseDownOffset.x += newState.width - this.state.width;
			}
			
			if (this.activeResizeHandle.indexOf(BOTTOM) >= 0)
			{
				newState.height = this.state.height + mouseDeltaY;
				newState.height = Math.max(newState.height, minHeight);
				newState.height = Math.min(newState.height, parentHeight);
				this.mouseDownOffset.y += newState.height - this.state.height;
			}
		}
		else if (this.moving)
		{
			newState.left = this.state.left + mouseDeltaX;
			newState.left = Math.max(newState.left, edgeBuffer - (this.state.width || 0));
			newState.left = Math.min(newState.left, parentWidth - edgeBuffer);
			
			newState.top = this.state.top + mouseDeltaY;
			newState.top = Math.max(newState.top, 0);
			newState.top = Math.min(newState.top, parentHeight - edgeBuffer);
		}
		if(this.props.onReposition)
			this.props.onReposition(newState);
		this.setState(newState);
	}
	
	private onDragEnd=(event:MouseEvent)=>
	{
		this.moving = false;
		this.activeResizeHandle = null;
	}

	componentWillUnmount()
	{
		document.removeEventListener("mouseup", this.onDragEnd, true);
		document.removeEventListener("mousemove", this.onDrag as any /*TODO*/, true);
	}

	renderResizers():JSX.Element[]
	{
		return [
			<div key={LEFT} onMouseDown={(event:React.MouseEvent) => this.onResizeStart(event, LEFT)} style={{position: "absolute", left: 0, top: 0, width: 8, height: "100%", cursor: "ew-resize"}}/>,
			<div key={RIGHT} onMouseDown={(event:React.MouseEvent) => this.onResizeStart(event, RIGHT)} style={{position: "absolute", right: 0, top: 0, width: 8, height: "100%", cursor: "ew-resize"}}/>,
			<div key={TOP} onMouseDown={(event:React.MouseEvent) => this.onResizeStart(event, TOP)} style={{position: "absolute", left: 0, top: 0, width: "100%", height: 8, cursor: "ns-resize"}}/>,
			<div key={BOTTOM} onMouseDown={(event:React.MouseEvent) => this.onResizeStart(event, BOTTOM)} style={{position: "absolute", left: 0, bottom: 0, width: "100%", height: 8, cursor: "ns-resize"}}/>,
			<div key={TOP_LEFT} onMouseDown={(event:React.MouseEvent) => this.onResizeStart(event, TOP_LEFT)} style={{position: "absolute", left: 0, top: 0, width: 16, height: 16, cursor: "nwse-resize"}}/>,
			<div key={TOP_RIGHT} onMouseDown={(event:React.MouseEvent) => this.onResizeStart(event, TOP_RIGHT)} style={{position: "absolute", right: 0, top: 0, width: 16, height: 16, cursor: "nesw-resize"}}/>,
			<div key={BOTTOM_LEFT} onMouseDown={(event:React.MouseEvent) => this.onResizeStart(event, BOTTOM_LEFT)} style={{position: "absolute", left: 0, bottom: 0, width: 16, height: 16, cursor: "nesw-resize"}}/>,
			<div key={BOTTOM_RIGHT} onMouseDown={(event:React.MouseEvent) => this.onResizeStart(event, BOTTOM_RIGHT)} style={{position: "absolute", bottom: 0, right: 0, width: 16, height: 16, cursor: "nwse-resize"}}/>
		];
	}

	render():JSX.Element
	{
		var style = _.merge({position: "absolute"}, this.props.style, this.state);
		return (
			<VBox draggable={true} {...this.props} onDragStart={this.onDragStart} style={style} ref={(c:VBox) => this.element = ReactDOM.findDOMNode(c) as HTMLElement}>
				{this.props.children}
				{this.props.resizable ? this.renderResizers() : null}
			</VBox>
		);
	}
}
