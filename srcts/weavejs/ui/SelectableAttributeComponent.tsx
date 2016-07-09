import * as React from "react";
import * as _ from "lodash";
import {HBox} from "./flexbox/FlexBox";
import Button from "./Button";
import AttributeSelector from "./AttributeSelector";
import ComboBox from "./ComboBox";
import ControlPanel from "../editor/ControlPanel";
import ReactUtils from "../util/ReactUtils";
import DynamicComponent from "./DynamicComponent";

import ColumnUtils = weavejs.data.ColumnUtils;
import IColumnWrapper = weavejs.api.data.IColumnWrapper;
import LinkableHashMap = weavejs.core.LinkableHashMap;
import IWeaveTreeNode = weavejs.api.data.IWeaveTreeNode;
import ColumnMetadata = weavejs.api.data.ColumnMetadata;
import IDataSource = weavejs.api.data.IDataSource;
import HierarchyUtils = weavejs.data.hierarchy.HierarchyUtils;
import ILinkableObject = weavejs.api.core.ILinkableObject;
import ILinkableHashMap = weavejs.api.core.ILinkableHashMap;
import AlwaysDefinedColumn = weavejs.data.column.AlwaysDefinedColumn;
import IColumnReference = weavejs.api.data.IColumnReference;
import ReferencedColumn = weavejs.data.column.ReferencedColumn;
import IAttributeColumn = weavejs.api.data.IAttributeColumn;
import DynamicColumn = weavejs.data.column.DynamicColumn;
import WeaveRootDataTreeNode = weavejs.data.hierarchy.WeaveRootDataTreeNode;

export interface ISelectableAttributeComponentProps
{
	attributeName: string;
	attributes: Map<string, IColumnWrapper|ILinkableHashMap>
	pushCrumb?:(title:string,renderFn:()=>JSX.Element , stateObject:any)=>void;
	showAsList?:boolean;
	style?: React.CSSProperties;
	hideButton?: boolean;
}

export interface ISelectableAttributeComponentState
{
}

export default class SelectableAttributeComponent extends React.Component<ISelectableAttributeComponentProps, ISelectableAttributeComponentState>
{
	constructor (props:ISelectableAttributeComponentProps)
	{
		super(props);
		this.componentWillReceiveProps(props);
	}

	componentWillReceiveProps(nextProps:ISelectableAttributeComponentProps)
	{
		if (this.weaveRootTreeNode)
			Weave.getCallbacks(this.weaveRootTreeNode).removeCallback(this, this.forceUpdate);
		
		this.weaveRoot = Weave.getRoot(nextProps.attributes.get(nextProps.attributeName));
		this.weaveRootTreeNode = this.weaveRoot && new WeaveRootDataTreeNode(this.weaveRoot);
		
		if (this.weaveRootTreeNode)
			Weave.getCallbacks(this.weaveRootTreeNode).addGroupedCallback(this, this.forceUpdate);
	}

	private comboBox: ComboBox;
	private lastActiveNode:IWeaveTreeNode & IColumnReference;
	private weaveRoot:ILinkableHashMap;
	private weaveRootTreeNode:WeaveRootDataTreeNode;

	static findSelectableAttributes(attribute:IColumnWrapper|ILinkableHashMap, defaultLabel:string = "Data"):[string, Map<string, IColumnWrapper|ILinkableHashMap>]
	{
		var SA = 'selectableAttributes';
	
		var ancestor:ILinkableObject = attribute;
		while (ancestor && !((ancestor as any)[SA] instanceof Map)) // HACK
			ancestor = Weave.getOwner(ancestor);
		
		if (ancestor)
		{
			var map = (ancestor as any)[SA] as Map<string, IColumnWrapper|ILinkableHashMap>;
			if (map)
				for (var [key, value] of map.entries())
					if (value === attribute)
						return [key, map];
		}
		
		return [defaultLabel, new Map<string, IColumnWrapper|ILinkableHashMap>().set(defaultLabel, attribute)];
	}

