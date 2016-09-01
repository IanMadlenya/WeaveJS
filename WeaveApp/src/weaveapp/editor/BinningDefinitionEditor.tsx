import * as React from "react";
import * as weavejs from "weavejs";
import {Weave} from "weavejs";

import HBox = weavejs.ui.flexbox.HBox;
import VBox = weavejs.ui.flexbox.VBox;
import StatefulTextField = weavejs.ui.StatefulTextField;
import HelpIcon = weavejs.ui.HelpIcon;
import Input = weavejs.ui.Input;
import Checkbox = weavejs.ui.Checkbox;
import WeaveReactUtils = weavejs.util.WeaveReactUtils
import ReactUtils = weavejs.util.ReactUtils;
import Button = weavejs.ui.Button;
import ComboBox = weavejs.ui.ComboBox;
import SmartComponent = weavejs.ui.SmartComponent;
import DynamicTableClassNames = weavejs.util.DynamicTableClassNames;

import ILinkableObject = weavejs.api.core.ILinkableObject;
import ILinkableHashMap = weavejs.api.core.ILinkableHashMap;
import LinkableWatcher = weavejs.core.LinkableWatcher;
import LinkableString = weavejs.core.LinkableString;
import LinkableNumber = weavejs.core.LinkableNumber;
import BinnedColumn = weavejs.data.column.BinnedColumn;
import IBinningDefinition = weavejs.api.data.IBinningDefinition;
import AbstractBinningDefinition = weavejs.data.bin.AbstractBinningDefinition;
import SimpleBinningDefinition = weavejs.data.bin.SimpleBinningDefinition;
import CustomSplitBinningDefinition = weavejs.data.bin.CustomSplitBinningDefinition;
import QuantileBinningDefinition = weavejs.data.bin.QuantileBinningDefinition;
import EqualIntervalBinningDefinition = weavejs.data.bin.EqualIntervalBinningDefinition;
import StandardDeviationBinningDefinition = weavejs.data.bin.StandardDeviationBinningDefinition;
import CategoryBinningDefinition = weavejs.data.bin.CategoryBinningDefinition;
import NaturalJenksBinningDefinition = weavejs.data.bin.NaturalJenksBinningDefinition;
import DynamicBinningDefinition = weavejs.data.bin.DynamicBinningDefinition;
import IColumnWrapper = weavejs.api.data.IColumnWrapper;
import ColumnSelector from "weaveapp/ui/ColumnSelector";
import SelectableAttributeComponent from "weaveapp/ui/SelectableAttributeComponent";
import BinNamesList from "weaveapp/ui/BinNamesList";

// temporary hack
function Weave_linkState(a:any, b:any) { if (a != b) Weave.linkState(a, b); }

export interface BinningDefinitionEditorProps
{
	showNoneOption?:boolean;
	binnedColumn:BinnedColumn;
	compact?:boolean;
	onButtonClick?:React.MouseEventHandler;
	pushCrumb?:(title:string,renderFn:()=>JSX.Element , stateObject:any)=>void;
	insertTableRows?:React.ReactChild[][];
}

export interface BinningDefinitionEditorState
{
}

export default class BinningDefinitionEditor extends React.Component<BinningDefinitionEditorProps, BinningDefinitionEditorState>
{
	// mapping of readable Names with Class Names for UI
	static binClassToBinLabel = new Map<typeof AbstractBinningDefinition, string>()
		.set(SimpleBinningDefinition, "Equally spaced")
		.set(CustomSplitBinningDefinition, "Custom breaks")
		.set(QuantileBinningDefinition, "Quantile")
		.set(EqualIntervalBinningDefinition, "Equal interval")
		.set(StandardDeviationBinningDefinition, "Standard deviations")
		.set(NaturalJenksBinningDefinition, "Natural breaks")
		.set(CategoryBinningDefinition, "All categories (string values)");

	constructor(props:BinningDefinitionEditorProps)
	{
		super(props);
	}

