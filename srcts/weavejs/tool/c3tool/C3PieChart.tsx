namespace weavejs.tool.c3tool
{
	import ChartAPI = c3.ChartAPI;
	import ChartConfiguration = c3.ChartConfiguration;
	import ToolTip = weavejs.ui.ToolTip;
	import HBox = weavejs.ui.flexbox.HBox;
	import VBox = weavejs.ui.flexbox.VBox;
	import Accordion = weavejs.ui.Accordion;
	import StatefulTextField = weavejs.ui.StatefulTextField;
	import WeaveReactUtils = weavejs.util.WeaveReactUtils

	import IQualifiedKey = weavejs.api.data.IQualifiedKey;
	import IAttributeColumn = weavejs.api.data.IAttributeColumn;
	import FilteredKeySet = weavejs.data.key.FilteredKeySet;
	import DynamicColumn = weavejs.data.column.DynamicColumn;
	import SolidFillStyle = weavejs.plot.SolidFillStyle;
	import SolidLineStyle = weavejs.plot.SolidLineStyle;
	import LinkableNumber = weavejs.core.LinkableNumber;
	import LinkableString = weavejs.core.LinkableString;
	import LinkableHashMap = weavejs.core.LinkableHashMap;
	import IColumnWrapper = weavejs.api.data.IColumnWrapper;
	import IAltText = weavejs.api.ui.IAltText;
	import IVisToolProps = weavejs.api.ui.IVisToolProps;
	import AbstractC3Tool = weavejs.tool.c3tool.AbstractC3Tool;
	import ArrayUtils = weavejs.util.ArrayUtils;
	import ISelectableAttributes = weavejs.api.data.ISelectableAttributes;
	import ILinkableObjectWithNewProperties = weavejs.api.core.ILinkableObjectWithNewProperties;
	import IVisTool = weavejs.api.ui.IVisTool;
	import ColumnUtils = weavejs.data.ColumnUtils;

	declare type Record = {
		id: IQualifiedKey,
		data:number,
		line:{color:string},
		fill:{color:string},
		label:string
	};

	const recordsToBeDisplayed = 360;

	export class C3PieChart extends AbstractC3Tool
	{
		static WEAVE_INFO = Weave.classInfo(C3PieChart, {
			id: "weavejs.tool.c3tool.C3PieChart",
			label: "Pie Chart",
			interfaces: [
				IVisTool,
				ILinkableObjectWithNewProperties,
				ISelectableAttributes,
				IAltText
			],
			deprecatedIds: ["weave.visualization.tools::PieChartTool"]
		}) ;

		data = Weave.linkableChild(this, DynamicColumn);
		label = Weave.linkableChild(this, DynamicColumn);
		fill = Weave.linkableChild(this,SolidFillStyle);
		line = Weave.linkableChild(this,SolidLineStyle);
		innerRadius = Weave.linkableChild(this, LinkableNumber);

		private RECORD_FORMAT = {
			id: IQualifiedKey,
			data: this.data,
			line: { color: this.line.color },
			fill: { color: this.fill.color },
			label: this.label
		};

		private RECORD_DATATYPE = {
			data: Number,
			line: {color: String},
			fill: {color: String},
			label: String
		};

		private keyToIndex:{[key:string]: number};
		private records:Record[];

		constructor(props:IVisToolProps)
		{
			super(props);

			this.filteredKeySet.setSingleKeySource(this.data);
			this.fill.color.internalDynamicColumn.targetPath = ["defaultColorColumn"];

			this.filteredKeySet.keyFilter.targetPath = ['defaultSubsetKeyFilter'];
			this.selectionFilter.targetPath = ['defaultSelectionKeySet'];
			this.probeFilter.targetPath = ['defaultProbeKeySet'];

			this.keyToIndex = {};
			this.records = [];

			this.mergeConfig({
				data: {
					columns: [],
					type: "pie"
				},
				pie: {
					label: {
						show: true,
						format: (value:number, ratio:number, id:string):string => {
							var record:Record = this.records[this.keyToIndex[id]];
							if (record && record.label)
								return Weave.lang(record.label);
							return String(value);
						}
					}
				},
				donut: {
					label: {
						show: true,
						format: (value:number, ratio:number, id:string):string => {
							var record = this.records[this.keyToIndex[id]];
							if (record && record.label)
								return Weave.lang(record.label);
							return String(value);
						}
					}
				},
				legend: {
					show: false
				}
			});
		}

		protected handleC3MouseOver(d:any):void
		{
			var key = this.records[d.index].id;
			if (this.probeKeySet)
				this.probeKeySet.replaceKeys([key]);
			this.toolTip.show(this, this.chart.internal.d3.event, [key], [this.data]);
		}
		
		protected handleC3Selection():void
		{
			if (!this.selectionKeySet)
				return;
			let selectedIndices = this.chart.selected();
			let selectedKeys = selectedIndices.map(value => this.records[value.index].id);
			this.selectionKeySet.replaceKeys(selectedKeys);
		}
		
		private updateStyle():void
		{
			var selectedKeys:IQualifiedKey[] = this.selectionKeySet ? this.selectionKeySet.keys : [];
			var probedKeys:IQualifiedKey[] = this.probeKeySet ? this.probeKeySet.keys : [];
			var selectedIndices:number[] = selectedKeys.map((key:IQualifiedKey) => {
				return Number(this.keyToIndex[key as any]);
			});
			var probedIndices:number[] = probedKeys.map((key:IQualifiedKey) => {
				return Number(this.keyToIndex[key as any]);
			});
			var keys:string[] = Object.keys(this.keyToIndex);
			var indices:number[] = keys.map((key:string) => {
				return Number(this.keyToIndex[key]);
			});

			var unselectedIndices:number[] = _.difference(indices, selectedIndices);
			unselectedIndices = _.difference(unselectedIndices,probedIndices);
			if (probedIndices.length)
			{
				//this.customStyle(probedIndices, "circle", ".c3-shape", {opacity:1.0, "stroke-opacity": 0.5, "stroke-width": 1.5});
				this.chart.focus(probedKeys as any[] as string[]);
			}
			else if (selectedIndices.length)
			{
				//this.customStyle(unselectedIndices, "circle", ".c3-shape", {opacity: 0.3, "stroke-opacity": 0.0});
				//this.customStyle(selectedIndices, "circle", ".c3-shape", {opacity: 1.0, "stroke-opacity": 1.0});
				this.chart.focus(selectedKeys as any[] as string[]);
			}
			else if (!probedIndices.length)
			{
				//this.customStyle(indices, "circle", ".c3-shape", {opacity: 1.0, "stroke-opacity": 0.0});
				this.chart.focus();
			}
		}

		protected validate(forced:boolean = false):boolean
		{
			if (Weave.isBusy(this))
				return;

			var dataChanged = Weave.detectChange(this, this.data, this.label, this.innerRadius, this.fill, this.line, this.filteredKeySet);
			if (dataChanged)
			{
				this.records = ColumnUtils.getRecords(this.RECORD_FORMAT, this.filteredKeySet.keys, this.RECORD_DATATYPE);

				//minimizing the number of records displayed
				if (this.records.length > recordsToBeDisplayed)
				{
					this.records = this.records.slice(0, recordsToBeDisplayed);
					this.records = _.sortBy(this.records, 'data');
				}

				this.keyToIndex = {};

				this.records.forEach( (record:Record, index:number) => {
				   this.keyToIndex[record.id as any] = index;
				});

				var columns = this.records.map(function(record:Record) {
					return [record.id as any, record.data] as [string, number];
				});

				var colors:{[key:string]: string} = {};
				this.records.forEach((record:Record) => {
					colors[record.id as any] = (record.fill.color && record.fill.color !== "NaN") ? record.fill.color:"#808080";
				});

				this.c3Config.data.columns = columns;
				this.c3Config.data.type = this.innerRadius.value > 0 ? "donut" : "pie";
				this.c3Config.data.colors = colors;
				this.c3Config.data.unload = true;
			}
			var axisChanged = Weave.detectChange(this, this.xAxisName, this.yAxisName, this.margin);

			if (forced || dataChanged || axisChanged)
				return true;
			
			// update c3 selection
			var selectedKeys:IQualifiedKey[] = this.selectionKeySet ? this.selectionKeySet.keys : [];
			var keyToIndex = ArrayUtils.createLookup(this.records, "id");
			var selectedIndices:number[] = selectedKeys.map(key => Number(keyToIndex.get(key)));
			this.chart.select(null, selectedIndices, true);
			
			this.updateStyle();
			
			return false;
		}


		get selectableAttributes()
		{
			return super.selectableAttributes
				.set("Label", this.label)
				.set("Color", this.fill.color)
				.set("Wedge Size", this.data);
		}

		get defaultPanelTitle():string
		{
			return Weave.lang("Pie Chart of {0}", ColumnUtils.getTitle(this.data));
		}

		//todo:(pushCrumb)find a better way to link to sidebar UI for selectbleAttributes
		renderEditor =(pushCrumb:(title:string,renderFn:()=>JSX.Element , stateObject:any)=>void) :JSX.Element =>{
			return(Accordion.render(
				["Data", this.getSelectableAttributesEditor(pushCrumb)],
				["Titles", this.getTitlesEditor()],
				["Margins", this.getMarginEditor()],
				["Accessibility", this.getAltTextEditor()]
			))
		};

		getTitlesEditor():React.ReactChild[][]
		{
			return [
				[
					"Chart",
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

		get deprecatedStateMapping()
		{
			return [super.deprecatedStateMapping, {
				"children": {
					"visualization": {
						"plotManager": {
							"plotters": {
								"plot": {
									"filteredKeySet": this.filteredKeySet,
									"data": this.data,
									"fill": this.fill,
									"innerRadius": this.innerRadius,
									"label": this.label,
									"line": this.line,
									"labelAngleRatio": 0
								}
							}
						}
					}
				}
			}];
		}
	}
}
