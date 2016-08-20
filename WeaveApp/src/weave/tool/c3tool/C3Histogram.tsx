import * as React from "react";
import * as weavejs from "weavejs";
import * as d3 from "d3";
import * as c3 from "c3";
import * as _ from "lodash";
import {Weave} from "weavejs";
import {WeaveAPI} from "weavejs";

import HBox = weavejs.ui.flexbox.HBox;
import VBox = weavejs.ui.flexbox.VBox;
import ReactUtils = weavejs.util.ReactUtils;
import ChartAPI = c3.ChartAPI;
import ChartConfiguration = c3.ChartConfiguration;
import DOMUtils = weavejs.util.DOMUtils;
import MouseEvent = React.MouseEvent;
import ToolTip = weavejs.ui.ToolTip;
import Checkbox = weavejs.ui.Checkbox;
import ComboBox = weavejs.ui.ComboBox;
import Accordion = weavejs.ui.Accordion;
import WeaveReactUtils = weavejs.util.WeaveReactUtils
import Button = weavejs.ui.Button;
import DynamicComponent = weavejs.ui.DynamicComponent;
import StatefulTextField = weavejs.ui.StatefulTextField;

import IQualifiedKey = weavejs.api.data.IQualifiedKey;
import IAttributeColumn = weavejs.api.data.IAttributeColumn;
import BinnedColumn = weavejs.data.column.BinnedColumn;
import FilteredColumn = weavejs.data.column.FilteredColumn;
import ColorColumn = weavejs.data.column.ColorColumn;
import ColorRamp = weavejs.util.ColorRamp;
import FilteredKeySet = weavejs.data.key.FilteredKeySet;
import LinkableString = weavejs.core.LinkableString;
import LinkableBoolean = weavejs.core.LinkableBoolean;
import DynamicColumn = weavejs.data.column.DynamicColumn;
import SimpleBinningDefinition = weavejs.data.bin.SimpleBinningDefinition;
import StandardLib = weavejs.util.StandardLib;
import LinkableNumber = weavejs.core.LinkableNumber;
import IColumnWrapper = weavejs.api.data.IColumnWrapper;
import ILinkableHashMap = weavejs.api.core.ILinkableHashMap;
import IColumnReference = weavejs.api.data.IColumnReference;
import ColumnUtils = weavejs.data.ColumnUtils;
import ILinkableObjectWithNewProperties = weavejs.api.core.ILinkableObjectWithNewProperties;
import ISelectableAttributes = weavejs.api.data.ISelectableAttributes;
import JS = weavejs.util.JS;
import FormatUtils from "../../util/FormatUtils";
import BinningDefinitionEditor from "../../editor/BinningDefinitionEditor";
import ColorRampEditor from "../../editor/ColorRampEditor";
import SelectableAttributeComponent from "../../ui/SelectableAttributeComponent";
import AbstractC3Tool from "./AbstractC3Tool";
import SolidLineStyle from "../../plot/SolidLineStyle";
import SolidFillStyle from "../../plot/SolidFillStyle";
import ChartUtils from "../../util/ChartUtils";
import IVisTool, {IVisToolProps} from "../../api/ui/IVisTool";
import IAltText from "../../api/ui/IAltText";
import ColorPicker from "../../ui/ColorPicker";

declare type Record = {
	id: IQualifiedKey,
	binnedColumn: number,
	columnToAggregate: number
};

const COUNT = "count";
const SUM = "sum";
const MEAN = "mean";
declare type AggregationMethod = "count"|"sum"|"mean";

export default class C3Histogram extends AbstractC3Tool
{
	binnedColumn = Weave.linkableChild(this, BinnedColumn, this.setColorColumn, true);
	columnToAggregate = Weave.linkableChild(this, DynamicColumn);
	aggregationMethod = Weave.linkableChild(this, new LinkableString("count"));
	fill = Weave.linkableChild(this, SolidFillStyle);
	line = Weave.linkableChild(this, SolidLineStyle);
	barWidthRatio = Weave.linkableChild(this, new LinkableNumber(0.95), this.verifyBarRatio);
	horizontalMode = Weave.linkableChild(this, new LinkableBoolean(false));
	showValueLabels = Weave.linkableChild(this, new LinkableBoolean(false));
	xAxisLabelAngle = Weave.linkableChild(this, new LinkableNumber(-45));

