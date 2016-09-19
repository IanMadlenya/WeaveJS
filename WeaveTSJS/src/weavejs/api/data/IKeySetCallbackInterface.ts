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

namespace weavejs.api.data
{
	import ICallbackCollection = weavejs.api.core.ICallbackCollection;

	/**
	 * Provides an interface for getting KeySet event-related information.
	 */
	@Weave.classInfo({id: "weavejs.api.data.IKeySetCallbackInterface"})
	export class IKeySetCallbackInterface extends ICallbackCollection
	{
		/**
		 * This function should be called when keysAdded and keysRemoved are ready to be shared with the callbacks.
		 * The keysAdded and keysRemoved Arrays will be reset to empty Arrays after the callbacks finish running.
		 */	
		flushKeys:()=>void
		
		/**
		 * The keys that were most recently added, causing callbacks to trigger.
		 * This can be used as a buffer prior to calling flushKeys().
		 * @see #flushKeys()
		 */
		keysAdded:IQualifiedKey[];

		/**
		 * The keys that were most recently removed, causing callbacks to trigger.
		 * This can be used as a buffer prior to calling flushKeys().
		 * @see #flushKeys()
		 */
		keysRemoved:IQualifiedKey[];
	}
}