	private static getDataSourceDependencies(attribute:IColumnWrapper|ILinkableHashMap):IDataSource[]
	{
		let dataSources: IDataSource[];

		let ilhm = Weave.AS(attribute, ILinkableHashMap);
		let icw = Weave.AS(attribute, IColumnWrapper);

		if (icw)
		{
			dataSources = ColumnUtils.getDataSources(icw);
		}
		else if (ilhm)
		{
			dataSources = _.flatten(ilhm.getObjects(IAttributeColumn).map(ColumnUtils.getDataSources)).filter(_.identity);
		}
		return dataSources;
	}

	renderAttributeSelectorForEditor=(attributeName:string):React.ReactChild =>
	{
		return <AttributeSelector attributeName={ attributeName } attributes={ this.props.attributes }/>
	};

	launchAttributeSelector=(attributeName:string):ControlPanel=>
	{
		if (this.props.pushCrumb)
		{
			this.props.pushCrumb("Attributes", this.renderAttributeSelectorForEditor.bind(this,attributeName),null);
			return null;
		}
		else
		{
			return AttributeSelector.openInstance(this, attributeName, this.props.attributes);
		}

	};
	
	private setColumn=(columnReference:IColumnReference)=> 
	{
		if (this.comboBox && ReactUtils.hasFocus(this.comboBox))
		{
			var dynamicColumn = ColumnUtils.hack_findInternalDynamicColumn(this.props.attributes.get(this.props.attributeName) as IColumnWrapper);
			
			if (columnReference)
			{
				let internalReferencedColumn = dynamicColumn.requestLocalObject(ReferencedColumn) as ReferencedColumn;
				internalReferencedColumn.setColumnReference(columnReference.getDataSource(), columnReference.getColumnMetadata());
			}
			else
			{
				dynamicColumn.removeObject();
			}
		}
	};
	
	setColumnInHashmap=(selectedOptions:IWeaveTreeNode[]):void=>
	{
		if (this.comboBox && ReactUtils.hasFocus(this.comboBox))
		{
			ColumnUtils.replaceColumnsInHashMap(this.columnsHashmap, selectedOptions);
		}
	};
	
	private get columnsHashmap()
	{
		return this.props.attributes.get(this.props.attributeName) as ILinkableHashMap;
	}

