import * as React from "react";
import * as ReactDOM from "react-dom";
import ReactUtils from "../util/ReactUtils";
import * as _ from "lodash";
import SmartComponent from "./SmartComponent";

export type ComboBoxOption = {
	label: string,
	value: any
};

export interface ComboBoxProps extends React.HTMLProps<ComboBox>
{
	options?: (string | { label: string, value: any })[];
	value?:any;
	onChange?:(value:any)=>void;
	onNew?:(value:any)=>void;
	onRemoved?:(value:any)=>void;
	onAdded?:(value:any)=>void;
	selectFirstOnInvalid?:boolean;
	context?:Element;
	direction?:string;
	valueEqualityFunc?: (valueA:any,valueB:any)=>boolean;
	allowAdditions?:boolean;
	type?:string;
	fluid?:boolean;
	header?:string|React.ReactChild
	optionStyle?:React.CSSProperties;
	noneOption?:ComboBoxOption;
	searchable?:boolean;
}

export interface ComboBoxState
{
	openMenu?:boolean;
	options?: ComboBoxOption[]; // structured version(ComboBoxOption) for props.options
	value?:any | any[]; // we need value as we are updating state from linkreactrefstate
	direction?:string; //upward | downward
	searchQuery?:string;
}

//todo:
// support for key board events
// header for multiple ComboBox
// scroll to selected option when opened
export default class ComboBox extends React.Component<ComboBoxProps, ComboBoxState>
{
	static defaultProps:ComboBoxProps = {
		fluid:true,
		noneOption:null,
		searchable:false
	};
	
	constructor(props:ComboBoxProps)
	{
		super(props);

		let stateObj:ComboBoxState = this.getStateFromProps(props);
		stateObj.openMenu = false;
		stateObj.direction = "downward";
		stateObj.searchQuery = "";
		this.state = stateObj;
	}

	componentWillReceiveProps(nextProps: ComboBoxProps)
	{
		if(this.props.options != nextProps.options || this.props.value != nextProps.value)
		{
			this.setState(this.getStateFromProps(nextProps));
		}

		if(this.props.direction != nextProps.direction )
		{
			this.setState({
				direction:nextProps.direction
			});
		}
	}


	//props.options turns into structured ComboBoxOption object
	//props.value.value turns into state.value object
	getStateFromProps=(props:ComboBoxProps):ComboBoxState=>
	{
		var options:ComboBoxOption[] = props.options.map((option:(string | { label: string, value: any })) =>
		{
			if(typeof option === "object" && option)
			{
				return option;
			}
			else
			{
				return{
					label: option as string,
					value: option as string
				}
			}
		});

		var value:any = props.value;
		if(value && value.hasOwnProperty("label") && value.hasOwnProperty("value"))
		{
			// so get the original value from Value Object
			value = props.value.value;
			// make options have unique value
			options = _.uniq(_.union(options, [props.value]), "value");
		}
		else if(Array.isArray(value) && value[0] && value[0].hasOwnProperty("label") && value[0].hasOwnProperty("value"))
		{
			// so get the original values from each Value Object
			value = props.value.map((val:any) => val.value);
			// make options have unique value
			options = _.uniq(_.union(props.value, options), "value")
		}

		if(props.noneOption)
		{
			options.push({
				label:props.noneOption.label,
				value:(props.noneOption.value !== undefined)? props.noneOption.value : null
			})
		}

		return {
			value: value,
			options: options
		}
	};

	// important to get option from value
	// as this.state.value are updated programatically (for ex:LinkReactStateref)
	private getOptionFromValue(value:any):ComboBoxOption
	{
		// if value is not equal to none Option value find the option
		if(value !== (this.props.noneOption && this.props.noneOption.value))
		{
			let equalityFunc = this.props.valueEqualityFunc || _.isEqual;
			let index:number =  this.state.options && this.state.options.findIndex((option:ComboBoxOption) => {
					return equalityFunc(option.value, value);
				});
			return this.state.options[index];
		}
		else
		{
			return this.props.noneOption;
		}

	}

	// toggles menu open /close
	onClickListener=(event:React.MouseEvent)=>
	{
		let openState:boolean = !this.state.openMenu;
		this.setState({
			openMenu:openState
		});

		// if search enabled, make the focus to input element when opened
		// so that user knows there is a input element
		if(openState && this.props.searchable)
			this.inputElement && this.inputElement.focus();
		else
			this.resetSearchQuery();

		this.props.onClick && this.props.onClick(event);

	};


