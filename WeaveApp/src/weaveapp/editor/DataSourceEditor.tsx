import * as React from "react";
import * as weavejs from "weavejs";
import {Weave} from "weavejs";

import {WeaveAPI} from "weavejs";

import HBox = weavejs.ui.flexbox.HBox;
import VBox = weavejs.ui.flexbox.VBox;
import Section = weavejs.ui.flexbox.Section;
import ResizingDiv = weavejs.ui.ResizingDiv;
import ReactUtils = weavejs.util.ReactUtils;
import SmartComponent = weavejs.ui.SmartComponent;
import DynamicComponent = weavejs.ui.DynamicComponent;
import StatefulTextField = weavejs.ui.StatefulTextField;
import MenuButton = weavejs.ui.menu.MenuButton;
import WeaveReactUtils = weavejs.util.WeaveReactUtils
import HelpIcon = weavejs.ui.HelpIcon;
import LinkableWatcher = weavejs.core.LinkableWatcher;
import IDataSource = weavejs.api.data.IDataSource;
import IWeaveTreeNode = weavejs.api.data.IWeaveTreeNode;
import IAttributeColumn = weavejs.api.data.IAttributeColumn;
import IQualifiedKey = weavejs.api.data.IQualifiedKey;
import IColumnReference = weavejs.api.data.IColumnReference;
import WeaveRootDataTreeNode = weavejs.data.hierarchy.WeaveRootDataTreeNode;
import ColumnUtils = weavejs.data.ColumnUtils;
import ReferencedColumn = weavejs.data.column.ReferencedColumn;
import StreamedGeometryColumn = weavejs.data.column.StreamedGeometryColumn;
import HierarchyUtils = weavejs.data.hierarchy.HierarchyUtils;
import ILinkableHashMap = weavejs.api.core.ILinkableHashMap;
import LinkableString = weavejs.core.LinkableString;
import WeaveDataSource = weavejs.data.source.WeaveDataSource;
import InteractiveTour from "weaveapp/dialog/InteractiveTour";
import TableTool from "weaveapp/tool/TableTool";
import WeaveDataTree from "weaveapp/ui/WeaveDataTree";

export const PREVIEW:"preview" = "preview";
export const METADATA:"metadata" = "metadata";
export const BROWSE:"browse" = "browse";
export type View = typeof PREVIEW | typeof METADATA | typeof BROWSE;

export interface IDataSourceEditorProps
{
	dataSource: IDataSource;
};

export interface IDataSourceEditorState
{
	selectedBranch?: IWeaveTreeNode & IColumnReference;
	selectedLeaf?: IWeaveTreeNode & IColumnReference;
	showPreviewView?: boolean;
	guideToTab?:string;
};

export default class DataSourceEditor extends SmartComponent<IDataSourceEditorProps, IDataSourceEditorState>
{
	dataSourceWatcher = WeaveReactUtils.forceUpdateWatcher(this, IDataSource);
	protected weaveRoot:ILinkableHashMap;

	constructor(props:IDataSourceEditorProps)
	{
		super(props);
		this.handleProps(props);
		this.setState({showPreviewView: false});
	}

	handleProps(props:IDataSourceEditorProps)
	{
		if (this.dataSourceWatcher.target != props.dataSource)
		{
			this.dataSourceWatcher.target = props.dataSource;
			this.setSelection(props, null, null);
		}
		else
		{
			this.setSelection(props, this.state.selectedBranch, this.state.selectedLeaf);
		}
	}

	componentWillReceiveProps(props:IDataSourceEditorProps)
	{
		this.handleProps(props);
	}

	componentWillUnmount()
	{
		ColumnUtils.map_root_firstDataSet.delete(this.weaveRoot);
	}

	getLabelEditor(labelLinkableString:LinkableString):[React.ReactChild, React.ReactChild]
	{
		return [
			<HBox padded style={{alignItems: "center", justifyContent: "flex-end"}}>
				{Weave.lang("Label")}
				<HelpIcon>{Weave.lang("A label used to identify this data source")}</HelpIcon>
			</HBox>,
			<StatefulTextField placeholder={this.props.dataSource.getLabel()} style={{ width: "100%", userSelect: false }} ref={WeaveReactUtils.linkReactStateRef(this, {value: labelLinkableString}, 500)}/>
		];
	}

	get editorFields():[React.ReactChild, React.ReactChild][]
	{
		return [
		];
	}

	renderFields():JSX.Element
	{
		let dataSource = this.props.dataSource;

		var tableStyles = {
			table: { width: "100%", fontSize: "inherit"},
			td: [
				{ paddingBottom: 8, textAlign: "right", whiteSpace: "nowrap"},
				{ paddingBottom: 8, paddingLeft: 8, width: "100%"}
			]
		};

		return ReactUtils.generateTable({body: this.editorFields, styles: tableStyles});
	}

	private static nodeEqualityFunc(a:IWeaveTreeNode, b:IWeaveTreeNode):boolean
	{
		if (a && b)
			return a.equals(b);
		else
			return (a === b);
	}