	onBinButtonClick=(event:React.MouseEvent)=>
	{
		// render for Weave Tool editor
		if (this.props.pushCrumb)
		{
			this.props.pushCrumb("Binning",this.renderBinningDefinitionSelectorForEditor,null);
		}
		else if (this.props.onButtonClick)
		{
			this.props.onButtonClick(event);
		}
	};

	renderBinningDefinitionSelectorForEditor=():JSX.Element=>{
		var [attributeName, attributes] = ColumnSelector.findSelectableAttributes(this.props.binnedColumn);
		return <BinningDefinitionSelector
					showNoneOption={this.props.showNoneOption}
					attributeName={attributeName}
					attributes={attributes}
					pushCrumb={this.props.pushCrumb}
				/>

	};

	renderCompactView() // render for Weave Tool Editor
	{
		var binDef = this.props.binnedColumn.binningDefinition.target as AbstractBinningDefinition;
		var binLabel:string = binDef ? BinningDefinitionEditor.binClassToBinLabel.get(binDef.constructor as typeof AbstractBinningDefinition) : "None";

		var tableStyles = {
			table: { width: "100%", fontSize: "inherit"},
			td: [
				{ textAlign: "right", whiteSpace: "nowrap", paddingRight: 8},
				{ paddingBottom: 8, width: "100%", paddingLeft: 8}
			]
		};

		//todo replace with statefull textfield readonly true for binlabel
		return (
			<HBox className="weave-padded-hbox" style={ { alignItems: "center"} }>
				<span style={{flex: 1, textAlign: "right"}}>{binLabel}</span>
				<Button onClick={this.onBinButtonClick}>
					<i className="fa fa-angle-right" aria-hidden="true" style={ {fontWeight:"bold"} }/>
				</Button>
			</HBox>
		);
	}

	renderFullView() // render for PopUp
	{
		var [attributeName, attributes] = ColumnSelector.findSelectableAttributes(this.props.binnedColumn);
		return (
			<BinningDefinitionSelector
				showNoneOption={this.props.showNoneOption}
				attributeName={attributeName}
				attributes={attributes}
				pushCrumb={this.props.pushCrumb}
				insertTableRows={this.props.insertTableRows}
			/>
		);
	}

	render()
	{
		return this.props.compact ? this.renderCompactView() : this.renderFullView();
	}
}

export interface BinningDefinitionSelectorProps
{
	showNoneOption?: boolean;
	attributeName: string;
	attributes: Map<string, IColumnWrapper|ILinkableHashMap>;
	pushCrumb?: (title:string,renderFn:()=>JSX.Element , stateObject:any)=>void;
	insertTableRows?: React.ReactChild[][];
}

export interface BinningDefinitionSelectorState
{
}

// internal component which re-renders when binnig defintion of target binned column changes

export class BinningDefinitionSelector extends SmartComponent<BinningDefinitionSelectorProps, BinningDefinitionSelectorState>
{
	private _simple:SimpleBinningDefinition = Weave.disposableChild(this, SimpleBinningDefinition);
	private _customSplit:CustomSplitBinningDefinition = Weave.disposableChild(this, CustomSplitBinningDefinition);
	private _quantile:QuantileBinningDefinition = Weave.disposableChild(this, QuantileBinningDefinition);
	private _equalInterval:EqualIntervalBinningDefinition = Weave.disposableChild(this, EqualIntervalBinningDefinition);
	private _stdDev:StandardDeviationBinningDefinition = Weave.disposableChild(this, StandardDeviationBinningDefinition);
	private _category:CategoryBinningDefinition = Weave.disposableChild(this, CategoryBinningDefinition);
	private _jenks:NaturalJenksBinningDefinition = Weave.disposableChild(this, NaturalJenksBinningDefinition);

	private _allBinDefs = [this._simple, this._customSplit, this._quantile, this._equalInterval, this._stdDev, this._category, this._jenks];

	private binLabelToBin = new Map<string, AbstractBinningDefinition>()
		.set("Equally spaced", this._simple)
		.set("Custom breaks", this._customSplit)
		.set("Quantile", this._quantile)
		.set("Equal interval", this._equalInterval)
		.set("Standard deviations", this._stdDev)
		.set("Natural breaks", this._jenks)
		.set("All categories (string values)", this._category)
		.set("None", null);

