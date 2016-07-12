import * as React from "react";
import * as _ from "lodash";
import {HBox, VBox} from "./flexbox/FlexBox";
import classNames from "../../modules/classnames";

const TOP:"top" = "top";
const BOTTOM:"bottom" = "bottom";

export interface TabsProps extends React.Props<Tabs>
{
	labels:React.ReactChild[];
	tabs:JSX.Element[];
	location?:"top"|"bottom";
	tabBarChildren?:React.ReactChild;
	initialActiveTabIndex?:number;
	activeTabIndex?:number;
	onViewChange?:(index:number) => void;
	style?:React.CSSProperties;
	tabHeaderClassName?:string;
	tabHeaderStyle?:React.CSSProperties;
	tabContainerClassName?:string;
	tabContentClassName?:string;
	tabContentStyle?:React.CSSProperties;
	tabLabelClassName?:string;
	tabLabelStyle?:React.CSSProperties;
	tabBarClassName?:string;
	tabBarStyle?:React.CSSProperties;
	onTabClick?:(index:number, event?:React.MouseEvent)=>void;
	onTabDoubleClick?:(index:number, event?:React.MouseEvent)=>void;
}

export interface TabsState
{
	activeTabIndex:number;
}

export default class Tabs extends React.Component<TabsProps, TabsState>
{
	
	constructor(props:TabsProps)
	{
		super(props);
		this.state = {
			activeTabIndex: props.initialActiveTabIndex || props.activeTabIndex || 0
		}
	}

	static defaultProps:TabsProps = {
		labels: [],
		tabs: [],
		location: "top"
	};

	componentWillReceiveProps(props:TabsProps)
	{
		if (props.activeTabIndex != null)
			this.setState({
				activeTabIndex: props.activeTabIndex
			});
	}

	changeTabView(index:number) {
		if (this.state.activeTabIndex != index)
		{
			this.setState({
				activeTabIndex:index
			});
			this.props.onViewChange && this.props.onViewChange(index);
		}
	}

	render():JSX.Element
	{
		return (
			<div
				className={classNames(this.props.tabContainerClassName || "weave-tab-container", this.props.location)}
				style={_.merge(
					{},
					this.props.style,
					{
						overflow: "hidden",
						flex: 1,
						display: "flex",
						flexDirection: this.props.location === BOTTOM ? "column" : "column-reverse"
					}
				)}
			>
				<VBox key="content" className={classNames(this.props.tabContentClassName || "weave-tab-content", this.props.location)} style={{flex: 1, overflow: "auto"}}>
					{
						this.props.tabs[this.state.activeTabIndex]
					}
				</VBox>
				<HBox
					overflow
					key="tabs"
					className={classNames(this.props.tabBarClassName || "weave-tab-label-container", this.props.location)}
					style={this.props.tabBarStyle}
				>
					{
						this.props.labels.map((label, index) => {
							return (
								<HBox
									overflow
									key={index}
									className={classNames(this.props.tabLabelClassName || "weave-tab-label", {"active": this.state.activeTabIndex == index}, this.props.location)}
									style={this.props.tabLabelStyle}
									onClick={(event:React.MouseEvent) => {
										if (this.props.onTabClick)
											this.props.onTabClick(index, event);
										
										if (!event.defaultPrevented)
											this.changeTabView(index);
									}}
									onDoubleClick={(event:React.MouseEvent) => this.props.onTabDoubleClick && this.props.onTabDoubleClick(index, event)}
								>
									{label}
								</HBox>
							);
						})
					}
					{
						this.props.tabBarChildren
					}
				</HBox>
			</div>
		);
	}
}
