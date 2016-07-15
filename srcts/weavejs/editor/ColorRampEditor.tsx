namespace weavejs.editor
{
	import HBox = weavejs.ui.flexbox.HBox;
	import VBox = weavejs.ui.flexbox.VBox;
	import Label = weavejs.ui.flexbox.Label;
	import ReactUtils = weavejs.util.ReactUtils;
	import WeaveReactUtils = weavejs.util.WeaveReactUtils;
	import ColorRamp = weavejs.util.ColorRamp;
	import LinkableWatcher = weavejs.core.LinkableWatcher;
	import StandardLib = weavejs.util.StandardLib;
	import SmartComponent = weavejs.ui.SmartComponent;
	import ColorPicker = weavejs.ui.ColorPicker;
	import ColorRampComponent = weavejs.ui.ColorRampComponent;
	import Button = weavejs.ui.Button;
	import ColorRampList = weavejs.ui.ColorRampList;
	import ComboBox = weavejs.ui.ComboBox;
	import CenteredIcon = weavejs.ui.CenteredIcon;
	import List = weavejs.ui.List;

	export interface ColorRampEditorProps extends React.Props<ColorRampEditor>
	{
		colorRamp:ColorRamp;
		compact?:boolean;
		onButtonClick?:React.MouseEventHandler;
		pushCrumb?:(title:string,renderFn:()=>JSX.Element , stateObject:any )=>void;
	}

	export interface ColorRampEditorState 
	{
	}

	const ALL:string = "All";
	// Three Classes are used (all three classes depends on colorRamp, which is passed from ColorRampEditor)
	// ColorRampEditor -> ColorRampSelector -> ColorRampCustomizer
	export class ColorRampEditor extends React.Component<ColorRampEditorProps, ColorRampEditorState>
	{
		private colorRampWatcher = WeaveReactUtils.forceUpdateWatcher(this, ColorRamp);
		public get colorRamp():ColorRamp { return this.colorRampWatcher.target as ColorRamp; }
		public set colorRamp(value:ColorRamp) { this.colorRampWatcher.target = value; }
		
		constructor(props:ColorRampEditorProps)
		{
			super(props);
			this.colorRamp = props.colorRamp;
		}

		componentWillReceiveProps(nextProps:ColorRampEditorProps):void
		{
			if (this.props.colorRamp !== nextProps.colorRamp)
			{
				this.colorRamp = nextProps.colorRamp
			}
		}

		private onButtonClick = (event:React.MouseEvent)=>
		{
			if (this.props.pushCrumb)
			{
				this.props.pushCrumb("Color Ramp", this.renderColorRampSelectorForEditor,null);
			}
			else if (this.props.onButtonClick)
			{
				this.props.onButtonClick(event);
			}
		};

		renderColorRampSelectorForEditor=():JSX.Element =>
		{
			return <ColorRampSelector colorRamp={this.props.colorRamp} pushCrumb= {this.props.pushCrumb} />
		};

		// for Weave Tool Editor
		renderCompactView()
		{
			return (
				<HBox className="weave-padded-hbox">
					<ColorRampComponent style={{ flex: 1 , border:"none"}} ramp={this.colorRamp && this.colorRamp.getHexColors()} direction="right"/>
					<Button
						onClick={this.onButtonClick}
						title="Click to change the color ramp"
						style={ { borderTopLeftRadius: 0, borderBottomLeftRadius: 0} }
					>
						<i className="fa fa-angle-right" aria-hidden="true" style={ {fontWeight:"bold"} }/>
					</Button>
				</HBox>
			);
		}

		renderFullView()
		{
			return <ColorRampSelector colorRamp={this.colorRamp}/>;
		}
		
		render()
		{
			return this.props.compact ? this.renderCompactView() : this.renderFullView();
		}
	}

	interface ColorRampSelectorProps extends React.Props<ColorRampSelector>
	{
		colorRamp:ColorRamp;
		pushCrumb?:(title:string,renderFn:()=>JSX.Element , stateObject:any )=>void;
	}

	interface ColorRampSelectorState
	{
		selectedFilter:string;
	}

	// Component to change the ramp
	class ColorRampSelector extends SmartComponent<ColorRampSelectorProps, ColorRampSelectorState>
	{
		private filterOptions:string[];

		constructor(props:ColorRampSelectorProps)
		{
			super(props);
			if (this.props.colorRamp)
				this.props.colorRamp.addGroupedCallback(this, this.forceUpdate);

			this.state = {
				selectedFilter: ALL
			};

			this.filterOptions = [];
			var tagsLookup:{[tag:string]:string} = {};
			for (var ramp of ColorRamp.allColorRamps)
				for (var tag of ramp.tags.split(","))
					if (!tagsLookup[tag])
						this.filterOptions.push(tagsLookup[tag] = tag);

			this.filterOptions.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
			this.filterOptions.unshift(ALL);
		}

		componentWillReceiveProps(nextProps:ColorRampSelectorProps):void
		{
			if (this.props.colorRamp !== nextProps.colorRamp)
			{
				if (this.props.colorRamp)
					this.props.colorRamp.removeCallback(this, this.forceUpdate);
				if (nextProps.colorRamp)
					nextProps.colorRamp.addGroupedCallback(this, this.forceUpdate);
			}
		}

		reverseColors=()=>
		{
			if (this.props.colorRamp)
				this.props.colorRamp.reverse();
		};

		addColor=(color:string,eventType:string)=>
		{
			var colors = this.props.colorRamp.getColors() as number[];
			if (eventType == "onClick")
			{
				colors.push(StandardLib.asNumber(color));
			}
			else if (eventType == "onChange"){
				colors[colors.length -1] = StandardLib.asNumber(color);
			}

			this.props.colorRamp.setSessionState(colors)
		};


		handleColorRampSelectionChange = (newColors:number[]) =>
		{
			if (this.props.colorRamp)
				this.props.colorRamp.setSessionState(newColors);
		};

		private onCustomizeButtonClick = (event:React.MouseEvent) =>
		{
			if (this.props.pushCrumb)
			{
				this.props.pushCrumb("Customize" , this.renderColorRampCustomizerForEditor,null)
			}
		};

		renderColorRampCustomizerForEditor =():JSX.Element =>
		{
			return <ColorRampCustomizer style={ {border:"1px solid lightgrey"} } colorRamp={this.props.colorRamp} pushCrumb={this.props.pushCrumb}/>
		};

		render()
		{
			var colors:number[] = this.props.colorRamp ? this.props.colorRamp.getColors() : [];
			var hexColors:string[] = this.props.colorRamp ? this.props.colorRamp.getHexColors() : [];

			var filteredRamps = (
				this.state.selectedFilter == ALL
				?	ColorRamp.allColorRamps
				:	ColorRamp.allColorRamps.filter((v) => v.tags.indexOf(this.state.selectedFilter) >= 0)
			);

			if (this.props.pushCrumb)
			{
				return (
					<VBox className="weave-padded-vbox" style={{flex: 1}} disabled={!this.props.colorRamp}>
						<VBox className="weave-padded-vbox">
							<HBox style={{overflow: "auto"}} className="weave-padded-hbox">
								<ColorRampComponent style={{flex: 1, border:"none" }} direction="right" ramp={hexColors}/>
								<Button
									onClick={this.reverseColors}
									title="Click to reverse colors"
									style={ { borderRadius:0, borderLeft:"none"} }
								>
									{'↓↑'}
								</Button>
								<Button
									onClick={this.onCustomizeButtonClick}
									title="Click to customize colors"
									style={ { borderTopLeftRadius:0, borderBottomLeftRadius:0,borderLeft:"none"} }
								>
									<i className="fa fa-angle-right" aria-hidden="true" style={ {fontWeight:"bold"} }/>
								</Button>
							</HBox>
						</VBox>
						
						<ColorRampList selectedColors={colors} allColorRamps={filteredRamps} onChange={this.handleColorRampSelectionChange}/>
						<HBox overflow padded style={{alignItems: "center"}} className="weave-padded-hbox">
							{Weave.lang("Filter:")}
							<ComboBox
								fluid={false}
								value={this.state.selectedFilter}
								options={this.filterOptions}
								onChange={(value:string) => this.setState({ selectedFilter: value	}) }
								direction="upward"
							/>
						</HBox>
					</VBox>
				);
			}
			else
			{
				return (
					<VBox padded overflow style={{flex: 1}} disabled={!this.props.colorRamp}>
						<HBox padded style={{flex: 1}}>
							<HBox style={{flex: .7}}>
								<ColorRampList selectedColors={colors} allColorRamps={filteredRamps} onChange={this.handleColorRampSelectionChange}/>
							</HBox>
							<VBox padded style={{flex: .3, padding: "4px", border: "1px solid lightgrey"}}>
								<label style={{marginTop: 5, fontWeight: "bold"}}>{Weave.lang("Customize")}</label>
								<ColorRampCustomizer colorRamp={this.props.colorRamp} />
							</VBox>
						</HBox>
						<HBox padded overflow>
							<HBox padded overflow style={{flex: .7, alignItems: "center"}}>
								{Weave.lang("Filter:")}
								<ComboBox
									fluid={false}
									value={this.state.selectedFilter}
									options={this.filterOptions}
									onChange={(value:string) => this.setState({	selectedFilter: value })}
									direction="upward"
								/>
							</HBox>
							<HBox overflow style={{flex: .3, justifyContent: "space-between"}}>
								<CenteredIcon onClick={this.reverseColors}>{'↓↑'}</CenteredIcon>
								<ColorPicker
									buttonMode={true}
									direction={ColorPicker.TOP_LEFT}
									buttonLabel="Add color"
									onChange={(newColor:string) => this.addColor(newColor, "onChange")}
									onClick={(newColor:string) => this.addColor(newColor, "onClick")}
								/>
							</HBox>
						</HBox>
					</VBox>
				);
			}
		}
	}

	interface ColorRampCustomizerProps extends React.HTMLProps<ColorRampCustomizer>
	{
		colorRamp:ColorRamp;
		pushCrumb?:(title:string,renderFn:()=>JSX.Element , stateObject:any )=>void;
	}

	interface ColorRampCustomizerState
	{
	}

	// Component to customize the selected ramp
	class ColorRampCustomizer extends SmartComponent<ColorRampCustomizerProps, ColorRampCustomizerState>
	{
		constructor(props:ColorRampCustomizerProps)
		{
			super(props);
			if (this.props.colorRamp)
				this.props.colorRamp.addGroupedCallback(this, this.forceUpdate);
		}

		componentWillReceiveProps(nextProps:ColorRampCustomizerProps):void
		{
			if (this.props.colorRamp !== nextProps.colorRamp)
			{
				if (this.props.colorRamp)
					this.props.colorRamp.removeCallback(this, this.forceUpdate);
				if (nextProps.colorRamp)
					nextProps.colorRamp.addGroupedCallback(this, this.forceUpdate);
			}
		}

		addColor=(color:string,eventType:string)=>
		{
			var colors = this.props.colorRamp.getColors() as number[];
			if (eventType == "onClick")
			{
				colors.push(StandardLib.asNumber(color));
			}
			else if (eventType == "onChange"){
				colors[colors.length -1] = StandardLib.asNumber(color);
			}

			this.props.colorRamp.setSessionState(colors)
		}

		updateColorsAtIndex(index:number, color:string)
		{
			if (this.props.colorRamp)
			{
				var colors = this.props.colorRamp.getColors() as number[];
				if (index != null){
					colors[index] = StandardLib.asNumber(color);
				}
				else
				{
					colors.push(StandardLib.asNumber(color));
				}
				this.props.colorRamp.setSessionState(colors)

			}
		}

		removeColorAtIndex(index:number)
		{
			if (this.props.colorRamp)
			{
				var colors:number[] = this.props.colorRamp.getColors() as number[];
				colors.splice(index, 1);
				this.props.colorRamp.setSessionState(colors)
			}
		}

		handleColorRampSelectionChange = (newColors:number[]) =>
		{
			if (this.props.colorRamp)
				this.props.colorRamp.setSessionState(newColors);
		}

		render()
		{
			var colors:number[] = this.props.colorRamp ? this.props.colorRamp.getColors() : [];
			var hexColors:string[] = this.props.colorRamp ? this.props.colorRamp.getHexColors() : [];

			var listOptions = hexColors.map((hexColor, index) => {
				return {
					value: index,
					label: (
						<HBox padded style={{flex: 1, justifyContent: "space-between", alignItems: "center", overflow: "hidden"}}>
							<ColorPicker hexColor={hexColor}
										 onChange={(newColor:string) => this.updateColorsAtIndex(index, newColor)}/>
							<Label style={{flex: 1, fontFamily: "monospace"}} children={hexColor.toUpperCase()}/>
							<CenteredIcon iconProps={{className: "fa fa-times fa-fw"}} onClick={() => this.removeColorAtIndex(index)}/>
						</HBox>
					)
				};
			});

			let styleObj:React.CSSProperties = _.merge({}, this.props.style, {overflow: "auto", padding: "4px", flex: 1});

			if (this.props.pushCrumb) // for Weave Tool Editor
			{
				return (
					<VBox padded>
						<div style={{alignSelf:"flex-end"}}>
							<HBox>
								<ColorPicker  buttonMode={true} buttonLabel="Add color" direction={ColorPicker.BOTTOM_LEFT}
											  onChange={(newColor:string) => this.addColor( newColor, "onChange")}
											  onClick={(newColor:string) => this.addColor( newColor, "onClick")}/>
							</HBox>

						</div>
						<HBox padded style={ styleObj }>
							<ColorRampComponent style={{width: 30}} direction="bottom" ramp={hexColors}/>
							<List style={ {flex: 1 } } options={listOptions}/>
						</HBox>

					</VBox>
				);
			}
			else // for popUp
			{
				return (
					<HBox padded style={styleObj}>
						<ColorRampComponent style={{width: 30}} direction="bottom" ramp={hexColors}/>
						<List style={ {flex: 1} }  options={listOptions}/>
					</HBox>
				);
			}
		}
	}
}