	private verifyBarRatio(ratio:number):boolean
	{
		return (0.0 < ratio) && (ratio < 1.0);
	}

	initSelectableAttributes(input:(IAttributeColumn | IColumnReference)[]):void
	{
		ColumnUtils.initSelectableAttribute(this.fill.color, input[0]);
	}

	get colorColumn()
	{
		return Weave.AS(this.fill.color.getInternalColumn(), ColorColumn);
	}
	private _callbackRecursion:boolean = false;
	private setColorColumn():void
	{
		if (this._callbackRecursion)
			return;
		this._callbackRecursion = true; // helps prevents both call backs from calling each other
		var colorBinCol:BinnedColumn = this.internalColorColumn ? Weave.AS(this.internalColorColumn.getInternalColumn(), BinnedColumn) : null;
		if (colorBinCol) {
			if (colorBinCol.binningDefinition.internalObject)
				Weave.copyState(this.binnedColumn, colorBinCol);
			else
				Weave.copyState(this.binnedColumn.internalDynamicColumn, colorBinCol.internalDynamicColumn);
		}
		this._callbackRecursion = false;
	}

	private setBinnedColumn():void
	{
		if (this._callbackRecursion)
			return;
		this._callbackRecursion = true;
		var colorBinCol:BinnedColumn = this.internalColorColumn ? Weave.AS(this.internalColorColumn.getInternalColumn(), BinnedColumn) : null;
		if (colorBinCol)
		{
			// if there is a binning definition, copy it - otherwise, only copy the internal column
			if (colorBinCol.binningDefinition.internalObject)
				Weave.copyState(colorBinCol, this.binnedColumn);
			else
				Weave.copyState(colorBinCol.internalDynamicColumn, this.binnedColumn.internalDynamicColumn);

			var filteredColumn = Weave.AS(this.binnedColumn.getInternalColumn(), FilteredColumn);
			if (filteredColumn)
				Weave.linkState(this.filteredKeySet.keyFilter, filteredColumn.filter);
		}
		this._callbackRecursion = false;
	}

	private get RECORD_FORMAT() {
		return {
			id: IQualifiedKey,
			binnedColumn: this.binnedColumn,
			columnToAggregate: this.columnToAggregate
		}
	};

	private RECORD_DATATYPE = {
		binnedColumn: Number,
		columnToAggregate: Number
	};

	private histData:{[key:string]: number}[];
	private keys:{x?:string, value:string[]};
	private records:Record[];
	protected c3ConfigYAxis:c3.YAxisConfiguration;

	get internalColorColumn():ColorColumn {
		return Weave.AS(this.fill.color.getInternalColumn(), ColorColumn);
	}

