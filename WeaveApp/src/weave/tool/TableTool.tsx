import * as React from "react";
import * as ReactDOM from "react-dom";
import * as weavejs from "weavejs";
import {Weave} from "weavejs";

import Menu = weavejs.ui.menu.Menu;
import MenuItemProps = weavejs.ui.menu.MenuItemProps;
import MiscUtils = weavejs.util.MiscUtils;
import ReactUtils = weavejs.util.ReactUtils;
import StatefulTextField = weavejs.ui.StatefulTextField;
import WeaveReactUtils = weavejs.util.WeaveReactUtils
import Checkbox = weavejs.ui.Checkbox;

import FilteredKeySet = weavejs.data.key.FilteredKeySet;
import IAttributeColumn = weavejs.api.data.IAttributeColumn;
import IColumnReference = weavejs.api.data.IColumnReference;
import ILinkableHashMap = weavejs.api.core.ILinkableHashMap;
import LinkableHashMap = weavejs.core.LinkableHashMap;
import LinkableString = weavejs.core.LinkableString;
import LinkableNumber = weavejs.core.LinkableNumber;
import LinkableBoolean = weavejs.core.LinkableBoolean;
import DynamicKeyFilter = weavejs.data.key.DynamicKeyFilter;
import ColumnUtils = weavejs.data.ColumnUtils;
import KeySet = weavejs.data.key.KeySet;
import IQualifiedKey = weavejs.api.data.IQualifiedKey;
import QKey = weavejs.data.key.QKey;
import QKeyManager = weavejs.data.key.QKeyManager;
import IColumnWrapper = weavejs.api.data.IColumnWrapper;
import IInitSelectableAttributes = weavejs.api.ui.IInitSelectableAttributes;
import EventCallbackCollection = weavejs.core.EventCallbackCollection;
import ILinkableObjectWithNewProperties = weavejs.api.core.ILinkableObjectWithNewProperties;
import ISelectableAttributes = weavejs.api.data.ISelectableAttributes;
import KeyColumn = weavejs.data.column.KeyColumn;
import ColumnMetadata = weavejs.api.data.ColumnMetadata;
import AbstractVisTool from "./AbstractVisTool";
import {WeaveAPI} from "weavejs";
import PrintUtils from "../util/PrintUtils";
import IVisTool, {IVisToolProps, IVisToolState} from "../api/ui/IVisTool";
import {DataTable, SortTypes, SortDirection} from "../ui/DataTable";

export interface IDataTableState extends IVisToolState
{
	width?:number,
	height?:number
}

export interface TableEventData {
	key: IQualifiedKey;
	column: IAttributeColumn;
}

export class AttributeColumnTable extends DataTable<IQualifiedKey>
{
}

export default class TableTool extends React.Component<IVisToolProps, IDataTableState> implements IVisTool, IInitSelectableAttributes
{
	attributeColumnTable: AttributeColumnTable;

	columns = Weave.linkableChild(this, new LinkableHashMap(IAttributeColumn));

	sortFieldIndex = Weave.linkableChild(this, new LinkableNumber(0));
	columnWidth = Weave.linkableChild(this, new LinkableNumber(85));
	rowHeight = Weave.linkableChild(this, new LinkableNumber(30));
	headerHeight = Weave.linkableChild(this, new LinkableNumber(30));
	sortInDescendingOrder = Weave.linkableChild(this, new LinkableBoolean(false));

	panelTitle = Weave.linkableChild(this, new LinkableString);

	selectionFilter = Weave.linkableChild(this, DynamicKeyFilter);
	probeFilter = Weave.linkableChild(this, DynamicKeyFilter);
	filteredKeySet = Weave.linkableChild(this, FilteredKeySet);

	private get selectionKeySet() { return this.selectionFilter.getInternalKeyFilter() as KeySet; }
	private get probeKeySet() { return this.probeFilter.getInternalKeyFilter() as KeySet; }

	altText:LinkableString = Weave.linkableChild(this, new LinkableString(this.panelTitle.value));

	idProperty:string = ''; // won't conflict with any column name

