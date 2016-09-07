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
namespace weavejs.api.ui
{
	/**
	 * An Object with a description.
	 */
	@Weave.classInfo({id: "weavejs.api.ui.IObjectWithDescription"})
	export class IObjectWithDescription
	{
		/**
		 * Gets a human-readable description for this object.
		 * @return The human-readable description.
		 */
		getDescription:()=>string;
	}
}
