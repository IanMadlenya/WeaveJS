namespace weavejs.tool.c3tool
{
	import FormatUtils = weavejs.util.FormatUtils;
	import HBox = weavejs.ui.flexbox.HBox;
	import VBox = weavejs.ui.flexbox.VBox;
	import ComboBox = weavejs.ui.ComboBox;
	import Checkbox = weavejs.ui.Checkbox;
	import WeaveReactUtils = weavejs.util.WeaveReactUtils
	import ReactUtils = weavejs.util.ReactUtils;
	import ComboBoxOption = weavejs.ui.ComboBoxOption;
	import Accordion = weavejs.ui.Accordion;
	import ChartUtils = weavejs.util.ChartUtils;
	import StatefulTextField = weavejs.ui.StatefulTextField;
	import IAltText = weavejs.api.ui.IAltText;
	import IQualifiedKey = weavejs.api.data.IQualifiedKey;
	import DynamicColumn = weavejs.data.column.DynamicColumn;
	import ILinkableHashMap = weavejs.api.core.ILinkableHashMap;
	import IAttributeColumn = weavejs.api.data.IAttributeColumn;
	import LinkableHashMap = weavejs.core.LinkableHashMap;
	import AlwaysDefinedColumn = weavejs.data.column.AlwaysDefinedColumn;
	import FilteredKeySet = weavejs.data.key.FilteredKeySet;
	import ColorRamp = weavejs.util.ColorRamp;
	import LinkableString = weavejs.core.LinkableString;
	import LinkableBoolean = weavejs.core.LinkableBoolean;
	import LinkableNumber = weavejs.core.LinkableNumber;
	import IColumnWrapper = weavejs.api.data.IColumnWrapper;
	import ColumnUtils = weavejs.data.ColumnUtils;
	import IColumnStatistics = weavejs.api.data.IColumnStatistics;
	import StandardLib = weavejs.util.StandardLib;
	import IVisToolProps = weavejs.api.ui.IVisToolProps;
	import AbstractC3Tool = weavejs.tool.c3tool.AbstractC3Tool;

	declare type Record = {
		id: IQualifiedKey,
		heights: { xLabel: string } & {[columnName:string]: number},
		numericValues: {
			sort: number,
			yLabel: number,
			xLabel: number
		},
		stringValues: {
			yLabel: string,
			xLabel: string,
			color: string,
		}
	};

	declare type RecordHeightsFormat<T> = { xLabel: T } & {[columnName:string]: T};

	const GROUP:string = 'group';
	const STACK:string = 'stack';
	const PERCENT_STACK:string = 'percentStack';
	const GROUPING_MODES:ComboBoxOption[] = [
		{label: "Grouped Bars", value: GROUP},
		{label: "Stacked Bars", value: STACK},
		{label: "100% Stacked Bars", value: PERCENT_STACK}
	];
	const BOTTOM:string = 'bottom';
	const RIGHT:string = 'right';
	const INSET:string = 'inset';
	const LEGEND_POSITIONS:ComboBoxOption[] = [
		{label: "Bottom", value: BOTTOM},
		{label: "Right", value: RIGHT},
		{label: "Inset", value: INSET}
	];

	export class C3BarChart extends AbstractC3Tool
	{
		heightColumns = Weave.linkableChild(this, new LinkableHashMap(IAttributeColumn));
		labelColumn = Weave.linkableChild(this, DynamicColumn);
		sortColumn = Weave.linkableChild(this, DynamicColumn);
		colorColumn = Weave.linkableChild(this, new AlwaysDefinedColumn("#808080"));
		chartColors = Weave.linkableChild(this, new ColorRamp(ColorRamp.getColorRampByName("Paired")));
		groupingMode = Weave.linkableChild(this, new LinkableString(STACK, this.verifyGroupingMode));
		legendPosition = Weave.linkableChild(this, new LinkableString(BOTTOM, this.verifyLegendPosition));
		horizontalMode = Weave.linkableChild(this, new LinkableBoolean(false));
		showValueLabels = Weave.linkableChild(this, new LinkableBoolean(false));
		showXAxisLabel = Weave.linkableChild(this, new LinkableBoolean(false));
		xAxisLabelAngle = Weave.linkableChild(this, new LinkableNumber(-45));
		barWidthRatio = Weave.linkableChild(this, new LinkableNumber(0.8), this.verifyBarRatio);

		private verifyGroupingMode(mode:string):boolean
		{
			return [GROUP, STACK, PERCENT_STACK].indexOf(mode) >= 0;
		}

		private verifyLegendPosition(position:string):boolean
		{
			return [BOTTOM, RIGHT, INSET].indexOf(position) >= 0;
		}

		private verifyBarRatio(ratio:number):boolean
		{
			return (0.0 < ratio) && (ratio < 1.0);
		}

		get yLabelColumn():IAttributeColumn
		{
			return this.heightColumns.getObjects(IAttributeColumn)[0]|| this.sortColumn;
		}

		private RECORD_FORMAT = {
			id: IQualifiedKey,
			heights: {} as RecordHeightsFormat<IAttributeColumn>,
			numericValues: {
				sort: this.sortColumn,
				yLabel: this.yLabelColumn,
				xLabel: this.labelColumn,
			},
			stringValues: {
				yLabel: this.yLabelColumn,
				xLabel: this.labelColumn,
				color: this.colorColumn,
			}
		};

		private RECORD_DATATYPE = {
			heights: {} as RecordHeightsFormat<new ()=>(String|Number)>,
			numericValues: {
				sort: Number,
				yLabel: Number,
				xLabel: Number,
			},
			stringValues: {
				yLabel: String,
				xLabel: String,
				color: String,
			}
		};

		private yLabelColumnDataType:string;
		private heightColumnNames:string[];
		private heightColumnsLabels:string[];
		protected c3ConfigYAxis:c3.YAxisConfiguration;
		private records:Record[];

		constructor(props:IVisToolProps)
		{
			super(props);

			this.colorColumn.internalDynamicColumn.globalName = "defaultColorColumn";
			this.filteredKeySet.keyFilter.targetPath = ['defaultSubsetKeyFilter'];
			this.selectionFilter.targetPath = ['defaultSelectionKeySet'];
			this.probeFilter.targetPath = ['defaultProbeKeySet'];

			this.mergeConfig({
				data: {
					json: [],
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
					order: null,
					color: (color:string, d:any):string => {
						if (this.heightColumnNames.length === 1 && d && d.hasOwnProperty("index"))
						{
							// use the color from the color column because we only have one height
							var record = this.records[d.index];
							return record && record.stringValues ? record.stringValues.color : "";
						}
						else
						{
							// use the color from the color ramp
							return color;
						}
					}
				},
				axis: {
					x: {
						type: "category",
						label: {
							text: "",
							position: "outer-center"
						},
						height: this.margin.bottom.value,
						tick: {
							rotate: this.xAxisLabelAngle.value,
							culling: {
								max: null
							},
							multiline: false,
							format: (num:number):string => {

								let index = Math.round(num);
								let record = this.records[index];

								if (this.labelColumn.getInternalColumn() == null)// if the labelColumn doesn't have any data, use default label
									return null;

								if (record)
								{
									let valFromKey = Weave.lang(this.labelColumn.getValueFromKey(record.id));
									if (this.horizontalMode.value)
										return this.formatYAxisLabel(valFromKey,this.xAxisLabelAngle.value);
									return this.formatXAxisLabel(valFromKey,this.xAxisLabelAngle.value);// otherwise return the value from the labelColumn

								}

								return null;
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
				},
				legend: {
					show: false,
					position: this.legendPosition.value
				}
			});

			this.c3ConfigYAxis = {
				show: true,
				label: {
					text:"",
					position: "outer-middle"
				},
				tick: {
					fit: false,
					multiline: false,
					format: (num:number):string => {
						return this.formatGetStringFromNumber(num);
					}
				}
			};
		}

		//returns correct labels (for axes) from the data column
		private formatGetStringFromNumber = (value:number):string =>
		{
			let heightColumns = this.heightColumns.getObjects();
			if (this.groupingMode.value === PERCENT_STACK && heightColumns.length > 1)
			{
				return Weave.lang("{0}%", StandardLib.roundSignificant(100 * value));
			}
			else if (heightColumns.length > 0)
			{
				return Weave.lang(ColumnUtils.deriveStringFromNumber(heightColumns[0], value));
			}
			return null;
		};

		protected handleC3Selection():void
		{
			if (!this.selectionKeySet)
				return;
			let selectedIndices = this.chart.selected();
			let selectedKeys = selectedIndices.map((value) => this.records[value.index].id);
			this.selectionKeySet.replaceKeys(selectedKeys);
		}

		protected handleC3MouseOver(d:any):void
		{
			var record:Record = this.records[d.index];
			var qKey:IQualifiedKey = this.records[d.index].id;

			var columnNamesToColor:{[columnName:string] : string} = {};
			var columns = this.heightColumns.getObjects(IAttributeColumn);
			for (var index in columns)
			{
				var column = columns[index];
				var columnName:string = column.getMetadata("title");
				columnNamesToColor[columnName] = this.chartColors.getHexColor(Number(index), 0, columns.length - 1);
			}

			if (this.probeKeySet)
				this.probeKeySet.replaceKeys([qKey]);

			var heightColumns = this.heightColumns.getObjects(IAttributeColumn);
			this.toolTip.show(this, this.chart.internal.d3.event, [qKey], heightColumns);
			if (heightColumns.length > 1)
				this.toolTip.setState({columnNamesToColor});
		}

		private dataChanged():void
		{
			var columns = this.heightColumns.getObjects(IAttributeColumn);
			this.filteredKeySet.setColumnKeySources(columns);
			this.RECORD_FORMAT.heights = this.heightColumns.toObject(IAttributeColumn) as RecordHeightsFormat<IAttributeColumn>;
			this.RECORD_FORMAT.heights.xLabel = this.labelColumn;
			this.RECORD_DATATYPE.heights = _.zipObject(this.heightColumns.getNames(), columns.map(() => Number)) as any;
			this.RECORD_DATATYPE.heights.xLabel = String;

			this.heightColumnNames = this.heightColumns.getNames();
			this.heightColumnsLabels = columns.map(column => Weave.lang(column.getMetadata("title")));

			this.yLabelColumnDataType = this.yLabelColumn.getMetadata("dataType");

			this.records = weavejs.data.ColumnUtils.getRecords(this.RECORD_FORMAT, this.filteredKeySet.keys, this.RECORD_DATATYPE);
			this.records = _.sortByOrder(this.records, ["numericValues.sort"], ["asc"]);

			if (weavejs.WeaveAPI.Locale.reverseLayout)
			{
				this.records = this.records.reverse();
			}

			if (this.groupingMode.value === STACK || this.groupingMode.value === PERCENT_STACK)
				this.c3Config.data.groups = [this.heightColumnNames];
			else //if (this.groupingMode === "group")
				this.c3Config.data.groups = [];

			if (this.groupingMode.value === PERCENT_STACK && this.heightColumnNames.length > 1)
			{
				// normalize the height columns to be percentages.
				for (var record of this.records)
				{
					var heights = record.heights;
					var sum:number = 0;
					for (let key in heights)
						if (typeof heights[key] == "number")
							sum += heights[key];
					for (let key in heights)
						if (typeof heights[key] == "number")
							heights[key] /= sum;
				}
			}

			var keys = {
				x: "",
				value: new Array<string>()
			};

			// if label column is specified
			if (this.labelColumn.target)
			{
				keys.x = "xLabel";
				this.c3Config.legend.show = false;
			}
			else
			{
				this.c3Config.legend.show = true;
			}

			keys.value = this.heightColumnNames;
			var columnColors:{[name:string]: string} = {};
			var columnTitles:{[name:string]: string} = {};

			if (this.heightColumnNames.length > 1)
			{
				this.heightColumnNames.forEach((name, index) => {
					columnTitles[name] = this.heightColumnsLabels[index];
					columnColors[name] = this.chartColors.getHexColor(index, 0, this.heightColumnNames.length - 1);
				});
				if (this.labelColumn.target)
				{
					this.c3Config.legend.show = true;
				}
			}
			else
			{
				this.c3Config.legend.show = false;
			}

			// any reason to cloneDeep here?
			var data:c3.Data = _.cloneDeep(this.c3Config.data);

			data.json = _.pluck(this.records, 'heights');

			//need other stuff for data.json to work
			//this can potentially override column names
			//c3 limitation

			data.colors = columnColors;
			data.keys = keys;
			data.names = columnTitles;
			data.unload = true;
			this.c3Config.data = data;
		}

		updateStyle()
		{
			if (!this.chart || !this.heightColumnNames)
				return;

			let selectionEmpty:boolean = !this.selectionKeySet || this.selectionKeySet.keys.length === 0;
			let thinBars:boolean = this.chart.internal.width <= this.records.length;

			this.heightColumnNames.forEach((item:string) => {
				d3.select(this.element)
					.selectAll("g")
					.filter(".c3-shapes-"+item+".c3-bars")
					.selectAll("path")
					.style("opacity", (d: any, i: number, oi: number): number => {
						let key = this.records[i].id;
						let selected = this.isSelected(key);
						let probed = this.isProbed(key);
						return (selectionEmpty || selected || probed) ? 1.0 : 0.3;
					})
					.style("stroke", "black")
					.style("stroke-width", 1.0)
					.style("stroke-opacity", (d: any, i: number, oi: number): number => {
						if (thinBars)
							return 0;
						let key = this.records[i].id;
						let selected = this.isSelected(key);
						let probed = this.isProbed(key);
						if (probed)
							return 1.0;
						if (selected)
							return 0.7;
						return 0.5;
					});
					//Todo: find better probed style to differentiate bars
					//.style("stroke-width", (d: any, i: number, oi: number): number => {
					//	let key = this.records[i].id;
					//	let probed = this.isProbed(key);
					//	return probed ? 1.5 : 1.0;
					//});

				d3.select(this.element)
					.selectAll("g")
					.filter(".c3-texts-"+item)
					.selectAll("text")
					.style("fill-opacity", (d: any, i: number, oi: number): number => {
						let key = this.records[i].id;
						let selected = this.isSelected(key);
						let probed = this.isProbed(key);
						return (selectionEmpty || selected || probed) ? 1.0 : 0.3;
					});
			});
		}

		get defaultXAxisLabel():string
		{
			if (!this.showXAxisLabel.value)
				return "";
			return Weave.lang("Sorted by " + this.sortColumn.getMetadata('title'));
		}

		get defaultYAxisLabel():string
		{
			var columns = this.heightColumns.getObjects() as IAttributeColumn[];
			if (columns.length == 0)
				return Weave.lang('');

			return Weave.lang("{0}", columns.map(column=>weavejs.data.ColumnUtils.getTitle(column)).join(Weave.lang(", ")));
		}

		public getAutomaticDescription():string
		{
			var description:string = Weave.lang("Bar Chart showing ");

			for (var i:number = 0; i < this.heightColumns.getObjects().length; i++)
			{
				description += ColumnUtils.getTitle(this.heightColumns.getObjects()[i] as IAttributeColumn) + ", ";
			}

			description += "sorted by ";

			description += ColumnUtils.getTitle(this.sortColumn);

			description += '\n';

			var heights = this.heightColumns.getObjects();
			if (heights.length == 1)
			{
				var heightColumn:IAttributeColumn = heights[0] as IAttributeColumn;
				var statsHeight:IColumnStatistics = weavejs.WeaveAPI.StatisticsCache.getColumnStatistics(heightColumn);
				var max = statsHeight.getMin();
				var min = statsHeight.getMax();
				var average = statsHeight.getMean();
				var tmp:number;
				var max_keys:IQualifiedKey[] = [];
				var min_keys:IQualifiedKey[]= [];

				for (var k of heightColumn.keys)
				{
					tmp = heightColumn.getValueFromKey(k)
					if (tmp > max)
						max = tmp;
					if (tmp < min)
						min = tmp;
				}

				for (k of heightColumn.keys)
				{
					if (Math.abs(heightColumn.getValueFromKey(k) - max) < 0.001)
						max_keys.push(k);
					if (Math.abs(heightColumn.getValueFromKey(k) - min) < 0.001)
						min_keys.push(k);
				}

				description += Weave.lang("The maximum {0} is {1} when {2} is ", ColumnUtils.getTitle(heightColumn), max, ColumnUtils.getTitle(this.sortColumn));
				for (k of max_keys)
				{
					description += " " + this.sortColumn.getValueFromKey(k);
				}

				description += ".";
				description += '\n';
				description += Weave.lang("The minimum {0} is {1} when {2} is", ColumnUtils.getTitle(heightColumn), min, ColumnUtils.getTitle(this.sortColumn));

				for (k of min_keys)
				{
					description += " " + this.sortColumn.getValueFromKey(k);
				}

				description += ".";
				description += "\n";

				description += Weave.lang("The average value is {0}.", StandardLib.roundSignificant(average, 2));
			}
			return description;
		}

		protected validate(forced:boolean = false):boolean
		{
			var changeDetected:boolean = false;
			var axisChange:boolean = Weave.detectChange(
				this,
				this.heightColumns,
				this.labelColumn,
				this.sortColumn,
				this.margin,
				this.overrideBounds,
				this.xAxisName,
				this.yAxisName,
	 			this.showXAxisLabel,
				this.xAxisLabelAngle
			);
			var dataChange = axisChange || Weave.detectChange(this, this.colorColumn, this.chartColors, this.groupingMode, this.filteredKeySet, this.showValueLabels);
			if (dataChange)
			{
				changeDetected = true;
				this.dataChanged();
			}

			if (axisChange)
			{
				changeDetected = true;

				var xLabel:string = Weave.lang(this.xAxisName.value) || this.defaultXAxisLabel;
				var yLabel:string = Weave.lang(this.yAxisName.value) || this.defaultYAxisLabel;

				if (!this.showXAxisLabel.value)
				{
					xLabel = " ";
				}

				if (this.heightColumnNames && this.heightColumnNames.length)
				{
					var axes:any = {};
					if (weavejs.WeaveAPI.Locale.reverseLayout)
					{
						this.heightColumnNames.forEach( (name) => {
							axes[name] = 'y2';
						});
						this.c3Config.data.axes = axes;
						this.c3Config.axis.y2 = this.c3ConfigYAxis;
						this.c3Config.axis.y = {show: false};
						this.c3Config.axis.x.tick.rotate = -1*this.xAxisLabelAngle.value;
					}
					else
					{
						this.heightColumnNames.forEach( (name) => {
							axes[name] = 'y';
						});
						this.c3Config.data.axes = axes;
						this.c3Config.axis.y = this.c3ConfigYAxis;
						delete this.c3Config.axis.y2;
						this.c3Config.axis.x.tick.rotate = this.xAxisLabelAngle.value;
					}
				}

				this.c3Config.axis.x.label = {text:xLabel, position:"outer-center"};
				this.c3ConfigYAxis.label = {text:yLabel, position:"outer-middle"};

				this.updateConfigMargin();
				this.updateConfigAxisY();
			}
			
			if (Weave.detectChange(this, this.horizontalMode))
			{
				changeDetected = true;
				//we override the default behavior of rotated for bar chart and histogram according to the horizontal mode boolean
				//rest of the charts, the default value is retained
				this.c3Config.axis.rotated = this.horizontalMode.value;
			}

			if (Weave.detectChange(this, this.barWidthRatio))
			{
				changeDetected = true;
				(this.c3Config.bar.width as {ratio:number}).ratio = this.barWidthRatio.value;
			}

			if (Weave.detectChange(this, this.legendPosition))
			{
				changeDetected = true;
				this.c3Config.legend.position = this.legendPosition.value;
				if (this.legendPosition.value == RIGHT)
					this.c3Config.padding.right = null;
				else
					this.c3Config.padding.right = this.margin.right.value;
			}

			if (changeDetected || forced)
				return true;
			
			// update C3 selection and style on already-rendered chart
			var selectedKeys:IQualifiedKey[] = this.selectionKeySet ? this.selectionKeySet.keys : [];
			var keyToIndex = weavejs.util.ArrayUtils.createLookup(this.records, "id");
			var selectedIndices:number[] = selectedKeys.map((key:IQualifiedKey) => {
				return Number(keyToIndex.get(key));
			});
			this.chart.select(this.heightColumnNames, selectedIndices, true);
			
			this.updateStyle();
			
			return false;
		}

		get selectableAttributes()
		{
			return super.selectableAttributes
				.set("Height", this.heightColumns)
				.set("Sort", this.sortColumn)
				.set("Color", this.colorColumn)
				.set("Label", this.labelColumn);
		}

		get defaultPanelTitle():string
		{
			var columns = this.heightColumns.getObjects() as IAttributeColumn[];
			if (columns.length == 0)
				return Weave.lang('Bar Chart');

			return Weave.lang("Bar Chart of {0}", columns.map(column=>weavejs.data.ColumnUtils.getTitle(column)).join(Weave.lang(", ")));
		}

		getMarginEditor():React.ReactChild[][]
		{
			return [
				[
					Weave.lang("Margins"),
					<HBox className="weave-padded-hbox" style={{alignItems: 'center'}} >
						<StatefulTextField type="number" style={{textAlign: "center", flex:1, minWidth: 60}} ref={WeaveReactUtils.linkReactStateRef(this, {value: this.margin.left})}/>
						<VBox className="weave-padded-vbox" style={{flex: 1}}>
							<StatefulTextField type="number" style={{textAlign: "center", minWidth: 60}} ref={WeaveReactUtils.linkReactStateRef(this, {value: this.margin.top})}/>
							<StatefulTextField type="number" style={{textAlign: "center", minWidth: 60}} ref={WeaveReactUtils.linkReactStateRef(this, {value: this.margin.bottom})}/>
						</VBox>
						<StatefulTextField type="number" disabled={this.legendPosition.value == "right"} style={{textAlign: "center", flex:1, minWidth: 60}} ref={WeaveReactUtils.linkReactStateRef(this, {value: this.margin.right})}/>
					</HBox>
				]
			];
		}

		//todo:(pushCrumb)find a better way to link to sidebar UI for selectbleAttributes
		renderEditor =(pushCrumb:(title:string,renderFn:()=>JSX.Element , stateObject:any )=>void = null):JSX.Element =>
		{
			return Accordion.render(
				[Weave.lang("Data"), this.getSelectableAttributesEditor(pushCrumb)],
				[
					Weave.lang("Display"),
					[
						[
							Weave.lang("Grouping mode"),
							<ComboBox style={{width:"100%"}} ref={WeaveReactUtils.linkReactStateRef(this, { value: this.groupingMode })} options={GROUPING_MODES}/>
						],
						this.c3Config.legend.show && [
							Weave.lang("Legend Position"),
							<ComboBox style={{width:"100%"}} ref={WeaveReactUtils.linkReactStateRef(this, { value: this.legendPosition })} options={LEGEND_POSITIONS}/>
						],
						Weave.beta && [
							Weave.lang("Horizontal bars (beta)"),
							<Checkbox ref={WeaveReactUtils.linkReactStateRef(this, { value: this.horizontalMode })} label={" "}/>
						],
						[
							Weave.lang("Show value labels"),
							<Checkbox ref={WeaveReactUtils.linkReactStateRef(this, { value: this.showValueLabels })} label={" "}/>

						],
						[
							Weave.lang("Show X axis title"),
							<Checkbox ref={WeaveReactUtils.linkReactStateRef(this, { value: this.showXAxisLabel })} label={" "}/>
						],
						[
							Weave.lang("X axis label angle"),
							<ComboBox style={{width:"100%"}} ref={WeaveReactUtils.linkReactStateRef(this, { value: this.xAxisLabelAngle })} options={ChartUtils.getAxisLabelAngleChoices()}/>
						],
						[
							Weave.lang("Bar width ratio"),
							<StatefulTextField type="number" style={{flex:1, minWidth: 60}} ref={WeaveReactUtils.linkReactStateRef(this, {value: this.barWidthRatio})}/>
						]
					]
				],
				[Weave.lang("Titles"), this.getTitlesEditor()],
				[Weave.lang("Margins"), this.getMarginEditor()],
				[Weave.lang("Accessibility"), this.getAltTextEditor()]
			);
		};

		public get deprecatedStateMapping():Object
		{
			return [super.deprecatedStateMapping, {
				"children": {
					"visualization": {
						"plotManager": {
							"plotters": {
								"plot": {
									"filteredKeySet": this.filteredKeySet,
									"heightColumns": this.heightColumns,
									"labelColumn": this.labelColumn,
									"sortColumn": this.sortColumn,
									"colorColumn": this.colorColumn,
									"chartColors": this.chartColors,
									"horizontalMode": this.horizontalMode,
									"showValueLabels": this.showValueLabels,
									"groupingMode": this.groupingMode
								}
							}
						}
					}
				}
			}];
		}
	}

	Weave.registerClass(
		C3BarChart,
		["weavejs.tool.c3tool.C3BarChart", "weave.visualization.tools::CompoundBarChartTool"],
		[
			weavejs.api.ui.IVisTool,
			weavejs.api.core.ILinkableObjectWithNewProperties,
			weavejs.api.data.ISelectableAttributes,
			IAltText
		],
		"Bar Chart"
	);
}