	constructor(props:IVisToolProps)
	{
		super(props);

		this.filteredKeySet.setSingleKeySource(this.fill.color);

		this.filteredKeySet.keyFilter.targetPath = ['defaultSubsetKeyFilter'];
		this.selectionFilter.targetPath = ['defaultSelectionKeySet'];
		this.probeFilter.targetPath = ['defaultProbeKeySet'];

		Weave.getCallbacks(this.fill.color.internalDynamicColumn).addGroupedCallback(this, this.setBinnedColumn);

		// don't lock the ColorColumn, so linking to global ColorColumn is possible
		var _colorColumn:ColorColumn = this.fill.color.internalDynamicColumn.requestLocalObject(ColorColumn, false);
		_colorColumn.ramp.setSessionState([0x808080]);
		var _binnedColumn:BinnedColumn = _colorColumn.internalDynamicColumn.requestLocalObject(BinnedColumn, true);
		_binnedColumn.internalDynamicColumn.requestLocalObject(FilteredColumn, true);

		this.mergeConfig({
			data: {
				columns: [],
				type: "bar",
				xSort: false,
				names: {},
				labels: {
					format: (v, id, i, j) => {
						if (this.showValueLabels.value)
						{
							return FormatUtils.defaultNumberFormatting(v);
						}
						else
						{
							return "";
						}
					}
				},
				color: (color:string, d:any):string => {
					if (d && d.hasOwnProperty("index"))
					{
						var binIndex = d.index;
						if (WeaveAPI.Locale.reverseLayout)
							binIndex = this.histData.length - 1 - binIndex;
						var cc = this.internalColorColumn;
						if (cc)
							return StandardLib.getHexColor(cc.getColorFromDataValue(binIndex));
					}
					return "#808080";
				},
				onmouseover: (d:any) => {
					if (d && d.hasOwnProperty("index"))
					{
						var keys = this.binnedColumn.getKeysFromBinIndex(d.index);
						if (!keys)
							return;
						if (this.probeKeySet)
							this.probeKeySet.replaceKeys(keys);
						this.toolTip.show(this, this.chart.internal.d3.event, keys, [this.binnedColumn, this.columnToAggregate]);
					}
				}
			},
			legend: {
				show: false
			},
			axis: {
				x: {
					type: "category",
					label: {
						text: "",
						position: "outer-center"
					},
					tick: {
						rotate: this.xAxisLabelAngle.value,
						culling: {
							max: null
						},
						multiline: false,
						format: (num:number):string => {
							if (this.element)
							{
								var labelString:string = Weave.lang(this.getLabelString(num));
								if (labelString)
								{
									return this.formatXAxisLabel(labelString,this.xAxisLabelAngle.value);
								}
								else
								{
									return "";
								}
							}
							else
							{
								return Weave.lang(this.binnedColumn.deriveStringFromNumber(num));
							}
						}
					}
				},
				rotated: false
			},
			grid: {
				x: {
					show: true
				},
				y: {
					show: true
				}
			},
			bar: {
				width: {
					ratio: NaN
				}
			}
		});
		this.c3ConfigYAxis = {
			show: true,
			label: {
				text: "",
				position: "outer-middle"
			},
			tick: {
				fit: false,
				format: (num:number):string => {
					return Weave.lang(String(FormatUtils.defaultNumberFormatting(num)));
				}
			}
		}
	}

	private getLabelString(num:number):string
	{
		if (WeaveAPI.Locale.reverseLayout)
		{
			//handle case where labels need to be reversed
			var temp:number = this.histData.length-1;
			return Weave.lang(this.binnedColumn.deriveStringFromNumber(temp-num));
		}
		else
			return Weave.lang(this.binnedColumn.deriveStringFromNumber(num));
	}

	get defaultXAxisLabel():string
	{
		return Weave.lang(this.binnedColumn.getMetadata('title'));
	}

	get defaultYAxisLabel():string
	{
		if (this.columnToAggregate.getInternalColumn())
		{
			switch (this.aggregationMethod.value)
			{
				case COUNT:
					return Weave.lang("Number of records");
				case SUM:
					return Weave.lang("Sum of {0}", Weave.lang(this.columnToAggregate.getMetadata('title')));
				case MEAN:
					return Weave.lang("Mean of {0}", Weave.lang(this.columnToAggregate.getMetadata('title')));
			}
		}
		else
		{
			return Weave.lang("Number of records");
		}
	}

	private getYAxisLabel():string
	{
		var overrideAxisName = this.yAxisName.value;
		if (overrideAxisName)
		{
			return overrideAxisName;
		}
		else
		{
			return this.defaultYAxisLabel;
		}
	}

	protected handleC3Selection():void
	{
		if (!this.selectionKeySet)
			return;

		var set_selectedKeys = new Set<IQualifiedKey>();
		var selectedKeys:IQualifiedKey[] = [];
		for (var d of this.chart.selected())
		{
			var keys = this.binnedColumn.getKeysFromBinIndex(d.index);
			if (!keys)
				continue;
			for (var key of keys)
			{
				if (!set_selectedKeys.has(key))
				{
					set_selectedKeys.add(key);
					selectedKeys.push(key);
				}
			}
		}
		this.selectionKeySet.replaceKeys(selectedKeys);
	}