	private static isNotGeometryList(node:IWeaveTreeNode):boolean
	{
		let glnClass = (WeaveDataSource as any).GeomListNode;
		return !(node instanceof glnClass);
	}

	renderPreviewView():JSX.Element
	{
		let root = this.props.dataSource.getHierarchyRoot();
		var columns = this.getColumns();
		return (
			<Section style={{flex: 1}}>
				<div aria-label={Weave.lang("Preview of {0}", this.props.dataSource.getLabel())}>
					{Weave.lang("Preview")}
				</div>
				<HBox
					padded={root && root.hasChildBranches()}
					style={{flex: 1, border: "none"}}
				>
					<VBox style={{flex: root && root.hasChildBranches() ? 1 : 0, overflow: 'auto'}}>
						<WeaveDataTree
							root={root}
							hideLeaves={true}
							filterFunc={DataSourceEditor.isNotGeometryList}
							initialSelectedItems={this.state.selectedBranch ? [this.state.selectedBranch] : []}
							onSelect={(selectedItems) => this.setSelection(this.props, selectedItems && selectedItems[0], this.state.selectedLeaf)}
						/>
					</VBox>
					<VBox
						padded
						style={{flex: 1, overflow: 'auto'}}
						ref={InteractiveTour.getComponentRefCallback("Preview")}
					>
						{this.renderTablePreview(columns)}
					</VBox>
				</HBox>
			</Section>
		);
	}

	renderConfigureView():JSX.Element
	{
		let registry = WeaveAPI.ClassRegistry;
		let displayName:string = Weave.lang(WeaveAPI.ClassRegistry.getDisplayName(this.props.dataSource.constructor as typeof IDataSource));
		return (
			<Section overflow>
				<div aria-label={Weave.lang("Configure {0}:{1}", displayName, Weave.lang(this.props.dataSource.getLabel()))}>
					{Weave.lang("Configure {0}", displayName)}
				</div>
				{
					this.renderFields()
				}
			</Section>
		);
	}

	getColumns=():IColumnReference[] =>
	{
		var columnSiblings: IWeaveTreeNode[] = this.state.selectedBranch && this.state.selectedBranch.getChildren() || [];

		let leaves:IWeaveTreeNode[] = columnSiblings.filter((n) => !n.isBranch());
		if (!leaves)
			return [];

		var columns:IColumnReference[] = [];
		for (var leaf of leaves)
		{
			var columnRef = Weave.AS(leaf, IColumnReference);
			if (columnRef)
			{
				columns.push(columnRef);
				var meta = columnRef.getColumnMetadata();

				if (meta) {
					var column = WeaveAPI.AttributeColumnCache.getColumn(columnRef.getDataSource(), meta);
					// request all metadata for each geometry column so we get the list of keys
					for (var sgc of Weave.getDescendants(column, StreamedGeometryColumn))
						sgc.requestAllMetadata();
				}
			}
		}
		return columns;
	}

	renderTablePreview=(columnRefs:IColumnReference[]):JSX.Element =>
	{
		let refFunction = (c: TableTool) =>
		{
			if (!c)
				return;
			Weave.disposableChild(this.weaveRoot, c);
			c.sortFieldIndex.value = -1;
			ColumnUtils.replaceColumnsInHashMap(c.columns, columnRefs);
			c.handleShowKeyColumn(true);
		}

		return (
			<TableTool ref={refFunction}/>
		);
	};

	setSelection(props:IDataSourceEditorProps, newBranch:IWeaveTreeNode & IColumnReference, newLeaf:IWeaveTreeNode & IColumnReference)
	{
		let root = props.dataSource.getHierarchyRoot();

		let hasChildren:boolean = false;
		if (newBranch)
		{
			let children = newBranch.getChildren();
			hasChildren = children && (children.length > 0);
		}
		var branch =  hasChildren ? newBranch : root;
		var leaf = newLeaf;

		//firstDataSet should be set if there are leaves which are column refs and unset otherwise
		let weaveRoot = Weave.getRoot(props.dataSource);
		if (weaveRoot != this.weaveRoot)
		{
			ColumnUtils.map_root_firstDataSet.delete(this.weaveRoot);
			this.weaveRoot = weaveRoot;
		}
		var leaves = (branch && branch.getChildren() || []) as (IWeaveTreeNode & IColumnReference)[];
		leaves = leaves.filter(leaf => {
			var ref = Weave.AS(leaf, IColumnReference);
			return !!(ref && ref.getColumnMetadata());
		});
		if (leaves.length)
			ColumnUtils.map_root_firstDataSet.set(weaveRoot, leaves as any[]);
		else
			ColumnUtils.map_root_firstDataSet.delete(weaveRoot);

		// select the first leaf by default
		if (leaves.indexOf(leaf) < 0)
			leaf = leaves[0];

		this.setState({
			selectedBranch: branch,
			selectedLeaf: leaf
		});
	}
	/* Border and shadow of ui segements in Tab gives contrasting color to its backgrouund */
	render():JSX.Element
	{
		return (
			<VBox style={ {flex:1} }>
				{this.renderConfigureView()}
				{this.renderPreviewView()}
			</VBox>
		);
	}
}
