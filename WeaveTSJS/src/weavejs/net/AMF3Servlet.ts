/* ***** BEGIN LICENSE BLOCK *****
 *
 * This file is part of Weave.
 *
 * The Initial Developer of Weave is the Institute for Visualization
 * and Perception Research at the University of Massachusetts Lowell.
 * Portions created by the Initial Developer are Copyright (C) 2008-2015
 * the Initial Developer. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * ***** END LICENSE BLOCK ***** */

namespace weavejs.net
{
	import WeavePromise = weavejs.util.WeavePromise;
	import Servlet = weavejs.net.Servlet;

	@Weave.classInfo({id: "weavejs.net.AMF3Servlet"})
	export class AMF3Servlet extends Servlet
	{
		/**
		 * @param servletURL The URL of the servlet (everything before the question mark in a URL request).
		 * @param invokeImmediately Set this to false if you don't want the ProxyAsyncTokens created by invokeAsyncMethod() to be invoked automatically.
		 */
		constructor(servletURL:string, invokeImmediately:boolean = true)
		{
			// params get sent as an AMF3-serialized object
			super(servletURL, "method", Protocol.JSONRPC_2_0_AMF);
			this._invokeLater = !invokeImmediately;
		}
		
		/**
		 * If <code>invokeImmediately</code> was set to false in the constructor, this will invoke a deferred request.
		 */
		public invokeDeferred(promise:WeavePromise<any>):void
		{
			this.invokeNow(promise);
		}
	}
}
