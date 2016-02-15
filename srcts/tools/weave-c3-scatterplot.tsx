///<reference path="../../typings/c3/c3.d.ts"/>
///<reference path="../../typings/d3/d3.d.ts"/>
///<reference path="../../typings/lodash/lodash.d.ts"/>
///<reference path="../../typings/react/react.d.ts"/>
///<reference path="../../typings/weave/weavejs.d.ts"/>
///<reference path="../../typings/react/react-dom.d.ts"/>

import {IVisToolProps} from "./IVisTool";
import AbstractC3Tool from "./AbstractC3Tool";
import * as _ from "lodash";
import * as d3 from "d3";
import FormatUtils from "../utils/FormatUtils";
import * as React from "react";
import * as c3 from "c3";
import {ChartConfiguration, ChartAPI} from "c3";
import {MouseEvent} from "react";
import {getTooltipContent} from "./tooltip";
import Tooltip from "./tooltip";
import * as ReactDOM from "react-dom";
import StandardLib from "../utils/StandardLib";

import IQualifiedKey = weavejs.api.data.IQualifiedKey;
import IAttributeColumn = weavejs.api.data.IAttributeColumn;
import KeySet = weavejs.data.key.KeySet;
import DynamicColumn = weavejs.data.column.DynamicColumn;
import AlwaysDefinedColumn = weavejs.data.column.AlwaysDefinedColumn;
import NormalizedColumn = weavejs.data.column.NormalizedColumn;
import SolidFillStyle = weavejs.geom.SolidFillStyle;
import SolidLineStyle = weavejs.geom.SolidLineStyle;
import LinkableNumber = weavejs.core.LinkableNumber;
import LinkableString = weavejs.core.LinkableString;
import FilteredKeySet = weavejs.data.key.FilteredKeySet;
import DynamicKeyFilter = weavejs.data.key.DynamicKeyFilter;

declare type Record = {
	id: IQualifiedKey,
	point: { x: number, y: number },
	size: number,
	fill: { color: string },
	line: { color: string }
};

export default class WeaveC3ScatterPlot extends AbstractC3Tool
{
	dataX = Weave.linkableChild(this, DynamicColumn);
	dataY = Weave.linkableChild(this, DynamicColumn);
	radius = Weave.linkableChild(this, new AlwaysDefinedColumn(5));
	fill = Weave.linkableChild(this, SolidFillStyle);
	line = Weave.linkableChild(this, SolidLineStyle);

	private get radiusNorm() { return this.radius.getInternalColumn() as NormalizedColumn; }
	private get radiusData() { return this.radiusNorm.internalDynamicColumn; }

	private RECORD_FORMAT = {
		id: IQualifiedKey,
		point: { x: this.dataX, y: this.dataY },
		size: this.radius,
		fill: { color: this.fill.color },
		line: { color: this.line.color }
	};
	private RECORD_DATATYPE = {
		point: { x: Number, y: Number },
		size: Number,
		fill: { color: String },
		line: { color: String }
	};

	private keyToIndex: Map<IQualifiedKey, number>;
	private xAxisValueToLabel:{[value:number]: string};
	private yAxisValueToLabel:{[value:number]: string};
	protected chart:ChartAPI;
	private dataXType:string;
	private dataYType:string;
	private records:Record[];
	private debouncedUpdateSelection: Function;

	private busy:boolean;
	private dirty:boolean;

	protected c3Config:ChartConfiguration;
	protected c3ConfigYAxis:c3.YAxisConfiguration;

