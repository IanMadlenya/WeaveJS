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
	import Point = weavejs.geom.Point;

	/**
	 * An interface for an object that reprojects points from one specific coordinate system to another.
	 * 
	 * @author adufilie
	 */
	@Weave.classInfo({id: "weavejs.api.data.IProjector"})
	export class IProjector
	{
		/**
		 * This function will reproject a point using the transformation method associated with this object.
		 * @param inputAndOutput The point to reproject, which will be modified in place.
		 * @return The transformed point, inputAndOutput, or null if the reprojection failed.
		 */
		reproject:(inputAndOutput:Point)=>Point;
	}
}