	render():JSX.Element
	{
		// set dependencies to make sure we re-render when necessary
		let attribute = this.props.attributes.get(this.props.attributeName);
		let dependencies = SelectableAttributeComponent.getDataSourceDependencies(attribute) as ILinkableObject[];
		dependencies.push(attribute);
		DynamicComponent.setDependencies(this, dependencies);
		
		let attribute_ilhm_or_icw = this.props.attributes.get(this.props.attributeName);

		let dropDownStyle: React.CSSProperties = this.props.hideButton ? {} : {
			borderBottomRightRadius: 0,
			borderTopRightRadius: 0
		};

		let buttonStyle: React.CSSProperties = {
			borderBottomLeftRadius: 0,
			borderTopLeftRadius: 0,
			borderLeft: "none"
		};

		if (Weave.IS(attribute_ilhm_or_icw, IColumnWrapper))
		{
			let attribute = attribute_ilhm_or_icw as IColumnWrapper;
			
			let node = ColumnUtils.hack_findHierarchyNode(attribute, true);
	
			if (node)
				this.lastActiveNode = node;
	
			let options:{value:IWeaveTreeNode, label: string}[] = [];
			
			let dataSource = node && node.getDataSource();
			let rootNode = dataSource && dataSource.getHierarchyRoot();
			let parentNode = rootNode && HierarchyUtils.findParentNode(rootNode, dataSource, node.getColumnMetadata());
			let header = <span style={{ fontWeight: "bold", fontSize: "small" }}>{ parentNode && parentNode.getLabel() }</span>;

			if (this.lastActiveNode)
			{
				options = HierarchyUtils.findSiblingNodes(this.lastActiveNode.getDataSource(), this.lastActiveNode.getColumnMetadata()).map((node) => {
					return {
						value: node,
						label: node.getLabel()
					}
				});
			}

			// when the data is added AFTER the tool editor is rendered, we need to populate the options
			if (options.length == 0)
			{
				options = ColumnUtils.findFirstDataSet(this.weaveRoot).concat().map((node)=>{
					return({
						value:node,
						label:node.getLabel()
					});
				});
			}


			return (
				<HBox overflow style={ _.merge({ flex: 1 }, this.props.style) } >
					<ComboBox
						noneOption={{label:"(None)", value:null}}
						ref={(c:ComboBox) => this.comboBox = c}
						title={Weave.lang("Change column")}
						style={dropDownStyle}
						searchable={true}
						value={node ? {label: node.getLabel(), value: node} : null}
						options={options}
						onChange={this.setColumn}
						header={header}
					/>
					{
						this.props.hideButton
						?	null
						:	<Button
								onClick={ () => this.launchAttributeSelector(this.props.attributeName) }
								style={buttonStyle}
								title={"Click to explore other DataSources for " + this.props.attributeName}
							>
								<i className="fa fa-angle-right" aria-hidden="true" style={ { fontWeight: "bold" } }/>
							</Button>
					}
				</HBox>
			);
		}
		else if (Weave.IS(attribute_ilhm_or_icw, ILinkableHashMap))
		{
			let attribute = attribute_ilhm_or_icw as ILinkableHashMap;
			
			var value: {label: string, value: IWeaveTreeNode}[] = [];

			var nodes = new Set<IWeaveTreeNode>();

			let siblings:IWeaveTreeNode[] = [];
			var columns = this.columnsHashmap.getObjects(IAttributeColumn);
			
			if (columns.length)
			{
				columns.forEach((column:IAttributeColumn, index:number)=>{
					let node = ColumnUtils.hack_findHierarchyNode(column, true);
					if (node)
					{
						this.lastActiveNode = node;
						value.push({label: node.getLabel(), value: node});
					}
					if (!this.lastActiveNode)
						return;
					var columnSiblings = HierarchyUtils.findSiblingNodes(this.lastActiveNode.getDataSource(), node.getColumnMetadata());
					columnSiblings.forEach( (siblingNode:IWeaveTreeNode&IColumnReference) => {
						nodes.add(siblingNode);
					});
				});
			}
			else if (this.lastActiveNode)
			{
				HierarchyUtils.findSiblingNodes(this.lastActiveNode.getDataSource(), this.lastActiveNode.getColumnMetadata()).forEach((node) => {
					nodes.add(node);
				});
			}

			// when the data is added AFTER the tool editor is rendered, we need to populate the options
			if (nodes.size == 0)
			{
				ColumnUtils.findFirstDataSet(this.weaveRoot).concat().map((node)=>{
					nodes.add(node);
				});
			}
			
			if (this.props.showAsList)
			{
				var listStyle:React.CSSProperties = {
					minHeight: '200px',
					overflow: 'auto',
					flex:1
				};
				
				// <VBox style={listStyle} className="weave-padded-vbox">
				// 	<List selectedValues={value.map((option) => option.value)} options={options}/>
				// 	<HBox className="weave-padded-hbox" style={controllerStyle}>
				// 		<Button onClick={ this.handleSelectAll }>{Weave.lang("Select all")}</Button>
				// 		<Button onClick={ this.removeSelected }>{Weave.lang("Remove selected")}</Button>
				// 	</HBox>
				// </VBox>

				return (
					<div/>
				);
			}
			else
			{
				return (
					<HBox overflow style={_.merge({flex: 1}, this.props.style)}>
						<ComboBox 
							ref={(c:ComboBox) => this.comboBox = c}
							type="multiple"
							searchable={true}
							style={dropDownStyle}
							value={value}
							noneOption={{label:"(None)", value:[]}}
							options={ Array.from(nodes.keys()).map( (node) => {
								return {label: node.getLabel(), value: node}
							})}
							onChange={this.setColumnInHashmap}
						/>
						{
							this.props.hideButton
							?	null
							:	<Button
									onClick={ () => this.launchAttributeSelector(this.props.attributeName) }
									style={buttonStyle}
									title={Weave.lang("Click to explore other DataSources for " + this.props.attributeName) }
								>
									<i className="fa fa-angle-right" aria-hidden="true" style={ { fontWeight: "bold" } }/>
								</Button>
						}
					</HBox>
				);
			}
		}
	}
}
