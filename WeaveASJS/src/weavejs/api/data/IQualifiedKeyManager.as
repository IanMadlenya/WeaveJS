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

package weavejs.api.data
{
	import weavejs.api.core.ILinkableObject;

	/**
	 * This class manages a global list of IQualifiedKey objects.
	 * 
	 * The getQKey() function must be used to get IQualifiedKey objects.  Each IQualifiedKey returned by
	 * getQKey() with the same parameters will be the same object, so IQualifiedKeys can be compared
	 * with the == operator or used as keys in a Dictionary.
	 * 
	 * @author adufilie
	 */
	public interface IQualifiedKeyManager
	{
		/**
		 * Get the IQualifiedKey object for a given key type and key.
		 *
		 * @return The IQualifiedKey object for this type and key.
		 */
		function getQKey(keyType:String, localName:String):IQualifiedKey;
		
		/**
		 * Get a list of IQualifiedKey objects, all with the same key type.
		 * 
		 * @param keyType The key type/namespace.
		 * @param keyStrings An Array of localNames.
		 * @return An array of IQualifiedKeys.
		 */
		function getQKeys(keyType:String, keyStrings:Array/*/<string>/*/):Array/*/<IQualifiedKey>/*/;

		/**
		 * This will replace untyped Objects in an Array with their IQualifiedKey counterparts.
		 * Each object in the Array should have two properties: <code>keyType</code> and <code>localName</code>
		 * @param objects An Array to modify.
		 * @return The same Array that was passed in, modified.
		 */
		function convertToQKeys(objects:Array/*/<{keyType:string, localName:string}>/*/):Array/*/<IQualifiedKey>/*/;
		
		/**
		 * Get a list of all previoused key types.
		 *
		 * @return An array of IQualifiedKeys.
		 */
		function getAllKeyTypes():Array/*/<string>/*/;

		/**
		 * Get a list of all referenced IQualifiedKeys for a given key type
		 * @param keyType The key type.
		 * @return An array of IQualifiedKeys
		 */
		function getAllQKeys(keyType:String):Array/*/<IQualifiedKey>/*/;
		
		/**
		 * Get a QualifiedKey from its string representation.
		 * @param qkeyString A string formatted like the output of IQualifiedKey.toString().
		 * @return The QualifiedKey corresponding to the string representation.
		 */
		function stringToQKey(qkeyString:String):IQualifiedKey;
		
		/**
		 * Get a QualifiedKey from its numeric representation.
		 * @param qkeyNumber A Number.
		 * @return The QualifiedKey corresponding to the numeric representation.
		 */
		function numberToQKey(qkeyNumber:Number):IQualifiedKey;
	}
}
