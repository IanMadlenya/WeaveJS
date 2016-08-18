namespace weavejs.admin
{
	import HBox = weavejs.ui.flexbox.HBox;
	import VBox = weavejs.ui.flexbox.VBox;
	import Button = weavejs.ui.Button;
	import PopupWindow = weavejs.dialog.PopupWindow;
	import SmartComponent = weavejs.ui.SmartComponent;
	import List = weavejs.ui.List;
	import ListOption = weavejs.ui.ListOption;
	import ui = weavejs.ui;
	import ConfigurationStorageEditor = weavejs.admin.ConfigurationStorageEditor;
	import LogComponent = weavejs.ui.LogComponent;

	import ConnectionInfo = weavejs.net.beans.ConnectionInfo;
	import DatabaseConfigInfo = weavejs.net.beans.DatabaseConfigInfo;
	import WeaveDataSource = weavejs.data.source.WeaveDataSource;
	import WeaveAdminService = weavejs.net.WeaveAdminService;
	import ConfirmationDialog = weavejs.dialog.ConfirmationDialog;

	export interface IConnectionManagerProps {
		service: WeaveAdminService;
	}

	export interface IConnectionManagerState {
		user?: string;
		errors?: string[];
		messages?: string[];
		connections?: string[];
		dbConfigInfo?: DatabaseConfigInfo;
		selected?: string;
	}

	export class ConnectionManager extends SmartComponent<IConnectionManagerProps, IConnectionManagerState>
	{
		private login: ServiceLogin;
		constructor(props:IConnectionManagerProps)
		{
			super(props);
			this.state = {
				errors: [],
				messages: [],
				connections: [],
				dbConfigInfo: null,
				selected: null
			};
			this.login = new ServiceLogin(this, this.props.service);
		}

		private element: Element;

		componentDidMount()
		{
			this.element = ReactDOM.findDOMNode(this);
			this.updateConnectionsAndUser();
			this.props.service.getAuthenticatedUser().then(user=>this.setState({ user }),error=>this.setState({user: null}));
		}

		handleError=(error:any): void => {
			if ((error.message as string).startsWith(WeaveAdminService.WEAVE_AUTHENTICATION_EXCEPTION) ||
				(error.message as string).startsWith("RemoteException: Incorrect username or password."))
			{
				if (this.login) this.login.open(this.updateConnectionsAndUser);
			}
			else
			{
				this.setState({ errors: this.state.errors.concat([error.toString()]) });
			}
		}

		handleMessage=(message:any): void => {
			this.setState({ messages: this.state.messages.concat([message.toString()]) });
		}

		updateConnectionsAndUser=()=>{
			this.props.service.getConnectionNames().then(
				(connections) => this.setState({ connections }),
				this.handleError
			);

			this.props.service.getDatabaseConfigInfo().then(
				(dbConfigInfo) => this.setState({ dbConfigInfo }),
				this.handleError
			);

			this.props.service.getAuthenticatedUser().then(
				(user) => this.setState({ user })
			);
		}

		private connectionToOption = (connection: string): ListOption => {
			let isConfigConnection: boolean = this.state.dbConfigInfo && this.state.dbConfigInfo.connection == connection;
			let style: React.CSSProperties = {
				fontWeight: isConfigConnection ? "bold" : "normal"
			};

			let title = isConfigConnection ?
				Weave.lang("Connection {0} is the current configuration storage location.", connection) :
				Weave.lang("Connection {0}", connection);

			return {
				value: connection,
				label: <span title={title} style={style}>{connection}</span>
			};
		}

		createNewConnection=()=>
		{
			this.setState({ selected: null });
		}

		openConfigurationStorageEditor = PopupWindow.generateOpener(() => ({
			context: this,
			title: Weave.lang("Configuration Storage"),
			content: <ConfigurationStorageEditor service={this.props.service}/>,
			modal: true,
			resizable: true,
			width: 600,
			height: 600,
			footerContent: <div/>,
		}));

		private handleSuccessfulSave=(connectionName:string, password:string)=>
		{
			this.props.service.getAuthenticatedUser().then(
				(user: string) => {
					this.setState({ user });
					/* If we aren't logged in after a successful connection save, it means we have just made our first connection. Automatically login in. */
					if (!user) {
						return this.props.service.authenticate(connectionName, password).then(
							() => {
								this.setState({ selected: connectionName });
								/* If we logged in successfully with the new connection, and no database config exists, immediately open configuration storage manager. */
								this.props.service.checkDatabaseConfigExists().then(
									exists=>{
										if (!exists)
										{
										}
									}
								)
							},
							() => this.handleError(Weave.lang("Failed to log in with new connection. Check your server configuration."))
						);
					}
					else
					{
						this.setState({ selected: connectionName });
					}
				}
			).then(() => this.updateConnectionsAndUser());
		}

		removeSelectedConnection = () => {
			var confirmationMessage = Weave.lang("Are you sure you want to delete the connection '{0}'?", this.state.selected);
			ConfirmationDialog.open(this, confirmationMessage, this.removeSelectedConnection);
		}

		removeConnection=(connection:string)=>
		{
			this.props.service.removeConnectionInfo(connection).then(
				this.updateConnectionsAndUser, this.handleError
			);
		}

		render():JSX.Element
		{
			let options = this.state.connections.map(this.connectionToOption);
			return <VBox className="weave-padded-vbox" style={ { flex: 1, overflow: 'auto' } }>
				<HBox className="weave-padded-hbox" style={ { flex: 1 } }>
					<VBox className="weave-padded-vbox" style={ {flex: 0.33 } }>
						<div>{this.state.user ? Weave.lang("Signed in as '{0}'.", this.state.user) : Weave.lang("Not signed in.") }</div>
						<VBox className="weave-padded-vbox" style={ { flex: 1, padding: 0 } }>
							<span style={{ fontWeight: "bold" }}>{Weave.lang("Connections:")}</span>
							<VBox style={{ flex: 1, padding: 0}} className="weave-container">
								<List selectedValues={[this.state.selected]} options={options} 
								onChange={(selectedValues: any[]) => this.setState({ selected: selectedValues[0] }) }/>
							</VBox>
						</VBox>
						<HBox>
							<Button title={Weave.lang("Create new connection")} style={{flex:"1", borderTopRightRadius:0, borderBottomRightRadius:0}}
								onClick={this.createNewConnection}>
								<i className="fa fa-plus fa-fw"/>
							</Button>
							<Button disabled={!this.state.selected} title={Weave.lang("Remove selected connection")} style={{ flex: "1", borderRadius: 0}}
								onClick={this.removeSelectedConnection}>
								<i className="fa fa-minus fa-fw"/>
							</Button>
							<Button title={Weave.lang("Refresh connection names.")} style={{ flex: "1", borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
								onClick={this.updateConnectionsAndUser}>
								<i className="fa fa-refresh fa-fw"/>
							</Button>
						</HBox>
						<Button style={{marginTop: 8}} title={Weave.lang("Manage configuration storage...")} onClick={this.openConfigurationStorageEditor}>
							{Weave.lang("Manage configuration storage...")}
						</Button>
					</VBox>
					<ConnectionEditor handleSuccessfulSave={this.handleSuccessfulSave} service={this.props.service} connectionName={this.state.selected} handleError={this.handleError} handleMessage={this.handleMessage}/>
				</HBox>
				<LogComponent uiClass="positive" header={Weave.lang("Operation Completed") } messages={this.state.messages} clearFunc={() => { this.setState({ messages: [] }) } }/>
				<LogComponent header={Weave.lang("Server error") } messages={this.state.errors} clearFunc={() => { this.setState({ errors: [] }) } }/>
			</VBox>
		}
	}
}
