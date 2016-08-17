namespace weavejs.tool.c3tool
{
	import FormatUtils = weavejs.util.FormatUtils;
	import HBox = weavejs.ui.flexbox.HBox;
	import VBox = weavejs.ui.flexbox.VBox;
	import StatefulTextField = weavejs.ui.StatefulTextField;
	import WeaveReactUtils = weavejs.util.WeaveReactUtils

	import IQualifiedKey = weavejs.api.data.IQualifiedKey;
	import IAttributeColumn = weavejs.api.data.IAttributeColumn;
	import IColumnStatistics = weavejs.api.data.IColumnStatistics;
	import LinkableNumber = weavejs.core.LinkableNumber;
	import SimpleBinningDefinition = weavejs.data.bin.SimpleBinningDefinition;
	import ColorRamp = weavejs.util.ColorRamp;
	import FilteredKeySet = weavejs.data.key.FilteredKeySet;
	import DynamicColumn = weavejs.data.column.DynamicColumn;
	import DynamicBinningDefinition = weavejs.data.bin.DynamicBinningDefinition;
	import StandardLib = weavejs.util.StandardLib;
	import LinkableHashMap = weavejs.core.LinkableHashMap;
	import LinkableString = weavejs.core.LinkableString;
	import IColumnWrapper = weavejs.api.data.IColumnWrapper;
	import IVisToolProps = weavejs.api.ui.IVisToolProps;
	import AbstractC3Tool = weavejs.tool.c3tool.AbstractC3Tool;
	import ColumnUtils = weavejs.data.ColumnUtils;
	import ILinkableObjectWithNewProperties = weavejs.api.core.ILinkableObjectWithNewProperties;
	import ISelectableAttributes = weavejs.api.data.ISelectableAttributes;
	import IVisTool = weavejs.api.ui.IVisTool;

	declare type Record = {
		id: IQualifiedKey,
		meterColumn: number
	};

	export class C3Gauge extends AbstractC3Tool
	{
		meterColumn = Weave.linkableChild(this, DynamicColumn);
		binningDefinition = Weave.linkableChild(this, DynamicBinningDefinition);
		colorRamp = Weave.linkableChild(this, ColorRamp);
		private colStats = Weave.linkableChild(this, WeaveAPI.StatisticsCache.getColumnStatistics(this.meterColumn));

		private RECORD_FORMAT = {
			id: IQualifiedKey,
			meterColumn: this.meterColumn
		};

		private RECORD_DATATYPE = {
			meterColumn: Number
		};

		private keyToIndex:{[key:string]: number};
		private records:Record[];

		constructor(props:IVisToolProps)
		{
			super(props);

			this.filteredKeySet.setSingleKeySource(this.meterColumn);

			this.filteredKeySet.keyFilter.targetPath = ['defaultSubsetKeyFilter'];
			this.selectionFilter.targetPath = ['defaultSelectionKeySet'];
			this.probeFilter.targetPath = ['defaultProbeKeySet'];

			//initializes the binning definition which defines a number of evenly spaced bins
			this.binningDefinition.requestLocalObject(SimpleBinningDefinition, false);
			(this.binningDefinition.internalObject as SimpleBinningDefinition).numberOfBins.value = 3;
			this.binningDefinition.generateBinClassifiersForColumn(this.meterColumn);
			Weave.linkableChild(this, this.binningDefinition.asyncResultCallbacks);
			this.margin.left = Weave.linkableChild(this, new LinkableNumber(0));
			this.margin.right = Weave.linkableChild(this, new LinkableNumber(0));
			this.margin.top = Weave.linkableChild(this, new LinkableNumber(10));
			this.margin.bottom = Weave.linkableChild(this, new LinkableNumber(10));

			this.keyToIndex = {};

			this.mergeConfig({
				padding: {
					top: 10,
					bottom: 10,
					left: 10,
					right: 10
				},
				data: {
					columns: [],
					type: "gauge",
					xSort: false,
					names: {}
				},
				gauge: {
					label: {
						format: function(value, ratio)
						{
							return String(FormatUtils.defaultNumberFormatting(value));
						},
						show: false
					},
					//min: 0,
					//max: 200, // get max from column statistics
					//units: ' ',
					width: 39 // arc width
				},
				color: {
					threshold: {
						//unit: ' ', // percentage is default
						//max: 200, // should be set by data max using column stats
						//values: [30, 60, 90, 100] //should be set in even range using the color ramp
					}
				}
			});
		}

		protected updateConfigMargin()
		{
			this.c3Config.padding.top = this.margin.top.value;
			this.c3Config.padding.bottom = this.margin.bottom.value;
		}

		protected validate(forced:boolean = false):boolean
		{
			var changeDetected:boolean = false;
			if (Weave.detectChange(this, this.meterColumn, this.colorRamp, this.filteredKeySet, this.probeKeySet, this.selectionKeySet, this.colStats, this.binningDefinition, this.margin))
			{
				changeDetected = true;
				var name = this.meterColumn.getMetadata('title');

				this.records = ColumnUtils.getRecords(this.RECORD_FORMAT, this.filteredKeySet.keys, this.RECORD_DATATYPE);

				this.keyToIndex = {};

				this.records.forEach( (record:Record, index:number) => {
					this.keyToIndex[record.id as any] = index;
				});

				var numberOfBins = this.binningDefinition.getBinNames().length;
				this.c3Config.color.pattern = this.colorRamp.getHexColors();

				let binningDefinitionObject = (this.binningDefinition.internalObject as SimpleBinningDefinition);
				this.c3Config.gauge.min = isNaN(binningDefinitionObject.overrideInputMin.value) ? this.colStats.getMin() : binningDefinitionObject.overrideInputMin.value;
				this.c3Config.gauge.max = isNaN(binningDefinitionObject.overrideInputMax.value) ? this.colStats.getMax() : binningDefinitionObject.overrideInputMax.value;

				var range = this.c3Config.gauge.max - this.c3Config.gauge.min;
				this.c3Config.color.threshold.values = [];
				for (var i = 1; i <= numberOfBins; i++)
				{
					this.c3Config.color.threshold.values.push(this.c3Config.gauge.min + i * (range / numberOfBins));
				}
				this.c3Config.gauge.label.show = true;

				var column:any[] = [name];
				var selectedKeys:IQualifiedKey[] = this.selectionKeySet ? this.selectionKeySet.keys : [];
				var probedKeys:IQualifiedKey[] = this.probeKeySet ? this.probeKeySet.keys : [];
				if (probedKeys.length)
					probedKeys.forEach(key => column.push(this.meterColumn.getValueFromKey(key, Number)));
				else if (selectedKeys.length)
					selectedKeys.forEach(key => column.push(this.meterColumn.getValueFromKey(key, Number)));
				
				if (column.length == 2)
					this.c3Config.data.columns = [column];
				else
					this.c3Config.data.columns = [];
				
				this.updateConfigMargin();
			}

			return changeDetected || forced;
		}

		get selectableAttributes()
		{
			return super.selectableAttributes.set("Meter", this.meterColumn);
		}

		getMarginEditor():React.ReactChild[][]
		{
			return [
				[
					Weave.lang("Margins"),
					<HBox className="weave-padded-hbox" style={{alignItems: 'center'}} >
						<StatefulTextField type="number" disabled={true} style={{textAlign: "center", flex:1, minWidth: 60}} ref={WeaveReactUtils.linkReactStateRef(this, {value: this.margin.left})}/>
						<VBox className="weave-padded-vbox" style={{flex: 1}}>
							<StatefulTextField type="number" style={{textAlign: "center", minWidth: 60}} ref={WeaveReactUtils.linkReactStateRef(this, {value: this.margin.top})}/>
							<StatefulTextField type="number" style={{textAlign: "center", minWidth: 60}} ref={WeaveReactUtils.linkReactStateRef(this, {value: this.margin.bottom})}/>
						</VBox>
						<StatefulTextField type="number" disabled={true} style={{textAlign: "center", flex:1, minWidth: 60}} ref={WeaveReactUtils.linkReactStateRef(this, {value: this.margin.right})}/>
					</HBox>
				]
			];
		}

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

		get defaultPanelTitle():string
		{
			return Weave.lang("Gauge of {0}", ColumnUtils.getTitle(this.meterColumn));
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
									"meterColumn": this.meterColumn,
									"colorRamp": this.colorRamp,
									"binningDefinition": this.binningDefinition
								}
							}
						}
					}
				}
			}];
		}
	}

	Weave.registerClass(
		C3Gauge,
		["weavejs.tool.c3tool.C3Gauge", "weave.visualization.tools::GaugeTool"],
		[
			IVisTool,
			ILinkableObjectWithNewProperties,
			ISelectableAttributes
		],
		"Gauge"
	);
}