	static defaultProps:BinningDefinitionSelectorProps = {
		showNoneOption: true,
		attributeName: undefined,
		attributes: undefined
	};

	constructor(props:BinningDefinitionSelectorProps)
	{
		super(props);

		for (var def of this._allBinDefs)
			Weave.getCallbacks(def).addGroupedCallback(this, this.updateTargetBinningDef);

		// render again if binningDefinition changes
		if (this.column)
		{
			this.column.binningDefinition.addGroupedCallback(this, this.forceUpdate);
			this.handleBinnedColumnChange(this.column);
		}
	}

	get column():BinnedColumn
	{
		return this.getColumn(this.props);
	}

	getColumn(props:BinningDefinitionSelectorProps):BinnedColumn
	{
		var icw:IColumnWrapper = props.attributes.get(props.attributeName) as IColumnWrapper;
		return Weave.AS(icw, BinnedColumn) || Weave.getDescendants(icw, BinnedColumn)[0]; // hacky
	}

	componentWillReceiveProps(nextProps:BinningDefinitionSelectorProps)
	{
		var newColumn = this.getColumn(nextProps);
		if (this.column !== newColumn)
		{
			if (this.column)
				this.column.binningDefinition.removeCallback(this, this.forceUpdate);

			if (newColumn)
			{
				newColumn.binningDefinition.addGroupedCallback(this, this.forceUpdate);
				this.handleBinnedColumnChange(newColumn);
			}
		}
	}

	private handleBinnedColumnChange(binnedColumn:BinnedColumn)
	{
		let selectedBinDefn:AbstractBinningDefinition = binnedColumn.binningDefinition.target as AbstractBinningDefinition;
		for (var localDef of this._allBinDefs)
			if (this.compareTargetBinningType(localDef))
				Weave.copyState(selectedBinDefn, localDef);
	}

	private compareTargetBinningType(localDef:AbstractBinningDefinition):boolean
	{
		let selectedBinDefn:AbstractBinningDefinition = this.column.binningDefinition.target as AbstractBinningDefinition;
		if (localDef == null && selectedBinDefn == null) // scenario arises when we None option is selected
			return true;
		if (localDef && selectedBinDefn)
			return localDef.constructor == selectedBinDefn.constructor;
		return false; // can only get here if the binDef is null
	}

	private updateTargetBinningDef()
	{
		var targetDef = this.column.binningDefinition.target;
		if (targetDef)
			for (var localDef of this._allBinDefs)
				if (this.compareTargetBinningType(localDef))
					Weave.copyState(localDef, targetDef)
	}

	private linkOverride(property:"overrideInputMin"|"overrideInputMax")
	{
		for (var def of this._allBinDefs)
		{
			var abd:any = def;
			if (abd[property] && this.compareTargetBinningType(def))
			{
				return WeaveReactUtils.linkReactStateRef(this, {value: abd[property]}, 500);
			}
		}
	}

	setBinningDefinition(localDef:AbstractBinningDefinition)
	{
		let targetDef:AbstractBinningDefinition = this.column.binningDefinition.target as AbstractBinningDefinition;
		if (localDef)
		{
			if (targetDef && localDef.constructor == targetDef.constructor)
				return;
			this.column.binningDefinition.requestLocalObjectCopy(localDef);
			// requestLocalObjectCopy will give selectedBinDefn.
			targetDef = this.column.binningDefinition.target as AbstractBinningDefinition;
			Weave.linkState(targetDef, localDef);
		}
		else
		{
			this.column.binningDefinition.target = null;
		}
	}

	private linkBinningDefinition(value:LinkableString|LinkableNumber)
	{
		return WeaveReactUtils.linkReactStateRef(this, {value}, 500);
	}

	private hasOverrideMinAndMax():boolean
	{
		var binDef:AbstractBinningDefinition = this.column.binningDefinition.target as AbstractBinningDefinition;
		return !!(binDef && binDef.overrideInputMin && binDef.overrideInputMax);
	}