	updateStyle()
	{
		let selectionEmpty: boolean = !this.selectionKeySet || this.selectionKeySet.keys.length === 0;

		var selectedKeys:IQualifiedKey[] = this.selectionKeySet ? this.selectionKeySet.keys : [];
		var probedKeys:IQualifiedKey[] = this.probeKeySet ? this.probeKeySet.keys : [];
		var selectedRecords:Record[] = _.filter(this.records, function(record:Record) {
			return _.includes(selectedKeys, record.id);
		});
		var probedRecords:Record[] = _.filter(this.records, function(record:Record) {
			return _.includes(probedKeys, record.id);
		});
		var selectedBinIndices:number[] = _.map(_.uniq(selectedRecords, 'binnedColumn'), 'binnedColumn') as number[];
		var probedBinIndices:number[] = _.map(_.uniq(probedRecords, 'binnedColumn'), 'binnedColumn') as number[];

		d3.select(this.element).selectAll("path.c3-shape")
			.style("stroke",
				(d: any, i:number, oi:number): string => {
					let selected = _.intersection(selectedBinIndices,[i]).length;
					let probed = _.intersection(probedBinIndices,[i]).length;
					if (probed && selected)
						return "white";
					else
						return "black";
				})
			.style("opacity",
				(d: any, i: number, oi: number): number => {
					let selected = _.intersection(selectedBinIndices,[i]).length;
					let probed = _.intersection(probedBinIndices,[i]).length;
					return (selectionEmpty || selected || probed) ? 1.0 : 0.3;
				})
			.style("stroke-opacity",
				(d: any, i: number, oi: number): number => {
					let selected = _.intersection(selectedBinIndices,[i]).length;
					let probed = _.intersection(probedBinIndices,[i]).length;
					if (probed)
						return 1.0;
					if (selected)
						return 0.5;
					return 0.3;
				})
			.style("stroke-width",
				(d: any, i: number, oi: number): number => {
					let selected = _.intersection(selectedBinIndices,[i]).length;
					let probed = _.intersection(probedBinIndices,[i]).length;
					if (probed && selected)
						return 2.5;
					return probed ? 1.7 : 1.0;
				});

		//handle selected paths
		d3.select(this.element)
			.selectAll("path._selection_surround").remove();
		d3.select(this.element)
			.selectAll("g.c3-shapes")
			.selectAll("path._selected_").each( function(d: any, i:number, oi:number) {
				d3.select(this.parentNode)
					.append("path")
					.classed("_selection_surround",true)
					.attr("d",this.getAttribute("d"))
					.style("stroke", "black")
					.style("stroke-width", 1.5)
				;
		});
	}

	private dataChanged()
	{
		this.records = ColumnUtils.getRecords(this.RECORD_FORMAT, this.filteredKeySet.keys, this.RECORD_DATATYPE);

		this.histData = [];

		var columnToAggregateNameIsDefined:boolean = !!this.columnToAggregate.getInternalColumn();

		var numberOfBins = this.binnedColumn.numberOfBins;
		for (let iBin:number = 0; iBin < numberOfBins; iBin++)
		{

			let recordsInBin:Record[] = _.filter(this.records, { binnedColumn: iBin });

			if (recordsInBin)
			{
				var obj:any = {height:0};
				if (columnToAggregateNameIsDefined)
				{
					obj.height = this.getAggregateValue(recordsInBin, "columnToAggregate", this.aggregationMethod.value);
					this.histData.push(obj);
				}
				else
				{
					obj.height = this.getAggregateValue(recordsInBin, "binnedColumn", COUNT);
					this.histData.push(obj);
				}
			}
		}

		this.keys = { value: ["height"] };
		if (WeaveAPI.Locale.reverseLayout)
		{
			this.histData = this.histData.reverse();
		}

		this.c3Config.data.json = this.histData;
		this.c3Config.data.keys = this.keys;
	}