	onChange=(index:number,option:ComboBoxOption,event:React.FormEvent) =>
	{

		if (this.props.onNew && option.label )
		{
			this.props.onNew && this.props.onNew(option.label);
		}
		else
		{
			let value:any | any[] = this.state.options[index].value;
			let openState:boolean = false;

			if (this.props.type == "multiple" )
			{

				this.props.onAdded && this.props.onAdded(value);

				if(value !== (this.props.noneOption && this.props.noneOption.value))
				{
					// push to state value array
					(this.state.value as any[]).push(value);
					// put the reference of this.state.value to local value object
					// to call props.onChange
					value = (this.state.value as any[]);
					openState = true;
					this.resetSearchQuery();
					// if search enabled, make the focus to input element when opened
					// so that user knows there is a input element
					if(openState && this.props.searchable)
						this.inputElement && this.inputElement.focus();
				}
				else
				{
					openState = false
				}
			}

			this.setState({
				value:value,
				openMenu:openState,
			});

			if(!openState)
				this.resetSearchQuery();

			this.props.onChange && this.props.onChange(value);
		}
	};

	resetSearchQuery = ()=>{
		if(this.props.searchable)
		{
			// search is done and user selected the option
			// set search query back to empty

			this.setState({
				searchQuery: ""
			});

			if(this.inputElement)
			{
				(this.inputElement as any).value = "";
			}

		}
	};

	addNewOption=(event:React.MouseEvent)=>
	{
		var newOption:ComboBoxOption = {
			label:this.state.searchQuery,
			value:this.state.searchQuery
		};

		this.state.options.unshift(newOption);
		this.setState({
			options:this.state.options,
			openMenu:false,
			value:this.state.searchQuery,
			searchQuery:""
		});

		if(this.inputElement)
		{
			(this.inputElement as any).value = "";
		}
	};

	selectedValueRemoveListener=(index:number,option:ComboBoxOption,event:React.MouseEvent)=>
	{
		(this.state.value as any[]).splice(index,1);
		//menu has to be remained opened when removing a selection
		this.setState({
			value:this.state.value,
			openMenu:true
		});
		this.props.onRemoved && this.props.onRemoved(option.value);
		this.props.onChange && this.props.onChange(this.state.value);
		//required to stop the execution of event listener under this close UI
		event.stopPropagation();
	};



	onDocumentMouseDown=(event:MouseEvent)=>
	{
		// close the menu when you mousedown anywhere except the dropdown item
		var dropDownElt = ReactDOM.findDOMNode(this);
		var targetElt = event.target as HTMLElement;
		if (dropDownElt.contains(targetElt))
		{
			return;
		}
		else
		{
			this.setState({
				openMenu:false,
			});

			this.resetSearchQuery();
		}

	};

	private menuRect:ClientRect = null;
	// called when menu is mounted and unmounted
	// todo : make combobox update direction even window is resizing
	private menuRefCallback=(c:ComboBoxMenu)=>
	{
		if(c)
		{
			ReactUtils.getDocument(this).addEventListener("mousedown", this.onDocumentMouseDown);

			let menuElement = ReactDOM.findDOMNode(c) as HTMLElement;
			this.menuRect = menuElement.getBoundingClientRect();
			// todo : make combobox update direction based on it given parent container, default should be window
			if(this.menuRect.top + this.menuRect.height > window.innerHeight)
			{
				//re-render again
				this.setState({
					direction:"upward"
				});
			}
		}
		else
		{
			this.menuRect = null;
			ReactUtils.getDocument(this).removeEventListener("mousedown", this.onDocumentMouseDown);
		}

	};

	getMenuPositionStyle=():React.CSSProperties =>
	{
		if(this.menuRect && this.state.direction == "upward")
		{
			return {
				top: -this.menuRect.height
			};
		}
		return null;
	};

	private inputElement:HTMLElement = null;
	inputRefCallback=(c:HTMLElement) =>
	{
		this.inputElement = c;
	}


	inputClickListener=(event:React.MouseEvent)=>
	{
		// this ensures, click on input doesn't listen to listeners attached to its container
		event.stopPropagation();
		// if the state is close , make it open
		if(!this.state.openMenu)
		{
			this.setState({
				openMenu:true
			})
		}
	};