	private getBinDefRenderProps(binDef:AbstractBinningDefinition):any
	{
		let renderObj:any = {
			sessionObjectToLink:null,
			sessionObjectLabel:"",
			helpMessage:"",
			style: {width: 60}
		}

		if (binDef instanceof SimpleBinningDefinition)
		{
			Weave_linkState(binDef, this._simple);
			renderObj.sessionObjectToLink = (binDef as SimpleBinningDefinition).numberOfBins;
			renderObj.sessionObjectLabel = "Number of bins";
			renderObj.helpMessage = 'Example: If your data is between 0 and 100 and you specify 4 bins, the following bins will be created: [0,25] [25,50] [50,75] [75,100]';
		}
		else if (binDef instanceof EqualIntervalBinningDefinition)
		{
			Weave_linkState(binDef, this._equalInterval);
			renderObj.sessionObjectToLink = (binDef as EqualIntervalBinningDefinition).dataInterval;
			renderObj.sessionObjectLabel = "Data interval";
			renderObj.helpMessage = 'Example: If your data is between 0 and 100 and you specify an interval of 25, four bins will be created: [0,25] [25,50] [50,75] [75,100]';
		}
		else if (binDef instanceof QuantileBinningDefinition)
		{
			Weave_linkState(binDef, this._quantile);
			renderObj.sessionObjectToLink = (binDef as QuantileBinningDefinition).refQuantile;
			renderObj.sessionObjectLabel = "Reference quantile";
			renderObj.helpMessage = 'Example: If you specify 0.25, four bins will be created that each contain 25% of your data in sorted order'
		}
		else if (binDef instanceof NaturalJenksBinningDefinition)
		{
			Weave_linkState(binDef, this._jenks);
			renderObj.sessionObjectToLink = (binDef as NaturalJenksBinningDefinition).numOfBins;
			renderObj.sessionObjectLabel = "Number of bins";
			renderObj.helpMessage = 'The Jenks optimization method, also called the Jenks natural breaks classification method, is a data classification method designed to determine the best arrangement of values into different classes. See http://en.wikipedia.org/wiki/Jenks_natural_breaks_optimization';
		}
		else if (binDef instanceof CustomSplitBinningDefinition)
		{
			Weave_linkState(binDef, this._customSplit);
			renderObj.sessionObjectToLink = (binDef as CustomSplitBinningDefinition).splitValues;
			renderObj.sessionObjectLabel = "Break values";
			renderObj.helpMessage = 'Enter comma-separated custom break values for dividing the data into bins. Example: 0,50,100 will create two bins: [0,50] and [50,100]';
			renderObj.style = {flex: 5};
		}
		else if (binDef instanceof StandardDeviationBinningDefinition)
		{
			Weave_linkState(binDef, this._stdDev);
			renderObj.helpMessage = 'Six bins will be created for standard deviations above and below the mean value.';
		}

		return renderObj;
	}

