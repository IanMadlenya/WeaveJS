import * as React from "react";
import * as _ from "lodash";
import StatefulTextField from "../ui/StatefulTextField";
import ComboBox from "../ui/ComboBox";
import {linkReactStateRef} from "../util/WeaveReactUtils";
import {HBox, VBox} from "../ui/flexbox/FlexBox";
import CensusGeographyFilter from "./CensusGeographyFilter";
import DataSourceEditor, {IDataSourceEditorProps, IDataSourceEditorState} from "./DataSourceEditor";
import KeyTypeInput from "../ui/KeyTypeInput";
import HelpIcon from "../ui/HelpIcon";

import EntityNode = weavejs.data.hierarchy.EntityNode;
import EntityType = weavejs.api.data.EntityType;
import IWeaveTreeNode = weavejs.api.data.IWeaveTreeNode;
import URLRequestUtils = weavejs.api.data.IWeaveTreeNode;
import ColumnUtils = weavejs.data.ColumnUtils;
import IQualifiedKey = weavejs.api.data.IQualifiedKey;
import ColumnTreeNode = weavejs.data.hierarchy.ColumnTreeNode;
import StandardLib = weavejs.util.StandardLib;

import CensusDataSource = weavejs.data.source.CensusDataSource;
import CensusApi = weavejs.data.source.CensusApi;

export interface CensusRawDataset {
	c_dataset: string[];
	c_vintage: number;
	identifier: string;
	title: string;
	c_isAvailable: boolean;
};

interface CensusRawGeography {
	name: string,
	requires: string[],
	optional: string
};

export interface ICensusDataSourceEditorState extends IDataSourceEditorState
{
	dataFamily?: string;
	dataVintage?: string;
	geographies?: {value: string, label: string }[];
	datasets?: CensusRawDataset[];

	optional?: string; /* Optional geography filter name */
	requires?: string[]; /* Required geography filter names */
}

export default class CensusDataSourceEditor extends DataSourceEditor
{
	constructor(props:IDataSourceEditorProps)
	{
		super(props);
		let ds = (this.props.dataSource as CensusDataSource);
		this.api = ds.getAPI();
		this.api.getDatasets().then(
			(result: { dataset: CensusRawDataset[] }) => { this.state = { datasets: result.dataset } as any; }
		);
		ds.dataSet.addGroupedCallback(this, this.getGeographies, true);
		ds.geographicScope.addGroupedCallback(this, this.updateRequiresAndOptional, true);
	}

	updateRequiresAndOptional=()=>
	{
		let ds = (this.props.dataSource as CensusDataSource);
		this.api.getGeographies(ds.dataSet.value).then(
			(geographies:({[id:string]: CensusRawGeography}))=>
			{
				let geography = geographies[ds.geographicScope.value];
				if (geography) 
				{
					this.setState({ optional: geography.optional, requires: geography.requires } as any);
				}
			}
		)
	}

	static isUsableFamily(family: string): boolean {
		return family && (family.indexOf("acs") == 0 || family.indexOf("sf") == 0);
	}

	static isInFamily(family: string, dataset: CensusRawDataset): boolean {
		return family && dataset && ((family == "All") || (dataset.c_dataset.indexOf(family) != -1));
	}

	static isOfVintage(vintage: string, dataset: CensusRawDataset): boolean {
		return vintage && dataset && ((vintage == "All") || (dataset.c_vintage !== undefined && dataset.c_vintage.toString() == vintage));
	}

	private api: CensusApi;
	state: ICensusDataSourceEditorState = {};

	private getDataFamilies():string[]
	{
		let raw_datasets = this.state.datasets;
		if (!raw_datasets) return ["All"];

		let families_set = new Set<string>(_.flatten(_.map(raw_datasets, (d) => d.c_dataset)).filter(CensusDataSourceEditor.isUsableFamily));
		let families_list = _.sortBy(Array.from(families_set));
		families_list.unshift("All");
		return families_list;
	}

