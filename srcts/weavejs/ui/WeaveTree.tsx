namespace weavejs.ui
{
	import HBox = weavejs.ui.flexbox.HBox;
	import VBox = weavejs.ui.flexbox.VBox;
	import DOMUtils = weavejs.util.DOMUtils;

	import IWeaveTreeNode = weavejs.api.data.IWeaveTreeNode;

	export interface IWeaveTreeState
	{
		selectedItems?: Array<IWeaveTreeNode>;
		openItems?: Array<IWeaveTreeNode>;
		columnWidth?: number;
	}

	export interface IWeaveTreeProps
	{
		root:IWeaveTreeNode
		style?: any;
		hideRoot?: boolean;
		hideLeaves? : boolean;
		hideBranches? : boolean;
		filterFunc?: (node: IWeaveTreeNode) => boolean;
		multipleSelection?: boolean;
		onSelect?: (selectedItems: Array<IWeaveTreeNode>) => void;
		onExpand?: (openItems: Array<IWeaveTreeNode>) => void;
		initialOpenItems?: Array<IWeaveTreeNode>;
		initialSelectedItems?: Array<IWeaveTreeNode>;
		onDoubleClick?: (item: IWeaveTreeNode) => void;
	};

	export class WeaveTree extends React.Component<IWeaveTreeProps, IWeaveTreeState>
	{
		constructor(props: IWeaveTreeProps)
		{
			super(props);

			this.state = { selectedItems: props.initialSelectedItems || [], openItems: props.initialOpenItems || [] };
		}

		state: IWeaveTreeState = {
			selectedItems: [],
			openItems: [],
			columnWidth: 0
		};

		componentWillReceiveProps(nextProps: IWeaveTreeProps)
		{
			if (!this.props.root != !nextProps.root || (nextProps.root && !nextProps.root.equals(this.props.root)))
			{
				this.setState({ selectedItems: nextProps.initialSelectedItems || [], openItems: nextProps.initialOpenItems || [] });
			}
			if (!_.isEqual(nextProps.initialSelectedItems, this.props.initialSelectedItems))//TODO does not work with _.IsEqual
				this.setState({ selectedItems: nextProps.initialSelectedItems || [] });
			if (!_.isEqual(nextProps.initialOpenItems, this.props.initialOpenItems))
				this.setState({ openItems: nextProps.initialOpenItems || [] });
		}

		getOpen(node: IWeaveTreeNode): boolean
		{
			if (node === this.props.root && this.props.hideRoot)
				return true;
			else
				return node && !!this.state.openItems.find((otherNode) => otherNode.equals(node));
		}

		static arrayChanged<T>(arrayA: Array<T>, arrayB: Array<T>, itemEqFunc: (a: T, b: T) => boolean): boolean
		{
			return (arrayA.length != arrayB.length) || !arrayA.every((d, i, a) => itemEqFunc(d, arrayB[i]));
		}

		componentDidUpdate(prevProps: IWeaveTreeProps, prevState: IWeaveTreeState)
		{
			let nodeComp = (a: IWeaveTreeNode, b: IWeaveTreeNode) => {
				if (a && b)
					return a.equals(b);
				else
					return (a === b);
			};
			if (this.props.onSelect && WeaveTree.arrayChanged(prevState.selectedItems, this.state.selectedItems, nodeComp)) {
				this.props.onSelect(this.state.selectedItems);
			}

			if (this.props.onExpand && WeaveTree.arrayChanged(prevState.openItems, this.state.openItems, nodeComp)) {
				this.props.onExpand(this.state.openItems);
			}

			if (this.longestRowJSX)
			{
				let newColumnWidth = this.computeRowWidth(this.longestRowJSX);
				if (newColumnWidth != this.state.columnWidth)
				{
					this.setState({columnWidth: newColumnWidth});
				}
			}

			return;
		}

		componentDidMount():void
		{
			if (this.longestRowJSX)
			{
				let newColumnWidth = this.computeRowWidth(this.longestRowJSX);
				if (newColumnWidth != this.state.columnWidth)
				{
					this.setState({columnWidth: newColumnWidth});
				}
			}
		}

		private internalSetOpen(node: IWeaveTreeNode, value: boolean)
		{
			if (!node)
				return;
			let isOpen = this.getOpen(node);
			if (value == isOpen)
				return;

			let openItems = this.state.openItems;
			if (!isOpen)
				openItems = openItems.concat([node]);
			else if (isOpen)
				openItems = openItems.filter((other) => !node.equals(other));

			this.setState({ openItems });
		}

		static CLASSNAME = "weave-tree-view";
		static CONTAINER_CLASSNAME = "weave-tree-view-container";

		static BRANCH_ICON_CLASSNAME = "weave-tree-view-icon fa fa-folder fa-fw";
		static LEAF_ICON_CLASSNAME = "weave-tree-view-icon fa fa-file-text-o fa-fw";
		static OPEN_BRANCH_ICON_CLASSNAME = "weave-tree-view-icon fa fa-folder-open fa-fw";
		static EXPANDER_CLOSED_CLASS_NAME = "weave-tree-view-icon-expander fa fa-play fa-fw";
		static EXPANDER_OPEN_CLASS_NAME = "weave-tree-view-icon-expander fa fa-play fa-fw fa-rotate-90";
		static EXPANDER_HIDDEN_CLASS_NAME = "weave-tree-view-icon-expander fa fa-fw hidden-expander";

		private renderItem = (node: IWeaveTreeNode, index: number, depth: number): JSX.Element =>
		{
			let className = WeaveTree.CLASSNAME;
			let iconClassName = WeaveTree.LEAF_ICON_CLASSNAME;
			let iconClickFunc: React.MouseEventHandler = null;
			let doubleClickFunc: React.MouseEventHandler;
			let expanderClassName: string = WeaveTree.EXPANDER_HIDDEN_CLASS_NAME;

			let isOpen = this.getOpen(node);

			/* If we are a branch, we still might not be expandable due to hiding leaves and not having any children who are also branches. */
			let isExpandable = node.isBranch() && (!this.props.hideLeaves || node.hasChildBranches());

			if (node.isBranch())
			{
				iconClassName = isOpen ? WeaveTree.OPEN_BRANCH_ICON_CLASSNAME : WeaveTree.BRANCH_ICON_CLASSNAME;
			}

			if (isExpandable) {
				iconClickFunc = (e: React.MouseEvent): void => {
					this.internalSetOpen(node, !this.getOpen(node)); e.stopPropagation();
				};

				expanderClassName = isOpen ? WeaveTree.EXPANDER_OPEN_CLASS_NAME : WeaveTree.EXPANDER_CLOSED_CLASS_NAME;
			}
			else if (!node.isBranch() && this.props.onDoubleClick)
			{
				doubleClickFunc = (e: React.MouseEvent): void => {
					this.props.onDoubleClick && this.props.onDoubleClick(node);
				}
			}

			return <HBox key={index}
				className={className}
				onDoubleClick={ iconClickFunc || doubleClickFunc }
				style={{ alignItems: "center", width: "100%" }}>
				<HBox style={{ marginLeft: (depth || 0) * 16 + 5, whiteSpace: "nowrap" }}>
					<span style={{ alignSelf: "stretch", display: "flex" }}>
						<i
							onMouseDown={ iconClickFunc }
							onDoubleClick={(e) => e.stopPropagation() }
							className={ expanderClassName }
							style={{ alignSelf: "center" }}
						/>
					</span>
					<span style={{ alignSelf: "stretch", display: "flex" }}>
						<i
							style={{ alignSelf: "center" }}
							className={iconClassName}
						/>
					</span>
					{ " " + node.getLabel() }
				</HBox>
			</HBox>;
		};

		enumerateItems = (node: IWeaveTreeNode, result: Array<[number, IWeaveTreeNode]> = [], depth: number = 0): Array<[number, IWeaveTreeNode]> =>
		{
			if (!node)
				return result;

			if (this.props.filterFunc && !this.props.filterFunc(node))
			{
				return result;
			}

			if (node !== this.props.root || !this.props.hideRoot) {
				if (node.isBranch() || node == this.props.root || !this.props.hideLeaves) {
					result.push([depth, node]);
					depth++;
				}
			}

			if (node.isBranch() && this.getOpen(node)) {
				for (let child of node.getChildren()) {
					this.enumerateItems(child, result, depth);
				}
			}

			return result;
		};

		rowHeight: number;
		private lastEnumeration: [number, IWeaveTreeNode][];

		onSelect=(indices:string[])=>
		{
			let nodes = indices.map((index) => this.lastEnumeration[Number(index)][1]);
			this.setState({ selectedItems: nodes });
			for (let node of nodes)
				this.internalSetOpen(node, true);
		}

		computeRowWidth(rowJSX:React.ReactChild):number
		{
			var body = document.getElementsByTagName("body")[0];
			let div = document.createElement("span");
			body.appendChild(div);
			let renderedRow = ReactDOM.render(rowJSX as any, div); // TODO fix type of rowJSX
			let node = ReactDOM.findDOMNode(renderedRow) as HTMLDivElement;
			node.style.display = "inline-block";
			node.style.width = null;
			let width = node.offsetWidth;
			ReactDOM.unmountComponentAtNode(div);
			body.removeChild(div);

			return width * 1.5;
		}

		private longestRowJSX:React.ReactChild;

		render(): JSX.Element
		{
			if (Weave.isLinkable(this.props.root))
			{
				Weave.getCallbacks(this.props.root).addGroupedCallback(this, this.forceUpdate);
			}
			this.rowHeight = Math.max(DOMUtils.getTextHeightForClasses("M", WeaveTree.CLASSNAME), 22) + 5;
			let rootChildren = this.props.root && this.props.root.getChildren() || [];


			this.lastEnumeration = this.props.hideBranches ?
				rootChildren.filter((n) => !n.isBranch()).map((n):[number, IWeaveTreeNode]=>[0, n]) :
				this.enumerateItems(this.props.root);

			let selectedIndices:string[] = [];
			let maxRowIndex = -1;
			let maxRowLength = -Infinity;

			let rows = this.lastEnumeration.map(
				(row, index): { [columnId: string]: React.ReactChild } => {
					let [depth, item] = row;
					if (this.state.selectedItems.filter(_.identity).some(node => node.equals(item))) selectedIndices.push(index.toString());
					/* keep a running maximum node length */
					let rowLengthHeuristic = item.getLabel().length + depth;
					if (rowLengthHeuristic > maxRowLength)
					{
						maxRowLength = rowLengthHeuristic;
						maxRowIndex = index;
					}

					return ({ id: index.toString(), tree: this.renderItem(item, index, depth) });
				});

			if (rows[maxRowIndex])
				this.longestRowJSX = rows[maxRowIndex]["tree"];

			return <ObjectDataTable
				idProperty={"id"}
				headerHeight={0}
				rowHeight={this.rowHeight}
				columnIds={["tree"]}
				initialColumnWidth={this.state.columnWidth}
				rows={rows}
				selectedIds={selectedIndices}
				onSelection={this.onSelect}
				showBottomBorder={false}
				allowClear={false}
			/>;
		}
	}
}
