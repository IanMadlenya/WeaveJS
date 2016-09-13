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

namespace weavejs.api.net
{
	import ILinkableHashMap = weavejs.api.core.ILinkableHashMap;
	import WeavePromise = weavejs.util.WeavePromise;
	import URLRequest = weavejs.net.URLRequest;

	export class IURLRequestUtils
	{
		/**
		 * Makes a URL request.
		 * @param urlRequest A URLRequest object.
		 * @return A WeavePromise
		 */
		request:(relevantContext:any, urlRequest:URLRequest)=>WeavePromise<any>;
		
		/**
		 * This will save a file in memory so that it can be accessed later via getURL().
		 * @param name The file name.
		 * @param byteArray The file content in a Uint8Array.
		 * @return The URL at which the file can be accessed later via getURL(). This will be the string "local://" followed by the filename.
		 */
		saveLocalFile:(weaveRoot:ILinkableHashMap, name:string, byteArray:Uint8Array)=>string;
		
		/**
		 * Retrieves file content previously saved via saveLocalFile().
		 * @param The file name that was passed to saveLocalFile().
		 * @return The file content in a Uint8Array.
		 */
		getLocalFile:(weaveRoot:ILinkableHashMap, name:string)=>Uint8Array;
		
		/**
		 * Removes a local file that was previously added via saveLocalFile().
		 * @param name The file name which was passed to saveLocalFile().
		 */
		removeLocalFile:(weaveRoot:ILinkableHashMap, name:string)=>void;
		
		/**
		 * Gets a list of names of files saved via saveLocalFile().
		 * @return An Array of file names.
		 */
		getLocalFileNames:(weaveRoot:ILinkableHashMap)=>string[];
	}
}
