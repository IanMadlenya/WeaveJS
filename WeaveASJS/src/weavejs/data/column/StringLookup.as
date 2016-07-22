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

package weavejs.data.column
{
	import weavejs.api.core.ILinkableObject;
	import weavejs.api.data.IAttributeColumn;
	import weavejs.api.data.IQualifiedKey;
	import weavejs.util.StandardLib;
	
	/**
	 * This provides a reverse lookup of String values in an IAttributeColumn.
	 * 
	 * @author adufilie
	 */
	public class StringLookup implements ILinkableObject
	{
		public function StringLookup(column:IAttributeColumn)
		{
			internalColumn = column;
			column.addImmediateCallback(this, handleInternalColumnChange);
			if (column is ILinkableObject)
				Weave.linkableChild(this, column as ILinkableObject)
		}
		
		private var internalColumn:IAttributeColumn;
		
		/**
		 * This function gets called when the referenced column changes.
		 */
		protected function handleInternalColumnChange():void
		{
			// invalidate lookup
			_stringToKeysMap = null;
			_stringToNumberMap = null;
			_uniqueStringValues.length = 0;
		}
		
		/**
		 * This object maps a String value from the internal column to an Array of keys that map to that value.
		 */
		private var _stringToKeysMap:Object = null;
		
		/**
		 * This object maps a String value from the internal column to the Number value corresponding to that String values in the internal column.
		 */
		private var _stringToNumberMap:Object = null;
		
		/**
		 * This keeps track of a list of unique string values contained in the internal column.
		 */
		private var _uniqueStringValues:Array = new Array();
		
		/**
		 * This is a list of the unique strings of the internal column.
		 */
		public function get uniqueStrings():Array
		{
			if (_stringToKeysMap == null)
				createLookupTable();
			return _uniqueStringValues;
		}

		/**
		 * This function will initialize the string lookup table and list of unique strings.
		 */
		private function createLookupTable():void
		{
			// reset
			_uniqueStringValues.length = 0;
			_stringToKeysMap = new Object();
			_stringToNumberMap = new Object();
			// loop through all the keys in the internal column
			var keys:Array = internalColumn ? internalColumn.keys : [];
			for (var i:int = 0; i < keys.length; i++)
			{
				var key:IQualifiedKey = keys[i];
				var stringValue:String = internalColumn.getValueFromKey(key, String) as String;
				if (stringValue == null)
					continue;
				// save the mapping from the String value to the key
				if (_stringToKeysMap[stringValue] is Array)
				{
					// string value was found previously
					(_stringToKeysMap[stringValue] as Array).push(key);
				}
				else
				{
					// found new string value
					_stringToKeysMap[stringValue] = [key];
					_uniqueStringValues.push(stringValue);
				}
				// save the mapping from the String value to the corresponding Number value
				var numberValue:Number = internalColumn.getValueFromKey(key, Number);
				if (_stringToNumberMap[stringValue] == undefined) // no number stored yet
				{
					_stringToNumberMap[stringValue] = numberValue;
				}
				else if (!isNaN(_stringToNumberMap[stringValue]) && _stringToNumberMap[stringValue] != numberValue)
				{
					_stringToNumberMap[stringValue] = NaN; // different numbers are mapped to the same String, so save NaN.
				}
			}
			// sort the unique values because we want them to be in a predictable order
			StandardLib.sortOn(_uniqueStringValues, [_stringToNumberMap, _uniqueStringValues]);
		}

		/**
		 * @param stringValue A string value existing in the internal column.
		 * @return An Array of keys that map to the given string value in the internal column.
		 */
		public function getKeysFromString(stringValue:String):Array
		{
			// validate lookup table if necessary
			if (_stringToKeysMap == null)
				createLookupTable();
			
			// get the list of internal keys from the given stringValue
			return (_stringToKeysMap[stringValue] as Array) || (_stringToKeysMap[stringValue] = []);
		}
		
		/**
		 * @param stringValue A string value existing in the internal column.
		 * @return The Number value associated with the String value from the internal column.
		 */
		public function getNumberFromString(stringValue:String):Number
		{
			if (_stringToNumberMap == null)
				createLookupTable();
			return _stringToNumberMap[stringValue];
		}
	}
}
