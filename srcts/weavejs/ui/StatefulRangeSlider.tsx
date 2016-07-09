import * as _ from "lodash";
import * as React from "react";
import LinkableVariable = weavejs.core.LinkableVariable;

export interface StatefulRangeSliderProps extends React.HTMLProps<StatefulRangeSlider> {
	style?: React.CSSProperties;
	valueFormat?: (value: number)=>string;
}

export interface StatefulRangeSliderState {
	value: number;
}

export default class StatefulRangeSlider extends React.Component<StatefulRangeSliderProps, StatefulRangeSliderState>
{
	constructor(props: StatefulRangeSliderProps) {
		super(props);
	}

	state: StatefulRangeSliderState = { value: 0 };

	handleInputChange = (event: React.FormEvent): void => {
		this.setState({ value: Number((event.target as HTMLInputElement).value)});
	}

	render(): JSX.Element {
		var props = _.clone(this.props);
		delete props.children;
		let valueString = this.props.valueFormat ? this.props.valueFormat(this.state.value) : "";

		return (
			<span>
				<input {...props as any} onChange={this.handleInputChange} type="range" value={this.state.value !== undefined && this.state.value.toString()}/>
				{valueString}
			</span>
		);
	}
}
