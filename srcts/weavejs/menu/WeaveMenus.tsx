import * as React from "react";
import * as _ from "lodash";
import {MenuBarItemProps} from "../ui/menu/MenuBar";
import SystemMenu from "./SystemMenu";
import FileMenu from "./FileMenu";
import ChartsMenu from "./ChartsMenu";
import ControllersMenu from "./ControllersMenu";
import DataMenu from "./DataMenu";
import ServiceLogin from "../ui/admin/ServiceLogin";

export type CreateObjectFunction = (type:new(..._:any[])=>any)=>void;

export default class WeaveMenus
{
	context:React.ReactInstance;
	weave:Weave;
	createObject:CreateObjectFunction;
	onFileLoaded:()=>void;
	openDataManager:()=>void;
	enableDataManagerItem:()=>boolean;
	showFileMenu:boolean = false;

	login:ServiceLogin;
	
	systemMenu:SystemMenu;
	fileMenu:FileMenu;
	chartsMenu:ChartsMenu;
	dataMenu:DataMenu;
	controllersMenu:ControllersMenu;
	
	constructor(context:React.ReactInstance, weave:Weave, createObject:CreateObjectFunction, onFileLoaded:()=>void, openDataManager:()=>void, enableDataManagerItem:()=>boolean)
	{
		this.context = context;
		this.weave = weave;
		this.createObject = createObject;
		this.onFileLoaded = onFileLoaded;
		this.openDataManager = openDataManager;
		this.enableDataManagerItem = enableDataManagerItem;
		
		/* Forces the initialization of the service. */
		/* Hopefully the init flag gets set before our first 'get menu'. */
		weavejs.net.Admin.service.getAuthenticatedUser().then(_.noop, _.noop);
		this.login = new ServiceLogin(context, weavejs.net.Admin.service);
		
		this.fileMenu = new FileMenu(this);
		this.systemMenu = new SystemMenu(this);
		this.chartsMenu = new ChartsMenu(this);
		this.dataMenu = new DataMenu(this);
		this.controllersMenu = new ControllersMenu(this);
	}

	getMenuList():MenuBarItemProps[]
	{
		if (this.showFileMenu)
			return [
				this.systemMenu,
				this.fileMenu,
				this.chartsMenu,
				this.controllersMenu
			];
		
		return [
			this.systemMenu,
			this.dataMenu,
			this.chartsMenu,
			this.controllersMenu
		];
	}
}
