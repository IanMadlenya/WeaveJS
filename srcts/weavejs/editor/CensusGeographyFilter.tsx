import * as React from "react";
import * as _ from "lodash";
import {HBox, VBox} from "../ui/flexbox/FlexBox";

import CensusApi = weavejs.data.source.CensusApi;
import LinkableVariable = weavejs.core.LinkableVariable;

export interface CensusGeographyFilterProps {
	filterLinkableVariable: LinkableVariable;
	requires: string[];
	optional: string;
}

export interface CensusGeographyFilterState {
}

export default class CensusGeographyFilter extends React.Component<CensusGeographyFilterProps, CensusGeographyFilterState>
{
	constructor(props:CensusGeographyFilterProps)
	{
		super(props);

		this.state_fips = (CensusApi as any).state_fips; // Hack until this is changed in the core.
		this.county_fips = (CensusApi as any).county_fips;

		this.props.filterLinkableVariable.addGroupedCallback(this, this.forceUpdate, true);
	}

	private state_fips: { [fips: string]: string };
	private county_fips: { [fips: string]: { [fips: string]: string } };

	onFilterChange=(geoLevel: string, value:string) =>
	{
		let oldFilters: { [geoLevel: string]: string } = this.props.filterLinkableVariable.state as { [geoLevel: string]: string };
		let newFilters: { [geoLevel: string]: string } = {};
		if (oldFilters) for (let level of this.props.requires)
		{
			newFilters[level] = oldFilters[level];
			if (!newFilters[level])
				delete newFilters[level];
		}
		newFilters[geoLevel] = value;
		if (!value) delete newFilters[geoLevel];
		this.props.filterLinkableVariable.state = newFilters;
	}

	renderFilter=(scope:string):JSX.Element=>
	{
		let filters: { [geoLevel: string]: string } = this.props.filterLinkableVariable.state as { [geoLevel: string]: string } || {};
		let parentGeoKey: string;
		if (scope == "county")
			parentGeoKey = "state";

		let options: { fips: string, name: string }[] = [];

		if (scope == "state")
		{
			options = _.sortBy(Object.keys(this.state_fips), (key) => this.state_fips[key]).map((key) => { return { fips: key, name: this.state_fips[key] }; });
		}
		else if (scope = "county")
		{
			let county_fips = this.county_fips[filters[parentGeoKey]] || {};
			options = _.sortBy(Object.keys(county_fips), (key) => county_fips[key]).map((key) => { return { fips: key, name: county_fips[key] }; });
		}
		return <CensusGeographyFilterColumn key={scope}
				geoLevel={scope}
				options={options}
				required={this.props.optional !== undefined ? scope != this.props.optional : true}
				parentGeo={parentGeoKey && filters[parentGeoKey]}
				selection={typeof filters == typeof {} ? filters[scope] : null}
				onChange={this.onFilterChange}
		/>;
	}

	render(): JSX.Element
	{
		this.props.filterLinkableVariable.addGroupedCallback(this, this.forceUpdate);

		return <HBox>
			{this.props.requires ? this.props.requires.map(this.renderFilter) : ""}
		</HBox>
	}
}

export interface CensusGeographyFilterColumnProps {
	geoLevel: string;
	parentGeo?: string;
	required: boolean;
	options: { fips: string, name: string }[];
	selection?: string;
	onChange?: (geoLevel: string, value: string) => void;
}

export interface CensusGeographyFilterColumnState {
	selection?: string;
	enabled?: boolean;
}

export class CensusGeographyFilterColumn extends React.Component<CensusGeographyFilterColumnProps, CensusGeographyFilterColumnState>
{
	constructor(props:CensusGeographyFilterColumnProps)
	{
		super(props);
		this.state = {
			enabled: props.required || !!props.selection,
			selection: props.selection
		};
	}

	state: CensusGeographyFilterColumnState = { selection: null };

	componentWillReceiveProps(nextProps:CensusGeographyFilterColumnProps)
	{
		if (!nextProps) return;
		if (nextProps.required)
		{
			this.setState({ enabled: true });
		}
		if (nextProps.selection)
		{
			this.setState({ selection: nextProps.selection, enabled: true });
		}

	}

	componentDidUpdate(prevProps: CensusGeographyFilterColumnProps, prevState: CensusGeographyFilterColumnState):void
	{
		this.props.onChange(this.props.geoLevel, this.state.enabled ? this.state.selection : null)
	}

	updateEnabled=(event:React.FormEvent)=>
	{
		let element = event.target as HTMLInputElement;
		this.setState({ enabled: element.checked });
	}

	updateSelection=(event:React.FormEvent)=>
	{
		let element = event.target as HTMLInputElement;
		this.setState({ selection: element.value });
	}

	render(): JSX.Element {
		let check = <label><input type="checkbox" onChange={this.updateEnabled} onInput={this.updateEnabled} disabled={this.props.required} checked={this.props.required || this.state.enabled}/>{this.props.geoLevel}</label>;
		let inputDisabled = !this.state.enabled && !this.props.required;
		let selection = this.props.selection || (this.state.enabled && this.state.selection) || null;
		if (this.props.geoLevel == "state" || this.props.geoLevel == "county")
		{
			return <VBox style={{flex: 1}}>
				{check}
				<select size={5} disabled={inputDisabled} onClick={this.updateSelection} onChange={this.updateSelection} onInput={this.updateSelection} value={selection}>
					{this.props.options.map((option) => <option disabled={inputDisabled} key={option.fips} value={option.fips}>{option.name}</option>)}
				</select>
			</VBox>
		}
		else
		{
			return <VBox style={{ flex: 1 }}>
				{check}
				<input onChange={this.updateSelection} onInput={this.updateSelection} disabled={inputDisabled} type="text" value={selection}/>
			</VBox>
		}
	}
}
