namespace weavejs.ui.layout
{
	import prefixer = weavejs.css.prefixer;
	import ReactUtils = weavejs.util.ReactUtils;
	import MouseUtils = weavejs.util.MouseUtils;
	import Direction = weavejs.ui.layout.DirectionTypes.Direction;
	import HORIZONTAL = weavejs.ui.layout.DirectionTypes.HORIZONTAL;

	export interface LayoutState
	{
		flex?: number;
		id?: Object;
		direction?: Direction;
		children?: LayoutState[];
		maximized?: boolean;
	};

	export interface LayoutProps extends React.Props<Layout>
	{
		state: LayoutState;
		onStateChange: Function;
		spacing?: number;
	}

	export class Layout extends React.Component<LayoutProps, LayoutState>
	{
		public children:Layout[];
		private resizers:Resizer[];

		private minSize:number;
		private dragging:boolean;

		private panelDragging:boolean = false;

		private overlay:ResizerOverlay;

		constructor(props:LayoutProps, state:LayoutState)
		{
			super(props, state);
			var ps = props.state || {};
			this.state = { id: ps.id, direction: ps.direction, children: ps.children, flex: ps.flex || 1, maximized: ps.maximized };
			this.minSize = 25;
			this.dragging = false;
		}

		componentDidMount():void
		{
			var document = ReactUtils.getDocument(this);
			document.addEventListener("mouseup", this.onMouseUp);
			document.addEventListener("mousedown", this.onMouseDown);
			document.addEventListener("mousemove", this.onMouseMove);
		}

		componentWillReceiveProps(nextProps:LayoutProps):void
		{
			ReactUtils.replaceState(this, nextProps.state);
		}

		componentWillUnmount():void
		{
			var document = ReactUtils.getDocument(this);
			document.removeEventListener("mouseup", this.onMouseUp);
			document.removeEventListener("mousedown", this.onMouseDown);
			document.removeEventListener("mousemove", this.onMouseMove);
		}

		shouldComponentUpdate(nextProps:LayoutProps, nextState:LayoutState):boolean
		{
			return !_.isEqual(this.state, nextState)
				|| !_.isEqual(this.state, nextProps.state)
				|| !_.isEqual(this.props, nextProps);
		}

		componentDidUpdate():void
		{
			if (this.props.onStateChange && this.state)
				this.props.onStateChange(this.state);
		}

		public getElementFromId(id:Object):Element
		{
			var component = this.getComponentFromId(id);
			return component ? ReactDOM.findDOMNode(component) : null;
		}

		public getComponentFromId(id:Object):Layout
		{
			if (this.state.id && _.isEqual(this.state.id, id))
			{
				return this;
			}
			else
			{
				for (let child of this.children)
				{
					let component = child && child.getComponentFromId(id);
					if (component)
						return component;
				}
			}
			return null;
		}

		private onMouseDown=(event:MouseEvent):void=>
		{
			this.resizers.forEach((resizer, index) => {
				if (resizer.state && resizer.state.active)
				{
					var [begin, end] = this.getResizerRange(index);
					this.overlay.setState({
						active: true,
						range: [begin + this.minSize, end + this.minSize]
					});
					this.overlay.onMouseMove(event);
				}
			});
		}

		private onMouseMove=(event:MouseEvent):void=>
		{

		}

		getResizerRange(resizerIndex:number):[number, number]
		{
			var element1Index = resizerIndex;
			var element2Index = resizerIndex + 1;
			if (this.state.direction === HORIZONTAL && WeaveAPI.Locale.reverseLayout)
			{
				element1Index = resizerIndex + 1;
				element2Index = resizerIndex
			}
			var element1 = ReactDOM.findDOMNode(this.children[element1Index]) as HTMLElement;
			var element2 = ReactDOM.findDOMNode(this.children[element2Index]) as HTMLElement;
			if (this.state.direction === HORIZONTAL)
				return [element1.offsetLeft, element2.offsetLeft + element2.offsetWidth];
			else
				return [element1.offsetTop, element2.offsetTop + element2.offsetHeight];
		}

