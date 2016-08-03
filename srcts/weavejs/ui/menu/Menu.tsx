namespace weavejs.ui.menu
{
	import HBox = weavejs.ui.flexbox.HBox;
	import VBox = weavejs.ui.flexbox.VBox;
	import ReactUtils = weavejs.util.ReactUtils;
	import KeyboardUtils = weavejs.util.KeyboardUtils;
	import DOMUtils = weavejs.util.DOMUtils;

	// TODO make these static inside Menu
	export interface MenuItemProps
	{
		label?:React.ReactChild;
		leftIcon?:React.ReactElement<any>;
		rightIcon?:React.ReactElement<any>;
		secondaryLabel?:string;
		click?:()=>void;
		enabled?:boolean;
		shown?:boolean;
		menu?:MenuItemProps[];
		itemStyleOverride?:React.CSSProperties;
	}

	export interface MenuProps extends React.HTMLProps<Menu>
	{
		menu:MenuItemProps[];
		header?:React.ReactChild;
		/**
		 * optional prop to specify who is opening the menu
		 * so that in case of overflow we render the menu
		 * on the other side of the opener
		 */
		opener?:React.ReactInstance;
	}

	export interface MenuState
	{
		activeIndex?: number;
		top?: number;
		left?: number
	}

	const REACT_COMPONENT = "reactComponent";
	const GET_MENU_ITEMS = "getMenuItems";
	const SEPARATOR = {};

	export interface IGetMenuItems
	{
		getMenuItems():MenuItemProps[];
	}

	const renderDivider = function(index:number):JSX.Element
	{
		return (
			<div key={"divider#"+ index} className="divider weave-menu-divider"/>
		);
	};

	export class Menu extends React.Component<MenuProps, MenuState>
	{
		element:HTMLElement;
		opener:HTMLElement;
		window:Window;
		menuItemList:HTMLDivElement[];
		lastOverflow = {left: false, top: false, right: false, bottom: false};
		constructor(props:MenuProps)
		{
			super(props);
			this.state = {
				activeIndex: -1,
				top: props.style ? props.style.top : null,
				left: props.style ? props.style.left : null
			};
			this.menuItemList = [];
		}

		static registerMenuSource(component:React.Component<any, any>)
		{
			(ReactDOM.findDOMNode(component) as any)[REACT_COMPONENT] = component;
		}

		static getMenuItems(element:HTMLElement):MenuItemProps[]
		{
			//var elt = element as any;
			while (element != null)
			{
				let elt = element as any;
				if (elt[REACT_COMPONENT] && elt[REACT_COMPONENT][GET_MENU_ITEMS])
				{
					return elt[REACT_COMPONENT][GET_MENU_ITEMS]() as MenuItemProps[];
				}
				else
				{
					element = element.parentElement;
				}
			}
			return [];
		}

		handleKeyPress=(event:KeyboardEvent)=>
		{
			var nextIndex:number = -1;

			if (event.keyCode == KeyboardUtils.KEYCODES.UP_ARROW)
			{
				nextIndex = this.state.activeIndex - 1;
			}
			else if (event.keyCode == KeyboardUtils.KEYCODES.DOWN_ARROW)
			{
				nextIndex = this.state.activeIndex + 1;
			}

			var nextItem = this.menuItemList[nextIndex];
			var nextElt:HTMLElement = null;
			if (nextItem)
				nextElt = ReactDOM.findDOMNode(nextItem) as HTMLElement;
			if (nextElt)
				nextElt.focus();
		}

		componentDidMount()
		{
			// we could get these elements in the ref function
			// but it's safer here
			this.element = ReactDOM.findDOMNode(this) as HTMLElement;
			this.opener = this.props.opener ? ReactDOM.findDOMNode(this.props.opener) as HTMLElement : null;
			ReactUtils.getDocument(this).addEventListener("keydown", this.handleKeyPress);
			// if (this.element && WeaveAPI.Locale.reverseLayout)
			// {
			// 	// TODO fix this logic
			// 	// var menuRect = this.element.getBoundingClientRect();
			// 	// menuStyle.left = 0 - this.element.clientWidth;
			// 	// if (menuRect.left - menuStyle.left < 0)
			// 	// 	menuStyle.left = 0;
			// }
			if (this.opener)
			{
				this.setState({
					top: this.opener.offsetTop + this.opener.offsetHeight,
					left: this.opener.offsetLeft
				});
			}
			else
			{
				this.forceUpdate();
			}
		}

		componentDidUpdate()
		{
			this.handleOverflow();
		}

		handleOverflow()
		{
			var overflow = DOMUtils.detectOverflow(this.element);
			var menuRect = this.element.getBoundingClientRect();
			var newState = _.clone(this.state);

			if (overflow.bottom && !overflow.top && !this.lastOverflow.top)
			{
				newState.top -= menuRect.height;
				if (this.opener)
					newState.top -= this.opener.clientHeight;
			}

			if (overflow.right && !overflow.left && !this.lastOverflow.left)
			{
				newState.left -= menuRect.width;
				if (this.opener)
					newState.left -= this.opener.clientWidth;
			}

			// if there is a top overflow as a result of a flip due to bottom overflow
			// put the menu back to the bottom
			if (overflow.top && this.lastOverflow.bottom)
			{
				newState.top += menuRect.height;
				if (this.opener)
					newState.top += this.opener.clientHeight;
			}

			if (overflow.left && this.lastOverflow.right)
			{
				newState.left += menuRect.width;
				if (this.opener)
					newState.left += this.opener.clientWidth;
			}

			this.lastOverflow = overflow;
			ReactUtils.updateState(this, newState);
		}

		componentWillUnmount()
		{
			ReactUtils.getDocument(this).removeEventListener("keydown", this.handleKeyPress);
		}

		onMouseEnter=(index:number)=>
		{
			var menuItem = this.menuItemList[index];
			if (menuItem)
				menuItem.focus();
		}

		onMouseLeave=(index:number)=>
		{
			var menuItem = this.menuItemList[index];
			if (menuItem)
				menuItem.blur();
		}

		onFocus=(index:number)=>
		{
			this.setState({
				activeIndex: index
			});
		}

		onBlur=()=>
		{
			this.setState({
				activeIndex: -1
			});
		}

		renderMenuItems(menu:MenuItemProps[])
		{
			var filteredMenu:MenuItemProps[] = [];

			// remove hidden menu elements
			filteredMenu = menu.filter(menuItem => menuItem.hasOwnProperty('shown') ? !!menuItem.shown : true);

			// remove redundant separators
			filteredMenu = filteredMenu.filter((menuItem, index, array) => {
				var item = menuItem;
				var next_item = array[index + 1];
				return !(_.isEqual(item, SEPARATOR) && _.isEqual(next_item, SEPARATOR));
			});

			// remove the first item if it is a separator
			if (_.isEqual(filteredMenu[0], SEPARATOR))
				filteredMenu.shift();

			// remove the last item if it is a separtor
			if (_.isEqual(filteredMenu[filteredMenu.length - 1], SEPARATOR))
				filteredMenu.pop();

			var dividerIndex = 0;
			var menuIndex = 0;

			return filteredMenu.map((menuItem) => {
				if (_.isEqual(menuItem, SEPARATOR))
				{
					return renderDivider(dividerIndex++);
				}
				else
				{
					return this.renderMenuItem(menuIndex++, menuItem)
				}
			});
		}

		renderMenuItem(index:number, props:MenuItemProps):JSX.Element
		{
			var enabled = props.hasOwnProperty('enabled') ? !!props.enabled : true; // default true

			var labelClass = classNames({
				'weave-menuitem-label': true,
				'weave-menuitem-label-padding-left': !!props.leftIcon,
				'weave-menuitem-label-padding-right': !!props.rightIcon
			});

			var menuItemClass = classNames({
				'disabled': !enabled,
				'weave-menuitem': true,
				'weave-menuitem-focused': this.state.activeIndex == index
			});

			var click = (event:React.MouseEvent|React.KeyboardEvent) => {
				if (event.type != "keydown" && event.type != "mouseup")
					return;

				if (event.type == "keydown" && (event as React.KeyboardEvent).keyCode != KeyboardUtils.KEYCODES.SPACE && (event as React.KeyboardEvent).keyCode != KeyboardUtils.KEYCODES.ENTER)
					return;

				if (!props.menu && props.click && enabled)
					props.click();
				else
				{
					// block if the menu item is disabled
					// so that the menu doesn't close
					event.preventDefault();
					event.stopPropagation();
				}
			};

			return (
				<div
					className={menuItemClass}
					tabIndex={0}
					ref={(e:HTMLDivElement) => this.menuItemList[index] = e}
					onMouseUp={click}
					onKeyDown={click}
					onFocus={() => this.onFocus(index)}
					onBlur={this.onBlur}
					onMouseEnter={() => this.onMouseEnter(index)}
					onMouseLeave={() => this.onMouseLeave(index)}
					key={"item#"+index}
					style={props.itemStyleOverride}
				>
					<HBox>
						<div>{props.leftIcon}</div>
						<HBox className={labelClass}>{props.label}</HBox>
						<div>{props.rightIcon}</div>
					</HBox>
					<span>{props.secondaryLabel}</span>
					{
						props.menu
						?	<Menu menu={props.menu}/>
						:	null
					}
				</div>
			);
		}

		render():JSX.Element
		{
			var menuStyle:React.CSSProperties = { position: "absolute" };
			// get positions and other styles
			menuStyle = _.merge(menuStyle, this.props.style, { left: this.state.left, top: this.state.top });

			return (
				<div className="weave-menu" {...this.props as any} style={menuStyle}>
					{this.props.header ? (<div className="header">{this.props.header}</div>):null}
					{this.renderMenuItems(this.props.menu)}
				</div>
			);
		}
	}
}
