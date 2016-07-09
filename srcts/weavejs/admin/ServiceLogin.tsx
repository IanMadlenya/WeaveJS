import * as React from "react";
import PopupWindow from "../../dialog/PopupWindow";
import Login from "./Login";

import WeaveAdminService = weavejs.net.WeaveAdminService;

export default class ServiceLogin
{
	service: WeaveAdminService;
	context: React.ReactInstance;
	login:Login;
	onSuccess: (username: string) => void;
	onCancel: () => void;

	constructor(context: React.ReactInstance, service: WeaveAdminService)
	{
		this.context = context;
		this.service = service;
	}

	open=(onSuccess?: (username: string) => void, onCancel?: () => void)=>
	{
		this.onSuccess = onSuccess;
		this.onCancel = onCancel;
		return this.show();
	}
	
	private show = PopupWindow.generateOpener(() => ({
		context: this.context,
		title: Weave.lang("Weave Server Sign-In"),
		content: (
			<Login
				ref={(c:Login) => this.login = c}
				onLogin={ (fields: { username: string, password: string }) => this.handleLogin(fields, this.onSuccess) }
			/>
		),
		footerContent: <div/>,
		resizable: false,
		draggable: false,
		modal: true,
		suspendEnter: true,
		width: 400
	}));

	handleLogin = (fields: { username: string, password: string }, onSuccess: (username: string) => void): void => {
		this.service.authenticate(fields.username, fields.password).then(
			() => {
				PopupWindow.close(this.login);
				if (onSuccess)
					onSuccess(fields.username);
			},
			(error: any) => {
				this.login.invalid();
			}
		);
	};

	/* Only open if needed */
	conditionalOpen(onSuccess?: (username:string)=>void, onCancel?:()=>void)
	{
		this.service.getAuthenticatedUser().then(
			(username: string) => {
				if (username)
				{
					onSuccess && onSuccess(username);
				}
				else
				{
					this.open(onSuccess, onCancel);
				}
			}
		);
	}
}