	constructor(props:IVisToolProps)
	{
		super(props);
		Weave.getCallbacks(this).addGroupedCallback(this, this.forceUpdate);

		this.filteredKeySet.keyFilter.targetPath = ['defaultSubsetKeyFilter'];
		this.selectionFilter.targetPath = ['defaultSelectionKeySet'];
		this.probeFilter.targetPath = ['defaultProbeKeySet'];

		this.columns.addGroupedCallback(this, this.dataChanged, true);
		this.sortFieldIndex.addGroupedCallback(this, this.dataChanged, true);
		this.sortInDescendingOrder.addGroupedCallback(this, this.dataChanged, true);
		this.filteredKeySet.addGroupedCallback(this, this.dataChanged, true);
		this.selectionFilter.addGroupedCallback(this, this.forceUpdate);
		this.probeFilter.addGroupedCallback(this, this.forceUpdate);
		this.state = {
			width:0,
			height:0
		};
	}

	get deprecatedStateMapping()
	{
		return {showKeyColumn: this.handleShowKeyColumn};
	}

	handleShowKeyColumn = (value: boolean) =>
	{
		if (value)
		{
			let keyCols = this.columns.getObjects(KeyColumn);
			if (keyCols.length == 0)
			{
				let nameOrder:string[] = this.columns.getNames();
				this.columns.requestObject(null, KeyColumn);
				this.columns.setNameOrder(nameOrder);
			}
		}
		else
		{
			let keyColNames = this.columns.getNames(KeyColumn);
			for (let keyColName of keyColNames)
			{
				this.columns.removeObject(keyColName);
			}
		}
	};

	get keyColumnShown():boolean
	{
		let keyCols = this.columns.getObjects(KeyColumn);
		return keyCols.length > 0;
	}

	get title():string
	{
		return MiscUtils.evalTemplateString(this.panelTitle.value, this) || this.defaultPanelTitle;
	}

	componentDidMount()
	{
		Menu.registerMenuSource(this);
	}

	componentDidUpdate()
	{}

	getMenuItems():MenuItemProps[]
	{
		let menuItems:MenuItemProps[] = AbstractVisTool.getMenuItems(this);

		if (this.selectionKeySet && this.selectionKeySet.keys.length)
		{
			menuItems.push({
				label: Weave.lang("Move selected to top"),
				click: () => this.attributeColumnTable.moveSelectedToTop()
			});
		}

		if (Weave.beta)
			menuItems.push({
				label: Weave.lang("Print Tool (Beta)"),
				click: PrintUtils.printTool.bind(null, ReactDOM.findDOMNode(this))
			});

		return menuItems;
	}

	dataChanged()
	{
		var columns = this.columns.getObjects(IAttributeColumn);
		var names:string[] = this.columns.getNames();

		var sortDirections = columns.map((column, index) => {
			if (this.sortFieldIndex.value == index)
			{
				if (this.sortInDescendingOrder.value)
				{
					return -1;
				}
				return 1;
			}
			return 0;
		});

		this.filteredKeySet.setColumnKeySources(columns, sortDirections);
	}

	handleProbe=(ids:string[]) =>
	{
		if (!this.probeKeySet)
			return;
		if (ids && ids.length)
			this.probeKeySet.replaceKeys(ids && ids.map((id) => WeaveAPI.QKeyManager.stringToQKey(id)));
		else
			this.probeKeySet.clearKeys();
	};

	handleSelection=(ids:string[]) =>
	{
		this.selectionKeySet.replaceKeys(ids && ids.map((id) => WeaveAPI.QKeyManager.stringToQKey(id)));
	};

	get selectableAttributes()
	{
		return new Map<string, (IColumnWrapper | ILinkableHashMap)>()
			.set("Columns", this.columns);
	}

	get defaultPanelTitle():string
	{
		var columns = this.columns.getObjects() as IAttributeColumn[];
		if (columns.length == 0)
			return Weave.lang('Table');

		return Weave.lang("Table of {0}", columns.map(column=>ColumnUtils.getTitle(column)).join(Weave.lang(", ")));
	}

	static MAX_DEFAULT_COLUMNS = 10;
	initSelectableAttributes(input:(IAttributeColumn | IColumnReference)[]):void
	{
		input.slice(0, TableTool.MAX_DEFAULT_COLUMNS)
			.forEach((item, i) => ColumnUtils.initSelectableAttribute(this.columns, item, i == 0));
	}