	private getAggregateValue(records:Record[], columnToAggregateName:string, aggregationMethod:string):number
	{
		var count:number = 0;
		var sum:number = 0;

		records.forEach((record:any) => {
			count++;
			sum += record[columnToAggregateName as string] as number;
		});

		if (aggregationMethod === MEAN)
			return sum / count; // convert sum to mean

		if (aggregationMethod === COUNT)
			return count; // use count of finite values

		// sum
		return sum;
	}

	protected validate(forced:boolean = false):boolean
	{
		var changeDetected:boolean = false;
		var axisChange:boolean = Weave.detectChange(this, this.binnedColumn, this.columnToAggregate, this.aggregationMethod, this.xAxisName, this.yAxisName, this.margin, this.xAxisLabelAngle);
		if (axisChange || Weave.detectChange(this, this.columnToAggregate, this.fill, this.line, this.filteredKeySet, this.showValueLabels))
		{
			changeDetected = true;
			this.dataChanged();
		}
		if (axisChange)
		{
			changeDetected = true;
			var xLabel:string = Weave.lang(this.xAxisName.value) || this.defaultXAxisLabel;
			var yLabel:string = Weave.lang(this.getYAxisLabel.bind(this)());

			if (this.records)
			{
				var temp:string = "height";
				if (WeaveAPI.Locale.reverseLayout)
				{
					this.c3Config.data.axes = {[temp]:'y2'};
					this.c3Config.axis.y2 = this.c3ConfigYAxis;
					this.c3Config.axis.y = {show: false};
					this.c3Config.axis.x.tick.rotate = -1*this.xAxisLabelAngle.value;
				}
				else
				{
					this.c3Config.data.axes = {[temp]:'y'};
					this.c3Config.axis.y = this.c3ConfigYAxis;
					delete this.c3Config.axis.y2;
					this.c3Config.axis.x.tick.rotate = this.xAxisLabelAngle.value;
				}
			}

			this.c3Config.axis.x.label = {text: xLabel, position:"outer-center"};
			this.c3ConfigYAxis.label = {text: yLabel, position:"outer-middle"};

			this.updateConfigMargin();
		}

		if (Weave.detectChange(this, this.horizontalMode))
		{
			changeDetected = true;
			this.c3Config.axis.rotated = this.horizontalMode.value;
		}

		if (Weave.detectChange(this, this.barWidthRatio))
		{
			changeDetected = true;
			(this.c3Config.bar.width as {ratio:number}).ratio = this.barWidthRatio.value;
		}

		if (changeDetected || forced)
			return true;

		// update c3 selection
		if (this.selectionKeySet)
		{
			var set_indices = new Set<number>();
			for (var key of this.selectionKeySet.keys)
			{
				var index = this.binnedColumn.getValueFromKey(key, Number);
				if (isFinite(index))
					set_indices.add(index);
			}
			this.chart.select(["height"], JS.toArray(set_indices), true);
		}
		else
		{
			this.chart.select(["height"], [], true);
		}

		this.updateStyle();

		return false;
	}

	get selectableAttributes()
	{
		return super.selectableAttributes
			.set("Group by", this.binnedColumn)
			.set("Height values (optional)", this.columnToAggregate);
		//TODO handle remaining attributes
	}

	get defaultPanelTitle():string
	{
		if (this.binnedColumn.numberOfBins)
			return Weave.lang("Histogram of {0}", ColumnUtils.getTitle(this.binnedColumn));

		return Weave.lang("Histogram");
	}

	updateColor( color:string)
	{
		if (this.colorColumn && this.colorColumn.ramp)
		{
			this.colorColumn.ramp.setSessionState([color])
		}
	}