	renderInput=(isHidden:boolean = false):JSX.Element=>
	{
		let inputProps:any = {
			type: isHidden ? "hidden":"",
		};

		if(!isHidden)
		{
			inputProps.role = 'combobox';
			inputProps['aria-expanded'] = this.state.openMenu ? "true" : "false";
			inputProps['aria-haspopup'] = this.state.openMenu ? "true" : "false";
			inputProps['aria-labelledby'] = (this.props as any)['aria-labelledby'];
			inputProps['aria-label'] = (this.props as any)['aria-label'];
			inputProps.autoComplete = "off";
			inputProps.className = "search";
			inputProps.onChange = this.searchQueryChangeListener;
			inputProps.ref = this.inputRefCallback;
			inputProps.onClick = this.inputClickListener;
			inputProps.style={
				zIndex:0
			}
		}

		return <input {...inputProps}/>
	};

	// todo: What if value is JSON Object
	isNoneOption=():boolean => {

		if(!this.props.noneOption)
		{
			return false;
		}

		// !== is used as null == undefined will return true where as null === undefined will return false
		if(this.state.value ===  this.props.noneOption.value)
		{
			return true;
		}
		else
		{
			//checking array length is important as [] === [] will return false
			if(Array.isArray(this.state.value))
			{
				let arrayFlag:boolean = (this.state.value.length > 0 === (Array.isArray(this.props.noneOption.value) && this.props.noneOption.value.length > 0));
				return arrayFlag;
			}
			return false;
		}

	};

	searchQueryChangeListener=(event:React.FormEvent)=>
	{
		let query:string =  (event.target as any).value;
		if(this.state.searchQuery !== query)
		{
			this.setState({
				searchQuery:query
			});
		}

	};


	render()
	{

		let textUIs:JSX.Element[] | JSX.Element = null;
		let selectedOptions:ComboBoxOption | ComboBoxOption[] = null;

		/***** Render Value UI ******/

		//1. check for multiple option
		//2. check for single option
		//3. check for none option
		//4. check for placeholder
		if(this.props.type == "multiple" && Array.isArray(this.state.value) && (this.state.value as any[]).length > 0)
		{
			selectedOptions =  [] ;

			textUIs =(this.state.value as any[]).map( (value:any, index:number) => {
				let option:ComboBoxOption = this.getOptionFromValue(value);
				if(option)
					(selectedOptions as ComboBoxOption[])[index] = option;
				//option may not be available instantly for those cases render the value
				//todo: if its a object, convert to string ?
				let valueText:string = option && option.label? option.label : (typeof value == "string") ? value : "";
				return  <a key={index}
				          className="ui label">
							{Weave.lang(valueText)}
							<i className="delete icon" onClick={this.selectedValueRemoveListener.bind(this,index,option)}></i>
						</a>;
			});
		}
		else if(this.state.value && !Array.isArray(this.state.value))
		{
			// render Text UI only When search Query is not in operation
			// for non multiple type
			if( this.state.searchQuery.length == 0)
			{
				let option:ComboBoxOption = this.getOptionFromValue(this.state.value);
				if(option)
					selectedOptions = option;
				//option may not be available instantly for those cases render the value
				let valueText:string = option && option.label? option.label : (typeof this.state.value == "string") ? this.state.value : "";

				let textStyle:React.CSSProperties = {
					zIndex:0 //override semantic Z-order
				};
				// if input is clicked, but user yet to type the search query
				// in that case, color the current selection grey
				if(this.props.searchable && this.state.openMenu )
				{
					textStyle.color = "grey";
					textStyle.pointerEvents ="none";
				}
				textUIs = <div className="text" style={textStyle}>{Weave.lang(valueText)}</div>;


			}
		}
		else if(this.isNoneOption()) // if value from none option , render the none option
		{
			// render Text UI only When search Query is not in operation
			// for non multiple type
			if( this.state.searchQuery.length == 0)
			{
				let textStyle:React.CSSProperties = {
					zIndex:0 //override semantic Z-order
				};

				if(this.props.searchable && this.state.openMenu )
				{
					textStyle.color = "grey";
					textStyle.pointerEvents ="none";
				}
				textUIs = <div className="text" style={textStyle}>{Weave.lang(this.props.noneOption.label)}</div>;

			}
		}
		else if(this.props.placeholder) // if placeholder is there render the value text with placeholder
		{
			textUIs = <div className="default text">{this.props.placeholder}</div>;
		}


		/***** Render Menu UI ******/

		let menuUI:JSX.Element = null;
		if(this.state.openMenu )
		{
			menuUI = <ComboBoxMenu ref={this.menuRefCallback}
			                       className="menu transition visible"
			                       header={this.props.header}
			                       style={this.getMenuPositionStyle()}
			                       onSelect={this.onChange as any}
			                       selectedOptions={selectedOptions}
			                       searchQuery={this.state.searchQuery}
			                       options={this.state.options}
			                       allowAdditions={this.props.allowAdditions}
									additionListener={this.props.allowAdditions? this.addNewOption : null}/>;
		}


		let styleObj:React.CSSProperties =  _.merge({},this.props.style,{
													position:"relative",
													transform:"none" /* override Semantic UI rotateZ(0)*/
												});

		let className:string = "ui " + (this.props.type || "") + (this.props.searchable ? " search ":"") +(this.props.fluid ? " fluid":"")
								+" selection dropdown " + this.state.direction  +(this.state.openMenu? " active visible": " ")+
								+ (this.props.className || "");

		let comboxProps:any = {
			onClick:this.onClickListener,
			className:className,
			style:styleObj,
			tabIndex:0
		};

		/***** Render Input UIs ******/

		//todo: use of hidden input might require, we might need ot create event manually and disaptch change
		//todo: so we might need to be set value to it
		let hiddenInputUI:JSX.Element = this.renderInput(true);
		let inputUI:JSX.Element = null;
		if(this.props.searchable)
		{
			inputUI = this.renderInput();
		}



		return (
			<div {...comboxProps}>
					{hiddenInputUI}
					<i className="dropdown icon" style={ {zIndex:0} }/>
					{textUIs}
					{inputUI}
					{menuUI}
			</div>
		);
	}


}

