	import * as React from "react";
	import {HBox, VBox} from "../ui/flexbox/FlexBox";
	import Checkbox from "../ui/Checkbox";
	import ComboBox from "../ui/ComboBox";
	import {LinkedInput} from "./ConnectionEditor";
	import Button from "../ui/Button";
	import PopupWindow from "../dialog/PopupWindow";
	import SmartComponent from "../ui/SmartComponent";
	import HelpIcon from "../ui/HelpIcon";
	import LogComponent from "../ui/LogComponent";

	import ConnectionInfo = weavejs.net.beans.ConnectionInfo;
	import DatabaseConfigInfo = weavejs.net.beans.DatabaseConfigInfo;
	import WeaveDataSource = weavejs.data.source.WeaveDataSource;
	import WeaveAdminService = weavejs.net.WeaveAdminService;
	import WeavePromise = weavejs.util.WeavePromise;
	import StandardLib = weavejs.util.StandardLib;

	export interface IConfigurationStorageEditorProps
	{
		service: WeaveAdminService;
	}

	export interface IConfigurationStorageEditorState
	{
		/* The world as it is */
		connectionNames?: string[];
		currentConnectionName?: string;

		/* The world as it shall be */
		connectionName?: string;
		connectionPassword?: string;
		schemaName?: string;
		showAdvancedOptions?: boolean;
		metadataIdFields?: string;
		errors?: string[];
		messages?: string[];
	}

	export default class ConfigurationStorageEditor extends SmartComponent<IConfigurationStorageEditorProps, IConfigurationStorageEditorState>
	{
		constructor(props:IConfigurationStorageEditorProps)
		{
			super(props);

			this.state = {errors: [], messages: []};
		}

		updateCurrentConnection()
		{
			this.props.service.getConnectionNames().then(
				(connectionNames) => { 
					this.setState({ connectionNames });
				},
				this.handleError
			);

			this.props.service.getDatabaseConfigInfo().then(
				(info) => {
					this.setState({
						currentConnectionName: info.connection,
						connectionName: info.connection,
						schemaName: info.schema,
						metadataIdFields: weavejs.WeaveAPI.CSVParser.createCSVRow(info.idFields || [])
					});
				},
				this.handleError
			);
		}

		componentDidUpdate()
		{
			console.log(this.state);
		}

		componentDidMount() {
			this.updateCurrentConnection();
		}

		handleError=(error:any)=>
		{
			this.setState({ errors: this.state.errors.concat([error.toString()]) });
		}

		handleMessage =(message: string)=>
		{
			this.setState({ messages: this.state.messages.concat([message.toString()]) });
		}

		save=(): void=>
		{
			let idFields: string[] = weavejs.WeaveAPI.CSVParser.parseCSVRow(this.state.metadataIdFields);
			this.props.service.setDatabaseConfigInfo(this.state.connectionName, this.state.connectionPassword, this.state.schemaName, idFields).then(
				this.handleMessage,
				this.handleError
			);
		}
		render():JSX.Element
		{
			let metadataIdRowStyle = this.state.showAdvancedOptions ? {} : { display: "none" };

			return (
				<VBox className="weave-ToolEditor" style={{ flex: 1, justifyContent: "space-between" }}>
					<VBox style={{ flex: 1, overflow: "auto" }}>
						<p>{Weave.lang("Configuration info for Weave must be stored in an SQL database.")}</p>
						<p>{this.state.currentConnectionName ? Weave.lang('You are currently using the "{0}" connection to store configuration data.', this.state.currentConnectionName) : ""}</p>
						<p>{this.state.currentConnectionName ? Weave.lang("You may switch to a different location, but the existing configuration data will not be copied over.") : "" }</p>
						<div className="ui left aligned grid">
							<div className="two column row" style={{paddingBottom: 0}}>
								<div className="four wide right aligned column">
									<div className="ui basic segment">
										{Weave.lang("Connection to use")}
									</div>
								</div>
								<div className="twelve wide column">
									<ComboBox style={{flex:1}} value={this.state.connectionName} options={this.state.connectionNames || []}
										onChange={(value: string) => {this.setState({connectionName: value})}}/>
								</div>
							</div>
							<div className="two column row" style={{ paddingBottom: 0 }}>
								<div className="four wide right aligned column">
									<div className="ui basic segment">
										{Weave.lang("Password")}
									</div>
								</div>
								<div className="twelve wide column">
									<LinkedInput field="connectionPassword" type="password" outerComponent={this}/>
								</div>
							</div>
							<div className="two column row" style={{ paddingBottom: 0 }}>
								<div className="four wide right aligned column">
									<div className="ui basic segment">
										{Weave.lang("Database schema") }
									</div>
								</div>
								<div className="twelve wide column">
									<LinkedInput field="schemaName" type="text" outerComponent={this}/>
								</div>
							</div>
							<div className="one column row">
								<div className="sixteen wide right aligned column">
									<Checkbox label={Weave.lang("Show advanced options")}
										value={this.state.showAdvancedOptions}
										onChange={(value:boolean)=>this.setState({showAdvancedOptions: value})}/>
								</div>
							</div>
							<div className="two column row" style={metadataIdRowStyle}>
								<div className="four wide right aligned column">
									<div className="ui basic segment">
										{Weave.lang("Metadata ID field(s)")}
										<HelpIcon>
											{Weave.lang("Use this only if you want to use your own custom properties to uniquely identify data columns.")}
										</HelpIcon>
									</div>
								</div>
								<div className="twelve wide column">
									<LinkedInput field="metadataIdFields" type="text" outerComponent={this}/>
								</div>
							</div>
							<div className="one column row">
								<div className="sixteen wide column">
									<div className="ui basic segment">
										{Weave.lang("The following tables will be created in the schema specified above:")}
										{Weave.lang("	weave_hiearchy, weave_meta_private, weave_meta_public")}
										{Weave.lang("If they already exist, no changes will be made.")}
									</div>
								</div>
							</div>
							<div className="one column row">
								<LogComponent style={{width: "100%"}} header={Weave.lang("Server error") } messages={this.state.errors} clearFunc={() => { this.setState({ errors: [] }) } }/>
								<LogComponent style={{width: "100%"}} uiClass="positive" header={Weave.lang("Completed") } messages={this.state.messages} clearFunc={() => { this.setState({ messages: [] }) } }/>
							</div>
						</div>
					</VBox>
					<HBox style={{ justifyContent: "flex-end" }}>
						<Button colorClass="primary" onClick={this.save}>{Weave.lang("Store Weave configuration at this location") }</Button>
						<Button colorClass="secondary"  style={{marginLeft: 8}} onClick={() => PopupWindow.close(this) }>{Weave.lang("Cancel") }</Button>
					</HBox>
				</VBox>
			);
		}
	}