	constructor(props:IVisToolProps)
	{
		super(props);

		this.debouncedUpdateSelection = _.debounce(this.updateSelection.bind(this), 50);
		
		this.radius.internalDynamicColumn.requestLocalObject(NormalizedColumn, true);
		Weave.getCallbacks(this.selectionFilter).addGroupedCallback(this, this.updateStyle);
		Weave.getCallbacks(this.probeFilter).addGroupedCallback(this, this.updateStyle);

		Weave.getCallbacks(this).addGroupedCallback(this, this.validate, true);

		this.filteredKeySet.setColumnKeySources([this.dataX, this.dataY]);

		this.radiusNorm.min.value = 3;
		this.radiusNorm.max.value = 25;

		this.filteredKeySet.keyFilter.targetPath = ['defaultSubsetKeyFilter'];
		this.selectionFilter.targetPath = ['defaultSelectionKeySet'];
		this.probeFilter.targetPath = ['defaultProbeKeySet'];

		this.keyToIndex = new Map<IQualifiedKey, number>();
		this.yAxisValueToLabel = {};
		this.xAxisValueToLabel = {};
		this.validate = _.debounce(this.validate.bind(this), 30);

		this.c3Config = {
			size: {
				height: this.props.style.height,
				width: this.props.style.width
			},
			bindto: null,
			padding: {
				top: 20,
				bottom: 0,
				left:100,
				right:20
			},
			data: {
				rows: [],
				x: "x",
				xSort: false,
				type: "scatter",
				selection: {
					enabled: true,
					multiple: true,
					draggable: true
				},
				color: (color:string, d:any):string => {
					var color:string;
					if(d.hasOwnProperty("index")) {
						var record:Record = this.records[d.index];
						color = record ? record.fill.color : null;
						if (color && color.charAt(0) != '#')
							color = '#' + weavejs.util.StandardLib.numberToBase(Number(color), 16, 6);
					}
					return color || "#000000";
				},
				onclick: (d:any) => {
					var event:MouseEvent = (this.chart.internal.d3).event as MouseEvent;
					if(!(event.ctrlKey||event.metaKey) && d && d.hasOwnProperty("index")) {
						if (this.selectionKeySet)
							this.selectionKeySet.replaceKeys([this.records[d.index].id]);
					}
				},
				onselected: (d:any) => {
					this.debouncedUpdateSelection();
				},
				onunselected: (d:any) => {
					this.debouncedUpdateSelection();
				},
				onmouseover: (d) => {
					if(d && d.hasOwnProperty("index")) {
						if (this.probeKeySet)
							this.probeKeySet.replaceKeys([]);
						var columnNamesToValue:{[columnName:string] : string|number } = {};
						var xValue:number = this.records[d.index].point.x;
						if(xValue) {
							columnNamesToValue[this.dataX.getMetadata('title')] = xValue;
						}

						var yValue:number = this.records[d.index].point.y;
						if(yValue) {
							columnNamesToValue[this.dataY.getMetadata('title')] = yValue;
						}

						var size:number = this.records[d.index].size;
						if (size) {
							columnNamesToValue[this.radius.getMetadata('title')] = size;
						}
						if (this.probeKeySet)
							this.probeKeySet.replaceKeys([this.records[d.index].id]);
						this.props.toolTip.setState({
							x: this.chart.internal.d3.event.pageX,
							y: this.chart.internal.d3.event.pageY,
							showToolTip: true,
							columnNamesToValue: columnNamesToValue
						});
					}
				},
				onmouseout: (d) => {
					if(d && d.hasOwnProperty("index")) {
						if (this.probeKeySet)
							this.probeKeySet.replaceKeys([]);
						this.props.toolTip.setState({
							showToolTip: false
						});
					}
				}
			},
			legend: {
				show: false
			},
			axis: {
				x: {
					label: {
						text: "",
						position: "outer-center"
					},
					tick: {
						format: (num:number):string => {
							if (this.xAxisValueToLabel && this.dataXType !== "number") {
								return this.xAxisValueToLabel[num] || "";
							} else {
								return String(FormatUtils.defaultNumberFormatting(num));
							}
						},
						rotate: -45,
						culling: {
							max: null
						},
						fit: false
					}
				}
			},
			transition: { duration: 0 },
			grid: {
				x: {
					show: true
				},
				y: {
					show: true
				}
			},
			tooltip: {
				format: {
					title: (num:number):string => {
						return this.xAxisName.value || this.dataX.getMetadata('title');
					},
					name: (name:string, ratio:number, id:string, index:number):string => {
						return this.yAxisName.value || this.dataY.getMetadata('title');
					}
				},
				show: false
			},
			point: {
				r: (d:any):number => {
					if(d.hasOwnProperty("index")) {
						return this.records[d.index].size;
					}
				},
				focus: {
					expand: {
						enabled: false
					}
				}
			},
			onrendered: () => {
				this.busy = false;
				this.updateStyle();
				if (this.dirty)
					this.validate();
			}
		};
		this.c3ConfigYAxis = {
			show: true,
			label: {
				text: "",
				position: "outer-middle"
			},
			tick: {
				format: (num:number):string => {
					if(this.yAxisValueToLabel && this.dataYType !== "number") {
						return this.yAxisValueToLabel[num] || "";
					} else {
						return String(FormatUtils.defaultNumberFormatting(num));
					}
				}
			}
		};
	}