	render ()
	{
		var options = Array.from(this.binLabelToBin.keys()) as string[];
		if (!this.props.showNoneOption)
			options = options.filter(key => !!this.binLabelToBin.get(key));

		let selectedBinDefn:AbstractBinningDefinition = this.column.binningDefinition.target as AbstractBinningDefinition;
		let selectedDefinitionName = selectedBinDefn ? BinningDefinitionEditor.binClassToBinLabel.get(selectedBinDefn.constructor as typeof AbstractBinningDefinition) : "None"

		if (this.props.pushCrumb)
		{
			let renderProps:any = this.getBinDefRenderProps(selectedBinDefn);
			return (
				<VBox overflow className="weave-padded-vbox">
					{ReactUtils.generateTable({
						body: [].concat(
							this.props.insertTableRows || [],
							[
								[
									Weave.lang(this.props.attributeName),
									<SelectableAttributeComponent attributeName={ this.props.attributeName }
																  attributes={ this.props.attributes }
																  pushCrumb={ this.props.pushCrumb }/>
								],
								[
									Weave.lang('Binning method'),
									<HBox overflow className="weave-padded-hbox" style={ {alignItems: "center"} }>
										<ComboBox
											style={ {flex: 1} }
											options={options}
											value={selectedDefinitionName}
											onChange={(binLabel) => this.setBinningDefinition(this.binLabelToBin.get(binLabel))}
										/>
										<HelpIcon style={ {fontSize: "initial"} }>
											{ Weave.lang(renderProps.helpMessage) }
										</HelpIcon>
									</HBox>
								],
								renderProps.sessionObjectToLink && [
									<span style={ {whiteSpace: "nowrap"} }> { Weave.lang(renderProps.sessionObjectLabel) } </span>,
									<StatefulTextField
										style={{flex: 1}}
										type="text"
										ref={this.linkBinningDefinition(renderProps.sessionObjectToLink)}
									/>
								],
								this.hasOverrideMinAndMax() && [
									<span style={{whiteSpace: "nowrap"}}> {Weave.lang("Override data range")}</span>,
									<HBox className="weave-padded-hbox" style={{alignItems: "center"}}>
										<StatefulTextField
											type="number"
											placeholder="min"
											style={{flex: 1}}
											ref={this.linkOverride("overrideInputMin")}
										/>
										<StatefulTextField
											type="number"
											placeholder="max"
											style={{flex: 1}}
											ref={this.linkOverride("overrideInputMax")}
										/>
									</HBox>
								]
							]
						),
						classes: {
							td: ["weave-left-cell", "weave-right-cell"]
						}
					})}
					{
						selectedBinDefn
						?	<HBox style={ {flex: 1} }>
								<BinNamesList binningDefinition={selectedBinDefn as AbstractBinningDefinition}/>
							</HBox>
						:	null
					}
				</VBox>
			);
		}

		let binUIs:JSX.Element[] = [];
		for (let [key, binDefn] of this.binLabelToBin.entries())
		{
			if (!binDefn && !this.props.showNoneOption)
				continue;

			let isSelected:boolean = this.compareTargetBinningType(binDefn);

			let renderProps:any = this.getBinDefRenderProps(binDefn);

			binUIs.push(
				<HBox
					padded
					overflow
					key={key}
					style={ {alignItems: "center"} }
				>
					<Checkbox type="radio"
							  name="binningDefinitions"
							  value={ isSelected }
							  label={ Weave.lang(key) }
							  onChange = {(value)=> value ? this.setBinningDefinition(binDefn):null}
					/>
					<span style={ {flex:1} }/>
					{
						renderProps.sessionObjectToLink
						?	[
								<span key="0" style={ {opacity: isSelected ? 1 : 0.5, whiteSpace: "nowrap"} }> { Weave.lang(renderProps.sessionObjectLabel) } </span>,
								<StatefulTextField
									key="1"
									style={ renderProps.style }
									disabled={!isSelected}
									type="text"
									ref={this.linkBinningDefinition(renderProps.sessionObjectToLink)}
								/>
							]
						:	null
					}
					<HelpIcon style={ {fontSize: "initial"} }> { Weave.lang(renderProps.helpMessage) } </HelpIcon>
				</HBox>
			);
		}

		return (
			<HBox padded style={{flex: 1}}>
				<VBox padded style={{flex: 1, justifyContent: "space-between"}} className="weave-container">
					{Weave.lang("Binning type:")}
					{binUIs}
				</VBox>
				<VBox padded className="weave-container" style={{flex: 1, padding: 8, overflow: "auto"}}>
					{
						this.hasOverrideMinAndMax()
							?	<HBox padded style={{alignItems: "center"}}>
									<span style={{whiteSpace: "nowrap"}}> {Weave.lang("Override data range")}</span>
									<StatefulTextField type="number" style={{flex: 1}}
													   ref={this.linkOverride("overrideInputMin")} placeholder="min"/>
									<StatefulTextField type="number" style={{flex: 1}}
													   ref={this.linkOverride("overrideInputMax")} placeholder="max"/>
								</HBox>
							:	null
						}
					<HBox style={{flex: 1}}>
						<BinNamesList binningDefinition={selectedBinDefn}/>
					</HBox>
				</VBox>
			</HBox>
		);
	}
}
