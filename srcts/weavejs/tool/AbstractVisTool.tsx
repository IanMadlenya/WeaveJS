namespace weavejs.tool
{
	import MenuItemProps = weavejs.ui.menu.MenuItemProps;
	import IGetMenuItems = weavejs.ui.menu.IGetMenuItems;
	import Menu = weavejs.ui.menu.Menu;
	import HBox = weavejs.ui.flexbox.HBox;
	import VBox = weavejs.ui.flexbox.VBox;
	import StatefulTextField = weavejs.ui.StatefulTextField;
	import WeaveReactUtils = weavejs.util.WeaveReactUtils
	import MiscUtils = weavejs.util.MiscUtils;
	import Accordion = weavejs.ui.Accordion;
	import IQualifiedKey = weavejs.api.data.IQualifiedKey;
	import IAttributeColumn = weavejs.api.data.IAttributeColumn;
	import KeySet = weavejs.data.key.KeySet;
	import LinkableNumber = weavejs.core.LinkableNumber;
	import LinkableString = weavejs.core.LinkableString;
	import FilteredKeySet = weavejs.data.key.FilteredKeySet;
	import DynamicKeyFilter = weavejs.data.key.DynamicKeyFilter;
	import ILinkableObjectWithNewProperties = weavejs.api.core.ILinkableObjectWithNewProperties;
	import WeaveMenuItem = weavejs.util.WeaveMenuItem;
	import KeyFilter = weavejs.data.key.KeyFilter;
	import ILinkableHashMap = weavejs.api.core.ILinkableHashMap;
	import IColumnWrapper = weavejs.api.data.IColumnWrapper;
	import IColumnReference = weavejs.api.data.IColumnReference;
	import IInitSelectableAttributes = weavejs.api.ui.IInitSelectableAttributes;
	import ColumnUtils = weavejs.data.ColumnUtils;
	import StatefulTextArea = weavejs.ui.StatefulTextArea;
	import Checkbox = weavejs.ui.Checkbox;
	import LinkableBoolean = weavejs.core.LinkableBoolean;
	import IAltText = weavejs.api.ui.IAltText;
	import IAltTextConfig = weavejs.api.ui.IAltTextConfig;
	import IVisToolProps = weavejs.api.ui.IVisToolProps;
	import IVisToolState = weavejs.api.ui.IVisToolState;
	import IVisTool = weavejs.api.ui.IVisTool;
	import renderSelectableAttributes = weavejs.api.ui.renderSelectableAttributes;

	export class Margin
	{
		top = Weave.linkableChild(this, new LinkableNumber(20));
		bottom = Weave.linkableChild(this, new LinkableNumber(100));
		left = Weave.linkableChild(this, new LinkableNumber(100));
		right = Weave.linkableChild(this, new LinkableNumber(20));
	}
	export class OverrideBounds
	{
		xMin = Weave.linkableChild(this, LinkableNumber);
		yMin = Weave.linkableChild(this, LinkableNumber);
		xMax = Weave.linkableChild(this, LinkableNumber);
		yMax = Weave.linkableChild(this, LinkableNumber);
	}

	export interface VisToolGroup
	{
		filteredKeySet:FilteredKeySet,
		selectionFilter:DynamicKeyFilter,
		probeFilter:DynamicKeyFilter
	}

	Weave.registerClass(Margin, "weavejs.tool.Margin");
	Weave.registerClass(OverrideBounds, "weavejs.tool.OverrideBounds");



	export class AbstractVisTool<P extends IVisToolProps, S extends IVisToolState> extends React.Component<P, S> implements IVisTool, ILinkableObjectWithNewProperties, IGetMenuItems, IInitSelectableAttributes, IAltText
	{
		constructor(props:P)
		{
			super(props);
			Weave.getCallbacks(this).addGroupedCallback(this, this.forceUpdate, true);
		}

		componentDidMount()
		{
			Menu.registerMenuSource(this);
		}

		panelTitle = Weave.linkableChild(this, LinkableString);
		
		altText:IAltTextConfig = Weave.linkableChild(this, IAltTextConfig, this.forceUpdate, true);

		xAxisName = Weave.linkableChild(this, LinkableString);
		yAxisName = Weave.linkableChild(this, LinkableString);
		margin = Weave.linkableChild(this, Margin);
		overrideBounds = Weave.linkableChild(this, OverrideBounds);

		filteredKeySet = Weave.linkableChild(this, FilteredKeySet);
		selectionFilter = Weave.linkableChild(this, DynamicKeyFilter);
		probeFilter = Weave.linkableChild(this, DynamicKeyFilter);

		protected get selectionKeySet()
		{
			var keySet = this.selectionFilter.target as KeySet;
			return keySet instanceof KeySet ? keySet : null;
		}
		protected isSelected(key:IQualifiedKey):boolean
		{
			var keySet = this.selectionFilter.target as KeySet;
			return keySet instanceof KeySet && keySet.containsKey(key);
		}

		protected get probeKeySet()
		{
			var keySet = this.probeFilter.target as KeySet;
			return keySet instanceof KeySet ? keySet : null;
		}
		protected isProbed(key:IQualifiedKey):boolean
		{
			var keySet = this.probeFilter.target as KeySet;
			return keySet instanceof KeySet && keySet.containsKey(key);
		}

		get title():string
		{
			return MiscUtils.evalTemplateString(this.panelTitle.value, this) || this.defaultPanelTitle;
		}

		getAutomaticDescription():string
		{
			return this.title;
		}

		get defaultPanelTitle():string
		{
			return "";
		}

		get defaultXAxisLabel():string
		{
			return "";
		}

		get defaultYAxisLabel():string
		{
			return "";
		}

		get selectableAttributes():Map<string, (IColumnWrapper|ILinkableHashMap)>
		{
			return new Map<string, (IColumnWrapper | ILinkableHashMap)>();
		}

		initSelectableAttributes(input:(IAttributeColumn | IColumnReference)[]):void
		{
			AbstractVisTool.initSelectableAttributes(this.selectableAttributes, input);
		}
		
		static initSelectableAttributes(selectableAttributes:Map<string, (IColumnWrapper|ILinkableHashMap)>, input:(IAttributeColumn | IColumnReference)[]):void
		{
			var attrs = weavejs.util.JS.mapValues(selectableAttributes);
			ColumnUtils.initSelectableAttributes(attrs, input);
		}
		
		private static createFromSetToSubset(set: KeySet, filter:KeyFilter):void
		{
			filter.replaceKeys(false, true, set.keys, null);
			set.clearKeys();
		}
		private static removeFromSetToSubset(set: KeySet, filter: KeyFilter):void
		{
			filter.excludeKeys(set.keys);
			set.clearKeys();
		}
		private static clearSubset(filter:KeyFilter):void
		{
			filter.replaceKeys(true, true);
		}

		private static localProbeKeySet = new weavejs.data.key.KeySet();

		static getMenuItems(target:VisToolGroup):MenuItemProps[]
		{
			let menuItems:Array<any> = [];
			let selectionKeySet = target.selectionFilter.target as KeySet;
			let probeKeySet = target.probeFilter.target as KeySet;
			let subset = target.filteredKeySet.keyFilter.getInternalKeyFilter() as KeyFilter;

			if (probeKeySet)
				Weave.copyState(probeKeySet, this.localProbeKeySet);
			else
				this.localProbeKeySet.clearKeys();

			let usingIncludedKeys: boolean = subset && subset.included.keys.length > 0;
			let usingExcludedKeys: boolean = subset && subset.excluded.keys.length > 0;
			let includeMissingKeys: boolean = subset && subset.includeMissingKeys.value;
			let usingSubset: boolean = includeMissingKeys ? usingExcludedKeys : true;
			let usingProbe: boolean = this.localProbeKeySet.keys.length > 0;
			let usingSelection: boolean = selectionKeySet && selectionKeySet.keys.length > 0;

			if (!usingSelection && usingProbe && subset)
			{
				menuItems.push({
					label: Weave.lang("Create subset from highlighted record(s)"),
					click: this.createFromSetToSubset.bind(null, this.localProbeKeySet, subset)
				});
				menuItems.push({
					label: Weave.lang("Remove highlighted record(s) from subset"),
					click: this.removeFromSetToSubset.bind(null, this.localProbeKeySet, subset)
				});
			}
			else
			{
				menuItems.push({
					enabled: usingSelection && subset,
					label: Weave.lang("Create subset from selected record(s)"),
					click: this.createFromSetToSubset.bind(null, selectionKeySet, subset)
				});
				menuItems.push({
					enabled: usingSelection && subset,
					label: Weave.lang("Remove selected record(s) from subset"),
					click: this.removeFromSetToSubset.bind(null, selectionKeySet, subset)
				});
			}

			menuItems.push({
				enabled: usingSubset && subset,
				label: Weave.lang("Show all records"),
				click: this.clearSubset.bind(null, subset)
			});

			return menuItems;
		}

		getMenuItems():MenuItemProps[]
		{
			return AbstractVisTool.getMenuItems(this);
		}
		
		getSelectableAttributesEditor(pushCrumb:(title:string,renderFn:()=>JSX.Element , stateObject:any)=>void = null):React.ReactChild[][]
		{
			return renderSelectableAttributes(this.selectableAttributes, pushCrumb);
		}
		
		renderNumberEditor(linkableNumber:LinkableNumber, flex:number):JSX.Element
		{
			var style:React.CSSProperties = {textAlign: "center", flex, minWidth: 60};
			return <StatefulTextField type="number" style={style} ref={WeaveReactUtils.linkReactStateRef(this, {value: linkableNumber})}/>;
		}

		getMarginEditor():React.ReactChild[][]
		{
			return [
				[
					Weave.lang("Margins"),
					<HBox className="weave-padded-hbox" style={{alignItems: 'center'}} >
						{ this.renderNumberEditor(this.margin.left, 1) }
						<VBox className="weave-padded-vbox" style={{flex: 1}}>
							{ this.renderNumberEditor(this.margin.top, null) }
							{ this.renderNumberEditor(this.margin.bottom, null) }
						</VBox>
						{ this.renderNumberEditor(this.margin.right, 1) }
					</HBox>
				]
			];
		}

		getTitlesEditor():React.ReactChild[][]
		{
			return [
				[
					Weave.lang("Chart"),
					this.panelTitle,
					this.defaultPanelTitle
				],
				[
					Weave.lang("X axis"),
					this.xAxisName,
					this.defaultXAxisLabel
				],
				[
					Weave.lang("Y axis"),
					this.yAxisName,
					this.defaultYAxisLabel
				]
			].map((row:[string, LinkableString]) => {
				
				return [
					Weave.lang(row[0]),
					<StatefulTextField ref={ WeaveReactUtils.linkReactStateRef(this, {value: row[1]})} placeholder={row[2] as string}/>
				]
			});
		}

		getAltTextEditor():React.ReactChild[][]
		{
			return [
				[
					Weave.lang("Alt Text"),
					<StatefulTextArea
						ref={ WeaveReactUtils.linkReactStateRef(this, {value: this.altText.text})}
						placeholder={ this.getAutomaticDescription() }
					/>
				],
				[
					Weave.lang("Show as caption"),
					<Checkbox
						ref={ WeaveReactUtils.linkReactStateRef(this, {value: this.altText.showAsCaption})}
						label=" "
					/>
				]
			]
		}

		renderEditor =(pushCrumb:(title:string,renderFn:()=>JSX.Element , stateObject:any)=>void = null):JSX.Element =>
		{
			return Accordion.render(
				["Data", this.getSelectableAttributesEditor(pushCrumb)],
				["Titles", this.getTitlesEditor()],
				["Margins", this.getMarginEditor()],
				["Accessibility", this.getAltTextEditor()]
			);
		}

		get deprecatedStateMapping():Object
		{
			return {
				"children": {
					"visualization": {
						"plotManager": {
							"marginTop": this.margin.top,
							"marginLeft": this.margin.left,
							"marginRight": this.margin.right,
							"marginBottom": this.margin.bottom,
							"overrideXMin": this.overrideBounds.xMin,
							"overrideYMin": this.overrideBounds.yMin,
							"overrideXMax": this.overrideBounds.xMax,
							"overrideYMax": this.overrideBounds.yMax,
							"plotters": {
								"yAxis": {
									"overrideAxisName": this.yAxisName
								},
								"xAxis": {
									"overrideAxisName": this.xAxisName
								}
							}
						}
					}
				}
			};
		}

		static handlePointClick(toolGroup:VisToolGroup, event:MouseEvent):void
		{
			let probeKeySet = toolGroup.probeFilter.target as KeySet;
			let selectionKeySet = toolGroup.selectionFilter.target as KeySet;

			if (!(probeKeySet instanceof KeySet) || !(selectionKeySet instanceof KeySet))
				return;

			var probeKeys: IQualifiedKey[] = probeKeySet.keys;
			if (!probeKeys.length)
			{
				selectionKeySet.clearKeys();
				return;
			}

			var isSelected = false;
			for (var key of probeKeys)
			{
				if (selectionKeySet.containsKey(key))
				{
					isSelected = true;
					break;
				}
			}
			if (event.ctrlKey || event.metaKey)
			{
				if (isSelected)
					selectionKeySet.removeKeys(probeKeys);
				else
					selectionKeySet.addKeys(probeKeys);
			}
			else
			{
				//Todo: needs to be more efficient check
				if (_.isEqual(selectionKeySet.keys.sort(), probeKeys.sort()))
					selectionKeySet.clearKeys();
				else
					selectionKeySet.replaceKeys(probeKeys);
			}
		}
	}
}