	public updateSelection():void
	{
		let selected = this.chart.selected();

		let selectedKeys: Array<IQualifiedKey> = selected.map((value) => this.indexToKey.get(value.index));

		this.selectionKeySet.replaceKeys(selectedKeys);
	}

	public get deprecatedStateMapping():Object
	{
		return [super.deprecatedStateMapping, {
			"children": {
				"visualization": {
					"plotManager": {
						"plotters": {
							"plot": {
								"filteredKeySet": this.filteredKeySet,
								"dataX": this.dataX,
								"dataY": this.dataY,
								"sizeBy": this.radiusData,
								"minScreenRadius": this.radiusNorm.min,
								"maxScreenRadius": this.radiusNorm.max,
								"defaultScreenRadius": this.radius.defaultValue,

								"fill": this.fill,
								"line": this.line,

								"showSquaresForMissingSize": false,
								"colorBySize": false,
								"colorPositive": 0x00FF00,
								"colorNegative": 0xFF0000
							}
						}
					}
				}
			}
		}];
	}

	handlePointClick(event:MouseEvent):void
	{
		if (!this.selectionKeySet)
			return;

        var probeKeys:any[] = this.probeKeySet ? this.probeKeySet.keys : [];
        var selectionKeys:any[] = this.selectionKeySet.keys;
        if (_.isEqual(probeKeys, selectionKeys))
            this.selectionKeySet.replaceKeys([]);
        else
            this.selectionKeySet.replaceKeys(probeKeys);
	}

	updateStyle() {
		if (!this.chart || !this.dataXType)
			return;

		let selectionEmpty: boolean = this.selectionKeySet.keys.length === 0;

		d3.select(this.element)
			.selectAll("circle.c3-shape")
			.style("stroke", "black")
			.style("opacity",
				(d: any, i: number, oi: number): number => {
					let key = this.indexToKey.get(i);
					let selected = this.selectionKeySet.containsKey(key);
					return (selectionEmpty || selected) ? 1.0 : 0.3;
				})
			.style("stroke-opacity",
				(d: any, i: number, oi: number): number => {
					let key = this.indexToKey.get(i);
					let selected = this.selectionKeySet.containsKey(key);
					let probed = this.probeKeySet.containsKey(key);
					if (probed || selected)
						return 1.0;
					if (!selectionEmpty && !selected)
						return 0;
					return 0.0;
				})
			.style("stroke-width",
				(d: any, i: number, oi: number): number => {
					let key = this.indexToKey.get(i);
					let probed = this.probeKeySet.containsKey(key);
					return probed ? 2.0 : 1.0;
				});

		var keyToIndex = (key: IQualifiedKey) => this.keyToIndex.get(key);
		var selectedIndices: number[] = this.selectionKeySet.keys.map(keyToIndex);
		this.chart.select(["y"], selectedIndices, true);
	}

	componentDidMount()
	{
		//super.componentDidMount();
        StandardLib.addPointClickListener(this.element, this.handlePointClick.bind(this));

		this.c3Config.bindto = this.element;
		this.validate(true);
	}

	componentDidUpdate()
	{
		var sizeChanged = this.c3Config.size.width != this.props.style.width || this.c3Config.size.height != this.props.style.height;
		super.componentDidUpdate();
		if (sizeChanged)
			this.validate(true);
	}

