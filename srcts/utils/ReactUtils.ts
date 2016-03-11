import * as React from "react";
import * as ReactDOM from "react-dom";
import reactUpdate from "react-addons-update";
import * as _ from "lodash";

export type ReactComponent = React.Component<any, any> & React.ComponentLifecycle<any, any>;

export default class ReactUtils
{
	/**
	 * Checks if a component has focus.
	 */
	static hasFocus(component:ReactComponent):boolean
	{
		return ReactDOM.findDOMNode(component).contains(document.activeElement);
	}
	
	/**
	 * Calls component.setState(newValues) only if they are different than the current values.
	 */
	static updateState<S>(component:React.Component<any, S>, newValues:S):void
	{
		for (let key in newValues)
		{
			if (!_.isEqual((component.state as any)[key], (newValues as any)[key]))
			{
				component.setState(newValues);
				return;
			}
		}
	}
	
	/**
	 * Replaces the entire component state if it is different from the current state.
	 */
	static replaceState<S>(component:React.Component<any, S>, newState:S):void
	{
		ReactUtils.updateState(component, ReactUtils.includeMissingPropertyPlaceholders(component.state, newState));
	}
	
	/**
	 * Adds undefined values to new state for properties in current state not
	 * found in new state.
	 */
	private static includeMissingPropertyPlaceholders<S>(currentState:S, newState:S)
	{
		var key:string;
		for (key in currentState)
			if (!newState.hasOwnProperty(key))
				(newState as any)[key] = undefined;
		return newState;
	}
	
	static onUnmount<T extends ReactComponent>(component:T, callback:(component:T)=>void):void
	{
		// add listener to replace instance with placeholder when it is unmounted
		var superWillUnmount = component.componentWillUnmount;
		component.componentWillUnmount = function() {
			if (superWillUnmount)
				superWillUnmount.call(component);
			callback(component);
		};
	}

	static onWillUpdate<T extends React.Component<P,S> & React.ComponentLifecycle<P,S>, P, S>(
			component:T,
			callback:(component:T, nextProps:P, nextState:S, nextContext:any)=>void
		):void
	{
		var superComponentWillUpdate = component.componentWillUpdate;
		component.componentWillUpdate = function(nextProps:P, nextState:S, nextContext:any):void {
			if (superComponentWillUpdate)
				superComponentWillUpdate.call(component, nextProps, nextState, nextContext);
			callback(component, nextProps, nextState, nextContext);
		};
	}

	private static map_callback_onWillUpdateRef = new WeakMap<
		(component:any, nextProps:any, nextState:any, nextContext:any)=>void,
		(component:ReactComponent)=>void
	>();
	
	static onWillUpdateRef<T extends React.Component<P,S> & React.ComponentLifecycle<P,S>, P, S>(
			callback:(component:T, nextProps:P, nextState:S, nextContext:any)=>void
		):(component:T)=>void
	{
		let ref = ReactUtils.map_callback_onWillUpdateRef.get(callback);
		if (ref)
			return ref;

		let prevComponent:T;
		let oldMethod:typeof prevComponent.componentWillUpdate;
		ref = function(component:T):void {
			if (component)
			{
				oldMethod = component.componentWillUpdate;
				component.componentWillUpdate = function(nextProps:P, nextState:S, nextContext:any):void {
					if (oldMethod)
						oldMethod.call(component, nextProps, nextState, nextContext);
					callback(component, nextProps, nextState, nextContext);
				};
				callback(component, component.props, component.state, component.context);
			}
			else if (prevComponent)
			{
				prevComponent.componentWillUpdate = oldMethod;
				oldMethod = null;
			}
			prevComponent = component;
		};

		ReactUtils.map_callback_onWillUpdateRef.set(callback, ref);
		return ref;
	}
}