	//todo:(pushCrumb)find a better way to link to sidebar UI for selectbleAttributes
	renderEditor =(pushCrumb:(title:string,renderFn:()=>JSX.Element , stateObject:any )=>void):JSX.Element =>
	{
		return ReactUtils.generateTable({
			body: IVisTool.renderSelectableAttributes(this.selectableAttributes, pushCrumb)
				  .concat(this.getTitlesEditor())
				  .concat([
					  [
						  Weave.lang("Show Key Column"),
						  <Checkbox label={" "} onChange={this.handleShowKeyColumn} value={this.keyColumnShown}/>
					  ]
				  ]),
			classes: {
				td: [
					"weave-left-cell",
					"weave-right-cell"
				]
			}
		});
	};

	getTitlesEditor():React.ReactChild[][]
	{
		return [
			[
				"Title",
				this.panelTitle,
				this.defaultPanelTitle
			]
		].map((row:[string, LinkableString]) => {

			return [
				Weave.lang(row[0]),
				<StatefulTextField ref={ WeaveReactUtils.linkReactStateRef(this, {value: row[1]})} placeholder={row[2] as string}/>
			]
		});
	}

	onSort = (columnKey:string, sortDirection:SortDirection) =>
	{
		this.sortFieldIndex.value = this.columns.getNames().indexOf(columnKey);
		this.sortInDescendingOrder.value = sortDirection == SortTypes.DESC;
	};

	events = Weave.linkableChild(this, new EventCallbackCollection<TableEventData>());

	handleCellDoubleClick = (rowId:string, columnKey:string)=>
	{
		let key: IQualifiedKey = WeaveAPI.QKeyManager.stringToQKey(rowId);
		let column: IAttributeColumn = this.columns.getObject(columnKey) as IAttributeColumn;

		this.events.dispatch({ key, column });
	}

	getCellValue = (row:IQualifiedKey, columnKey:string):React.ReactChild =>
	{
		if (columnKey === null)
		{
			return row.toString();
		}
		else
		{
			let column = this.columns.getObject(columnKey) as IAttributeColumn;
			return column.getValueFromKey(row, String);
		}
	}

	getColumnTitle = (columnKey:string):React.ReactChild =>
	{
		if (columnKey === null)
		{
			return Weave.lang("Key");
		}
		else
		{
			let column = this.columns.getObject(columnKey) as IAttributeColumn;
			return column && column.getMetadata(ColumnMetadata.TITLE);
		}
	}

	render()
	{
		var columnNames = this.columns.getNames(IAttributeColumn);
		if (WeaveAPI.Locale.reverseLayout)
			columnNames.reverse();

		return (
			<AttributeColumnTable
				columnTitles={this.getColumnTitle}
				rows={this.filteredKeySet.keys}
				idProperty={(key)=>key.toString()}
				getCellValue={this.getCellValue}
				selectedIds={this.selectionKeySet && this.selectionKeySet.keys.map(String) as any}
				probedIds={this.probeKeySet && this.probeKeySet.keys.map(String) as any}
				sortId={columnNames[this.sortFieldIndex.value]}
				sortDirection={this.sortInDescendingOrder.value == true ? SortTypes.DESC : SortTypes.ASC}
				onHover={this.handleProbe}
				onSelection={this.handleSelection}
				onCellDoubleClick={this.handleCellDoubleClick}
				columnIds={columnNames}
				rowHeight={this.rowHeight.value}
				headerHeight={this.headerHeight.value}
				initialColumnWidth={this.columnWidth.value}
				evenlyExpandRows={true}
				allowResizing={true}
				onSortCallback={this.onSort}
				ref={(c: AttributeColumnTable) => { this.attributeColumnTable = c } }
			/>
		);
	}
}

Weave.registerClass(
	TableTool,
	["weavejs.tool.TableTool", "weave.visualization.tools::TableTool", "weave.visualization.tools::AdvancedTableTool"],
	[IVisTool, ILinkableObjectWithNewProperties, ISelectableAttributes],
	"Table"
);
