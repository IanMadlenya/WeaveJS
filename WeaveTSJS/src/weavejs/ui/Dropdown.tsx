namespace weavejs.ui
{
	import Menu = weavejs.ui.menu.Menu;
	//import InteractiveTour = weavejs.dialog.InteractiveTour;
	import SmartComponent = weavejs.ui.SmartComponent;
	import Popup = weavejs.ui.Popup;
	import ReactUtils = weavejs.util.ReactUtils;
	import KeyboardUtils = weavejs.util.KeyboardUtils;
	import MenuItemProps = weavejs.ui.menu.MenuItemProps;

	export interface DropdownProps extends React.HTMLProps<Dropdown>
	{
		menuGetter?:() => MenuItemProps[];
		openOnMouseEnter?:boolean;
		closeOnMouseLeave?:boolean;
		onClose?:()=> void;
		onOpen?:()=> void;
	}

	export interface DropdownState
	{
	}

	export class Dropdown extends SmartComponent<DropdownProps, DropdownState> {

		static defaultProps:DropdownProps = {
			open: false,
			openOnMouseEnter:false,
			closeOnMouseLeave:false
		};

		menu:Popup;

		constructor(props:DropdownProps)
		{
			super(props);

			this.state = {
				toggleMenu:this.props.open === undefined ? false : this.props.open,
				menuMounted:false
			};
		}

		onMouseLeave=(event:React.MouseEvent)=>
		{
			if (this.props.closeOnMouseLeave)
				this.closeMenu();
			this.props.onMouseLeave  && this.props.onMouseLeave(event);
		};

		onMouseEnter=(event:React.MouseEvent)=>
		{
			if (this.props.openOnMouseEnter)
				this.openMenu();
			this.props.onMouseEnter  && this.props.onMouseEnter(event);
		};

		onMenuMouseUp=(event:React.MouseEvent)=>
		{
			let menuID:string = (
				typeof this.props.children == "string"
				?	this.props.children as string + " menu"
				:	"menu"
			);
			//InteractiveTour.targetComponentOnClick(menuID);
		
			// close the menu once an item has been clicked
			this.closeMenu();
		};

		onClick=(event:React.MouseEvent)=>
		{
			this.toggleMenu();
			if (this.props.onClick)
				this.props.onClick(event);
		};

		onKeyUp=(event:React.KeyboardEvent)=>
		{
			if (event.keyCode == KeyboardUtils.KEYCODES.SPACE || event.keyCode == KeyboardUtils.KEYCODES.ENTER)
			{
				this.toggleMenu();
				event.preventDefault();
			}
			if (this.props.onKeyUp)
				this.props.onKeyUp(event);
		}

		closeMenu=()=>
		{
			Popup.close(this.menu);
			this.menu = null;
			var document = ReactUtils.getDocument(this);
			document.removeEventListener("mousedown", this.onDocumentMouseDown);
			document.removeEventListener("keydown", this.onDocumentKeyDown);
			document.removeEventListener("keyup", this.onDocumentKeyUp);
			if (this.props.onClose) this.props.onClose();
		}

		onDocumentMouseDown=(event:MouseEvent)=>
		{
			// close the menu when you mousedown anywhere except the
			// dropdown item and the menu
			var menuElt = ReactDOM.findDOMNode(this.menu);
			var dropDownElt = ReactDOM.findDOMNode(this);
			var targetElt = event.target as HTMLElement;
			if (menuElt && menuElt.contains(targetElt) || dropDownElt.contains(targetElt))
				return;
			else
				this.closeMenu();
		}

		onDocumentKeyDown=(event:KeyboardEvent)=>
		{
			// close the menu if key down on space
			if (event.keyCode == KeyboardUtils.KEYCODES.ESC)
				this.closeMenu();
		}

		onDocumentKeyUp=(event:KeyboardEvent)=>
		{
			// close the menu if key up on space
			if (event.keyCode == KeyboardUtils.KEYCODES.SPACE || event.keyCode == KeyboardUtils.KEYCODES.ENTER)
				this.closeMenu();
		}

		openMenu=()=>
		{
			// var menuStyle:React.CSSProperties= {};
			// if (this.props.upward)
			// {
			// 	var rect = ReactDOM.findDOMNode(this).getBoundingClientRect();
			// 	var menuStyle = {
			// 		top: rect.top + rect.height
			// 	}
			// }

			this.menu = Popup.open(
				this,
				<Menu
					opener={this}
					ref={this.getMenuRef}
					menu={this.props.menuGetter()}
					onMouseUp={this.onMenuMouseUp}
				/>
			);
			var document = ReactUtils.getDocument(this);
			document.addEventListener("mousedown", this.onDocumentMouseDown);
			document.addEventListener("keydown", this.onDocumentKeyDown);
			document.addEventListener("keyup", this.onDocumentKeyUp);
			if (this.props.onOpen) this.props.onOpen();
		}

		toggleMenu=()=>
		{
			if (this.menu)
				this.closeMenu();
			else
				this.openMenu();
		};

		getMenuRef=(ele:any)=>
		{
			let menuID:string = typeof this.props.children == "string" ? this.props.children as string  + " menu": "menu";
			//InteractiveTour.callComponentRefCallback(menuID, ele);
		};

		render()
		{
			return (
				<button
					{...this.props as any}
					className={classNames("weave-transparent-button", "weave-dropdown", this.props.className)}
					role="button"
					onKeyUp={this.onKeyUp}
					onMouseDown={this.onClick}
					onMouseEnter={this.onMouseEnter}
					onMouseLeave={this.onMouseLeave}
				>
					{this.props.children}
				</button>
			);
		}
	}
}