	componentWillUnmount()
	{
		//super.componentWillUnmount();
		this.chart.destroy();
	}

	validate(forced:boolean = false):void
	{
		if (this.busy)
		{
			this.dirty = true;
			return;
		}
		this.dirty = false;

		var xyChanged = Weave.detectChange(this, this.dataX, this.dataY);
		var dataChanged = xyChanged || Weave.detectChange(this, this.radius, this.fill, this.line, this.filteredKeySet);
		if (dataChanged)
		{
			this.dataXType = this.dataX.getMetadata('dataType');
			this.dataYType = this.dataY.getMetadata('dataType');

			this.records = weavejs.data.ColumnUtils.getRecords(this.RECORD_FORMAT, this.filteredKeySet.keys, this.RECORD_DATATYPE);
			this.records = _.sortByOrder(this.records, ["size", "id"], ["desc", "asc"]);

			this.keyToIndex.clear();
			this.yAxisValueToLabel = {};
			this.xAxisValueToLabel = {};

			this.records.forEach((record:Record, index:number) => {
				this.keyToIndex.set(record.id, index);
				this.xAxisValueToLabel[this.records[index].point.x] = this.dataX.getValueFromKey(record.id, String);
				this.yAxisValueToLabel[this.records[index].point.y] = this.dataY.getValueFromKey(record.id, String);
			});
		}
		var axisChanged = xyChanged || Weave.detectChange(this, this.xAxisName, this.yAxisName, this.margin.top, this.margin.bottom, this.margin.left, this.margin.right);
		if (axisChanged)
		{
			var xLabel:string = this.xAxisName.value || this.dataX.getMetadata('title');
			var yLabel:string = this.yAxisName.value || this.dataY.getMetadata('title');

			if (weavejs.WeaveAPI.Locale.reverseLayout)
			{
				this.c3Config.data.axes = {'y': 'y2'};
				this.c3Config.axis.y2 = this.c3ConfigYAxis;
				this.c3Config.axis.y = {show: false};
				this.c3Config.axis.x.tick.rotate = 45;
			}
			else
			{
				this.c3Config.data.axes = {'y': 'y'};
				this.c3Config.axis.y = this.c3ConfigYAxis;
				delete this.c3Config.axis.y2;
				this.c3Config.axis.x.tick.rotate = -45;
			}

			this.c3Config.axis.x.label = {text:xLabel, position:"outer-center"};
			this.c3ConfigYAxis.label = {text:yLabel, position:"outer-middle"};

			this.c3Config.padding.top = Number(this.margin.top.value);
			this.c3Config.axis.x.height = Number(this.margin.bottom.value);

			if (weavejs.WeaveAPI.Locale.reverseLayout)
			{
				this.c3Config.padding.left = Number(this.margin.right.value);
				this.c3Config.padding.right = Number(this.margin.left.value);
			}
			else
			{
				this.c3Config.padding.left = Number(this.margin.left.value);
				this.c3Config.padding.right = Number(this.margin.right.value);
			}
		}

		if (dataChanged || axisChanged)
		{
			this.busy = true;
			this.chart = c3.generate(this.c3Config);
			this.loadData();
			this.cullAxes();
		}
	}

	loadData()
	{
		if(!this.chart || this.busy)
			return StandardLib.debounce(this, 'loadData');
		this.chart.load({data: _.pluck(this.records, "point"), unload: true});
		//after data is loaded we need to remove the clip-path so that points are not
		// clipped when rendered near edge of chart
		//TODO: determine if adding padding to axes range will further improve aesthetics of chart
		this.chart.internal.main.select('.c3-chart').attr('clip-path',null);
	}
}

Weave.registerClass("weavejs.tool.C3ScatterPlot", WeaveC3ScatterPlot, [weavejs.api.ui.IVisTool, weavejs.api.core.ILinkableObjectWithNewProperties]);
Weave.registerClass("weave.visualization.tools::ScatterPlotTool", WeaveC3ScatterPlot);