		private onMouseUp=(event:MouseEvent):void=>
		{
			var newState:LayoutState = _.cloneDeep(this.state);

			var element = ReactDOM.findDOMNode(this) as HTMLElement;
			var offsetPoint = MouseUtils.getOffsetPoint(element, event);
			this.resizers.forEach((resizer, index) => {
				if (resizer.state && resizer.state.active)
				{
					var [begin, end] = this.getResizerRange(index);
					var pos:number = this.state.direction === HORIZONTAL ? offsetPoint.x : offsetPoint.y;
					var size:number = this.state.direction === HORIZONTAL ? element.offsetWidth : element.offsetHeight;

					var element1Index = index;
					var element2Index = index + 1;
					if (this.state.direction === HORIZONTAL && WeaveAPI.Locale.reverseLayout)
					{
						element1Index = index + 1;
						element2Index = index
					}

					pos = Math.max(begin + this.minSize, Math.min(pos, end - this.minSize));
					newState.children[element1Index].flex = (pos - begin) / size;
					newState.children[element2Index].flex = (end - pos) / size;

					resizer.setState({ active: false });
					this.overlay.setState({ active: false });
					this.setState(newState);
				}
			});
			this.panelDragging = false;
		}

		private generateStyle()
		{
			var style:any = {
				display: "flex",
				flex: this.state.flex || 1,
				position: "relative",
				outline: "none",
				overflow: "hidden",
				userSelect: "none",
				flexDirection: this.state.direction === HORIZONTAL ? "row" : "column"
			};
			return prefixer(style);
		}

		render():JSX.Element
		{
			return (
				<div style={this.generateStyle()}>
					{ this.props.children }
					{
						Array.isArray(this.props.children) && (this.props.children as any[]).length
						?	<ResizerOverlay
								ref={(overlay:ResizerOverlay) => this.overlay = overlay}
								direction={this.state.direction}
								thickness={this.props.spacing}
							/>
						:	null
					}
				</div>
			);
		}

		static renderLayout(props:LayoutProps):JSX.Element
		{
			var {key, state, onStateChange, spacing} = props;
			var ref = props.ref as (layout:Layout)=>any;

			var parentLayout:Layout;

			var elements:JSX.Element[] = [];
			var children:Layout[] = [];
			var resizers:Resizer[] = [];
			if (state && state.children && state.children.length > 0)
			{
				let onChildStateChange = (childIndex:number, childState:LayoutState) => {
					if (!parentLayout)
						return;
					let stateCopy:LayoutState = _.cloneDeep(parentLayout.state);
					stateCopy.children[childIndex] = childState;
					parentLayout.setState(stateCopy);
				};

				let saveChild = (i:number, child:Layout) => children[i] = child;
				let saveResizer = (i:number, resizer:Resizer) => resizers[i] = resizer;

				state.children.forEach((childState, i) => {
					if (i > 0)
						elements.push(
							<Resizer
								key={`resizer[${i - 1}]`}
								ref={saveResizer.bind(null, i - 1)}
								direction={state.direction}
								spacing={spacing}
							/>
						);
					elements.push(
						Layout.renderLayout({
							key: `child[${i}]`,
							ref: saveChild.bind(null, i),
							state: childState,
							onStateChange: onChildStateChange.bind(null, i),
							spacing: spacing
						})
					);
				});
				
				if (state.direction === HORIZONTAL && WeaveAPI.Locale.reverseLayout)
					elements.reverse();
			}

			var refCallback = function(layout:Layout) {
				parentLayout = layout;
				if (layout)
				{
					layout.children = children;
					layout.resizers = resizers;
				}
				if (ref)
					ref(layout);
			};
			return (
				<Layout
					key={key}
					ref={refCallback}
					children={elements}

					state={_.cloneDeep(Object(state))}
					onStateChange={onStateChange}
					spacing={spacing}
				/>
			);
		}
	}
}