	private getDataVintages(family:string):string[]
	{
		let raw_datasets = this.state.datasets;
		if (!raw_datasets || !family) return ["All"];

		let datasetsInFamily = raw_datasets.filter(CensusDataSourceEditor.isInFamily.bind(null, family));
		let vintages_set = new Set<string>(datasetsInFamily.map((d) => d.c_vintage !== undefined && d.c_vintage.toString()));
		let vintages_list = _.sortBy(Array.from(vintages_set));

		vintages_list.unshift("All");

		return vintages_list;
	}

	private getDatasets(family:string, vintage:string)
	{
		let raw_datasets = this.state.datasets;
		let ds = this.props.dataSource as CensusDataSource;
		if (!raw_datasets || !family || !vintage) return [{ value: ds.dataSet.value, label: ds.dataSet.value}];

		let filterFunc = (dataset: CensusRawDataset) => CensusDataSourceEditor.isInFamily(family, dataset) && CensusDataSourceEditor.isOfVintage(vintage, dataset);
		let makeEntry = (dataset: CensusRawDataset) => { return { value: dataset.identifier, label: dataset.title }; };

		return _.sortBy(raw_datasets.filter(filterFunc).map(makeEntry), "label");
	}
	private getDataset(datasetName:string)
	{
		let raw_datasets = this.state.datasets;
		if (!raw_datasets) return null;
		return raw_datasets.filter((dataset) => dataset.identifier === datasetName);
	}

	private getGeographies(dataSet: string)
	{
		let ds = (this.props.dataSource as CensusDataSource);
		this.api.getGeographies(ds.dataSet.value).then(
			(geographies: { [id: string]: { name: string } }) => {
				let tempGeographies = new Array<{ value: string, label: string }>();
				for (let id in geographies) {
					tempGeographies.push({ value: id, label: geographies[id].name });
				}

				tempGeographies = _.sortBy(tempGeographies, "value");
				if (!_.isEqual(this.state.geographies, tempGeographies))
					this.setState({ geographies: tempGeographies } as any);
			});
	}

	dataFamilyChanged=(selectedItem:any)=>
	{
		this.setState({ dataFamily: (selectedItem as string) } as any);
	}

	dataVintageChanged=(selectedItem:any)=>
	{
		this.setState({ dataVintage: (selectedItem as string)} as any);
	}

	get editorFields(): [React.ReactChild, React.ReactChild][] {
		let ds = (this.props.dataSource as CensusDataSource);
		this.api = ds.getAPI();
		let datasets = this.getDatasets("All", "All");
		let dataset = _.first(this.getDataset(ds.dataSet.value));
		let datasetLabel: string = dataset ? dataset.title : "";
		return [
			this.getLabelEditor(ds.label),
			[
				Weave.lang("API key"),
				<StatefulTextField style={{width: "100%"}}
								   ref={linkReactStateRef(this, { content: ds.apiKey }) }/>
			],
			[
				<HBox className="weave-padded-hbox" style={{alignItems: "center", justifyContent: "flex-end"}}>
					{Weave.lang("Key namespace")}
					<HelpIcon>{Weave.lang("Key namespaces are used to link tables using matching key columns.")}</HelpIcon>
				</HBox>,
				<KeyTypeInput style={{width: "100%"}}
							  keyTypeProperty={ds.keyType}/>
			],
			[
				Weave.lang("Dataset"),
				<ComboBox className="search" style={{width: "100%"}}
				          ref={linkReactStateRef(this, { value: ds.dataSet }) }
				          selectFirstOnInvalid
				          options={datasets || [{value: dataset, label: datasetLabel}]}/>
			],
			[
				Weave.lang("Geographic scope"),
				<ComboBox style={{width: "100%"}}
				          ref={linkReactStateRef(this, {value: ds.geographicScope })}
				          selectFirstOnInvalid
				          options={this.state.geographies || [{value: ds.geographicScope.value, label: ds.geographicScope.value}]}/>
			],
		];
	}

	renderFields(): JSX.Element {
		return (
			<VBox>
				{
					super.renderFields()
				}
				<CensusGeographyFilter filterLinkableVariable={(this.props.dataSource as CensusDataSource).geographicFilters}
									   optional={this.state.optional}
									   requires={this.state.requires || null}/>
			</VBox>
		)
	}
}
