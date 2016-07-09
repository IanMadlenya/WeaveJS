import * as React from "react";
import * as _ from "lodash";
import SmartComponent from "./SmartComponent";
import FormEvent = __React.FormEvent;

export interface CheckboxProps extends React.Props<Checkbox>
{
	type?: string;
	disabled?: boolean;
	label: string; // important to set them to avoid using jquery // else we have to let jquery to use dom selector to set " set checked"
	name?: string;
	style?: React.CSSProperties;
	onChange?: (value:boolean, event:FormEvent) => void;
	className?:string;
	value?:boolean;
	title?:string;
}

export interface CheckboxState
{
	value?:boolean;
}

export default class Checkbox extends SmartComponent<CheckboxProps, CheckboxState>
{
	element:Element;
	selector:any;

	constructor(props:CheckboxProps)
	{
		super(props);
		this.state = {
			value: props.value
		};
	}

	static defaultProps:CheckboxProps = {
		type: "",
		label:""
	};
	
	componentWillReceiveProps(nextProps:CheckboxProps)
	{
		if(nextProps.value !== undefined && nextProps.value !== null)
			this.setState({
				value: nextProps.value
			});
	}

	
	
	handleChange=(event:FormEvent)=>
	{
		this.setState({
			value:!this.state.value
		});
		this.props.onChange && this.props.onChange(!this.state.value,event);
	};



	

	render()
	{
		var props = _.clone(this.props);
		delete props.children;
		delete props.className;
		delete props.style;

		return (
			<div className={"ui " + this.props.type + " checkbox " + (this.state.value? "checked ": "") + (this.props.disabled ? "disabled ": "")  + (this.props.className || "")} style={this.props.style}>
				<input {...props as any} type={this.props.type ? this.props.type :  "checkbox"}
				                         value={String(this.state.value)}
				                         checked={this.state.value}
				                         disabled={this.props.disabled}
				                         title={this.props.title}
				                         name={this.props.name}
				                         onChange={this.handleChange}
				                         />
				{this.props.label ? <label>{this.props.label || " "}</label>:null}
			</div>
		);
	}
}
