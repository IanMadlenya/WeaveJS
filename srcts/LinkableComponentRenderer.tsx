import ILinkableObject = weavejs.api.core.ILinkableObject;
import LinkablePlaceholder = weavejs.core.LinkablePlaceholder;
import WeavePath = weavejs.path.WeavePath;

import * as _ from "lodash";
import * as React from "react";
import * as ReactDOM from "react-dom";
import reactUpdate from "react-addons-update";
import {CSSProperties} from "react";
import ReactUtils from "./utils/ReactUtils";
import {HBox, VBox} from "./react-ui/FlexBox";
import LinkableWatcher = weavejs.core.LinkableWatcher;

export interface ILinkableComponentRendererProps extends React.HTMLProps<LinkableComponentRenderer>
{
	weave:Weave,
	path:(number|string)[]
}

export interface ILinkableComponentRendererState
{
	type?:React.ComponentClass<any>;
	target?:ILinkableObject;
}

export default class LinkableComponentRenderer extends React.Component<ILinkableComponentRendererProps, ILinkableComponentRendererState>
{
	watcher:LinkableWatcher;
	
	constructor(props:ILinkableComponentRendererProps)
	{
		super(props);
		this.state = {};
		this.componentWillReceiveProps(props);
	}
	
	shouldComponentUpdate(nextProps:ILinkableComponentRendererProps, nextState:ILinkableComponentRendererState, nextContext:any):boolean
	{
		return !_.isEqual(this.state, nextState)
			|| !_.isEqual(this.props, nextProps)
			|| !_.isEqual(this.context, nextContext);
	}
	
	componentWillReceiveProps(props:ILinkableComponentRendererProps):void
	{
		if (this.props.weave != props.weave || !this.watcher)
		{
			if (this.watcher)
				Weave.dispose(this.watcher);
			
			if (props.weave)
			{
				this.watcher = Weave.disposableChild(props.weave, LinkableWatcher);
				Weave.getCallbacks(this.watcher).addGroupedCallback(this, this.handleWatcher);
			}
			else
			{
				this.watcher = null;
			}
		}

		if (this.watcher)
			this.watcher.targetPath = props.path;
	}

	get objectAtPath():ILinkableObject
	{
		return this.props.weave && this.props.weave.getObject(this.watcher.targetPath);
	}

	handleWatcher():void
	{
		// can't use this.watcher.target because it won't give you a LinkablePlaceholder
		var ComponentClass = LinkablePlaceholder.getClass(this.objectAtPath) as React.ComponentClass<any> & typeof ILinkableObject;
		if (!React.Component.isPrototypeOf(ComponentClass))
			ComponentClass = null;
		
		this.setState({
			type: ComponentClass,
			target: this.watcher.target
		});
	}

	render():JSX.Element
	{
		var props = _.clone(this.props);
		props.style = _.clone(props.style) || {};
		props.style.flex = 1;
		delete props.weave;
		delete props.path;
		return (
			<VBox {...props}>
				{ this.state.type ? React.createElement(this.state.type, { ref: this.handleInstance }) : [] }
			</VBox>
		);
	}
	
	handleInstance=(component:React.Component<any, any>):void=>
	{
		if (component)
			LinkablePlaceholder.setInstance(this.objectAtPath, component);
		
		ReactUtils.updateState(this, {target: component});
	}
	
	componentWillUnmount():void
	{
		if (this.watcher)
			Weave.dispose(this.watcher);
		this.watcher = null;
	}
}