	//todo:(pushCrumb)find a better way to link to sidebar UI for selectbleAttributes
	renderEditor =(pushCrumb:(title:string,renderFn:()=>JSX.Element , stateObject:any )=>void):JSX.Element =>
	{
		var linkedColor:Boolean = !!this.fill.color.internalDynamicColumn.targetPath;
		var hexColor:string  = this.colorColumn && this.colorColumn.ramp ? (this.colorColumn.ramp.state as string[])[0] : "#808080"
		return Accordion.render(
			[
				Weave.lang("Binning"),
				<BinningDefinitionEditor
					showNoneOption={false}
					binnedColumn={this.binnedColumn}
					pushCrumb={ pushCrumb }
				/>
			],
			linkedColor && [
				Weave.lang("Coloring"),
				[
					[
						Weave.lang("Color theme"),
						<DynamicComponent
							dependencies={[this.fill.color]}
							render={() =>
								<ColorRampEditor
									compact={true}
									pushCrumb={ pushCrumb }
									colorRamp={this.colorColumn && this.colorColumn.ramp}
								/>
							}
						/>
					]
				]
			],
			[
				Weave.lang("Aggregation"),
				[
					[
						Weave.lang('Height values (optional)'),
						<SelectableAttributeComponent
							attributeName={"Height values (optional)"}
							attributes={this.selectableAttributes}
							pushCrumb={ pushCrumb }
						/>
					],
					[
						Weave.lang("Aggregation method"),
						<DynamicComponent
							dependencies={[this.columnToAggregate]}
							render={() =>
								<ComboBox options={[COUNT, SUM, MEAN]} type={this.columnToAggregate.getInternalColumn() ? null:"disabled"} ref={WeaveReactUtils.linkReactStateRef(this, {value : this.aggregationMethod })}/>
							}
						/>
					],
				]
			],
			[
				Weave.lang("Display"),
				[
					Weave.beta && [
						Weave.lang("Horizontal bars (beta)"),
						<Checkbox ref={WeaveReactUtils.linkReactStateRef(this, { value: this.horizontalMode })} label={" "}/>
					],
					[
						Weave.lang("Show value labels"),
						<Checkbox ref={WeaveReactUtils.linkReactStateRef(this, { value: this.showValueLabels })} label={" "}/>
					],
					[
						Weave.lang("X axis label angle"),
						<ComboBox style={{width:"100%"}} ref={WeaveReactUtils.linkReactStateRef(this, { value: this.xAxisLabelAngle })} options={ChartUtils.getAxisLabelAngleChoices()}/>
					],
					[
						Weave.lang("Bar width ratio"),
						<StatefulTextField type="number" style={{flex:1, minWidth: 60}} ref={WeaveReactUtils.linkReactStateRef(this, {value: this.barWidthRatio})}/>
					],
					!linkedColor && [
						Weave.lang("Color"),
						<ColorPicker style={ {height:"32px"} } hexColor={hexColor} onChange={(newColor:string) => this.updateColor( newColor)}/>
					]
				]
			],
			[Weave.lang("Titles"), this.getTitlesEditor()],
			[Weave.lang("Margins"), this.getMarginEditor()],
			[Weave.lang("Accessibility"), this.getAltTextEditor()]
		);
	}

	get deprecatedStateMapping()
	{
		return [super.deprecatedStateMapping, {
			"children": {
				"visualization": {
					"plotManager": {
						"plotters": {
							"plot": {
								"filteredKeySet": this.filteredKeySet,
								"binnedColumn": this.binnedColumn,
								"columnToAggregate": this.columnToAggregate,
								"aggregationMethod": this.aggregationMethod,
								"fillStyle": this.fill,
								"lineStyle": this.line,

								"drawPartialBins": true,
								"horizontalMode": false,
								"showValueLabels": false,
								"valueLabelColor": 0,
								"valueLabelHorizontalAlign": "left",
								"valueLabelMaxWidth": 200,
								"valueLabelVerticalAlign": "middle"
							}
						}
					}
				}
			}
		}];
	}
}

Weave.registerClass(
	C3Histogram,
	["weavejs.tool.c3tool.C3Histogram", "weave.visualization.tools::HistogramTool"],
	[
		IVisTool,
		ILinkableObjectWithNewProperties,
		ISelectableAttributes,
		IAltText
	],
	"Histogram"
);