interface ComboBoxMenuProps extends React.HTMLProps<ComboBoxMenu>
{
	selectedOptions:ComboBoxOption | ComboBoxOption[];
	options:ComboBoxOption[];
	optionStyle?:React.CSSProperties;
	searchQuery?:string;
	allowAdditions?:boolean;
	additionListener?:(event:React.MouseEvent)=>void;
	header?:string|React.ReactChild
}

interface ComboBoxMenuState
{

}

class ComboBoxMenu extends SmartComponent<ComboBoxMenuProps, ComboBoxMenuState>
{
	constructor(props:ComboBoxMenuProps)
	{
		super(props);
	}


	private clickListener=(index:number,option:ComboBoxOption,event:React.MouseEvent) =>
	{
		event.preventDefault();
		event.stopPropagation();
		this.props.onSelect && (this.props.onSelect as any)(index,option,event);
	};

	render()
	{
		let styleObject:React.CSSProperties = _.merge({},this.props.style,{
			display:"block",
			position:"absolute"
		});

		let isMultipleMode:boolean = Array.isArray(this.props.selectedOptions);
		let queryLen:number = this.props.searchQuery.length;
		let optionsUI:JSX.Element[] = this.props.options.map((option:ComboBoxOption,index:number)=>{
			let className = "item";
			let textUI:string | JSX.Element = null;
			if(this.props.searchQuery && queryLen > 0)
			{
				let regExp:RegExp = new RegExp( this.props.searchQuery, 'igm');
				let pos:number = option.label.search(regExp);
				if(pos == -1)
					return null;

				let beginText:string = option.label.substr(0,pos);
				let endText:string = option.label.substr(pos + queryLen , option.label.length-1);

				textUI = <span>{beginText}<b>{this.props.searchQuery}</b>{endText}</span>
			}
			else
			{
				textUI = Weave.lang(option.label)
			}

			if(isMultipleMode)
			{
				if((this.props.selectedOptions as ComboBoxOption[]).indexOf(option) != -1)
				{
					return null;
				}
			}
			else
			{
				if(this.props.selectedOptions  == option && (!this.props.allowAdditions || this.props.searchQuery.length == 0 ))
					className = className + " active selected";
				
			}

			return  <div className={className}
			             role="option"
			             onClick={this.clickListener.bind(this,index,option)}
			             style={this.props.optionStyle}
			             key={index}
			             data-value={index}>
							{textUI}
					</div>;
		});

		let additionUI:JSX.Element = null;
		if(this.props.allowAdditions && this.props.searchQuery.length > 0)
		{
			additionUI = <div role="option"
			                  className="addition item selected"
			                  key={this.props.searchQuery}
			                  onClick={this.props.additionListener}
			                  data-value={this.props.searchQuery}>
							Add &nbsp;
							<b>{this.props.searchQuery}</b>
						</div>;

			optionsUI.unshift(additionUI);

		}

		let headerUI:JSX.Element = null;
		if(this.props.header)
		{
			headerUI = <div className="header">{this.props.header}</div>
		}

		return  <div style={styleObject}
		             tabIndex={-1}
		             className={this.props.className}>
					{headerUI}
					{optionsUI}
				</div>

	}

}




