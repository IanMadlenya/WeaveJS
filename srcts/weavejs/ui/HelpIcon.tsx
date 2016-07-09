import * as React from "react";
import {HBox} from "./flexbox/FlexBox";
import ReactUtils from "../util/ReactUtils";

export interface HelpIconProps extends React.HTMLProps<HelpIcon>
{
}

export interface HelpIconState
{
	
}

export default class HelpIcon extends React.Component<HelpIconProps, HelpIconState>
{
	constructor(props:HelpIconProps)
	{
		super(props);
	}
	
	popup:React.ReactInstance;
	
	removePopup()
	{
		if (this.popup)
			ReactUtils.closePopup(this.popup);
		this.popup = null;
	}

	componentWillUnmount()
	{
		this.removePopup();
	}
	
	render()
	{
		var props:HelpIconProps = {};
		for (var key in this.props)
			if (key != "children" && key != "ref" && key != "key")
				(props as any)[key] = (this.props as any)[key]

		return (
			<i
				{...props as any}
				className={"weave-help-icon fa fa-question-circle fa-fw" + (" " + this.props.className || "")}
				onMouseEnter={(event) => {
					this.popup = ReactUtils.openPopup(
						this,
						<HBox
							style={{
								position: "absolute",
								left: event.clientX + 10,
								top: event.clientY + 10,
								maxWidth: 400
							}}
							className="weave-help-tooltip"
							children={this.props.children}
						/>
					);
				}} 
				onMouseLeave={() => this.removePopup()}
			/>
		)
	}
}
