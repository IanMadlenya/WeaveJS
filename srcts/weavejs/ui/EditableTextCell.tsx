/*this component displays text that is editable on a double click*/
import * as React from "react";
import * as ReactDOM from "react-dom";
import Input from "./Input";
import SmartComponent from "./SmartComponent";
import {VBox} from "./flexbox/FlexBox";

export interface IEditableTextCellProps extends React.Props<EditableTextCell>//not extending react.HTML properties because onChange have different signatures
{
	textContent?:string
	onChange?:(newName:string)=> void
	style?:React.CSSProperties
	emptyText?:string
}

export interface IEditableTextCellState
{
	editMode?:Boolean
	textContent?:string
}

export default class EditableTextCell extends SmartComponent<IEditableTextCellProps, IEditableTextCellState>
{
	constructor(props:IEditableTextCellProps)
	{

		super(props);
		this.state = {
			editMode: false,
			textContent: props.textContent
		}
	}

	static defaultProps:IEditableTextCellProps = {
		emptyText: 'Double click to edit and rename'
	};

	componentWillReceiveProps(nextProps:IEditableTextCellProps)
	{
		if (nextProps.textContent != this.props.textContent)
		{
			this.setState({
				textContent : nextProps.textContent
			});
		}
	}

	private element:HTMLElement;

	handleEditableContent =(event:any):void =>
	{
		let textEntered = event.target.value as string;
		this.setState({
			textContent : textEntered
		});
	};

	enableEditMode =():void =>
	{
		this.setState({
			editMode : true
		});
	};

	disableEditMode =(event:MouseEvent):void =>
	{
		//check if the click target is not within the element and the editable mode is on
		if (!this.element.contains(event.target as HTMLElement) && this.state.editMode)
		{
			this.setDisabledState();
		}

	};

	setDisabledState=():void => {
		this.setState({
			editMode :false
		});
		this.props.onChange && this.props.onChange(this.state.textContent);//onChange called once element is no longer in focus
	};

	handleKeyPress = (event:any) => {
		if(event.key == 'Enter'){
			this.setDisabledState();
		}
	};

	componentDidMount()
	{
		this.element = ReactDOM.findDOMNode(this) as HTMLElement;//done so that findDomNode needs to be invoked only once
		document.addEventListener('mousedown', this.disableEditMode);
	}

	componentWillUnmount()
	{
		document.removeEventListener('mousedown', this.disableEditMode);
	}


	//TODO fix styles
	render():JSX.Element
	{
		return(
			<VBox style={this.props.style} onDoubleClick={ this.enableEditMode }>
				{ (this.state.editMode) ?
				<Input value={ this.state.textContent } onChange={ this.handleEditableContent } onKeyPress={this.handleKeyPress}/>

				:
				<div className="weave-input-div">
					{ this.state.textContent ? this.state.textContent : this.props.emptyText}
				</div>
				}
			</VBox>
		);
	}
}