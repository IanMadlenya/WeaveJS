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
	import weavejs.WeaveAPI;
	import weavejs.api.data.Aggregation;
	import weavejs.api.data.ColumnMetadata;
	import weavejs.api.data.DataType;
	import weavejs.api.data.IBaseColumn;
	import weavejs.api.data.IPrimitiveColumn;
	import weavejs.api.data.IQualifiedKey;
	import weavejs.util.AsyncSort;
	import weavejs.util.Dictionary2D;
	import weavejs.util.JS;
	import weavejs.util.StandardLib;
	
	/**
	 * @author adufilie
	 */
	public class StringColumn extends AbstractAttributeColumn implements IPrimitiveColumn, IBaseColumn
	{
		public function StringColumn(metadata:Object = null)
		{
			super(metadata);
			
			dataTask = new ColumnDataTask(this, filterStringValue, handleDataTaskComplete);
			dataCache = new Dictionary2D();
			Weave.getCallbacks(_asyncSort).addImmediateCallback(this, handleSortComplete);
		}
		
		override public function getMetadata(propertyName:String):String
		{
			var value:String = super.getMetadata(propertyName);
			if (!value && propertyName == ColumnMetadata.DATA_TYPE)
				return DataType.STRING;
			return value;
		}

		/**
		 * Sorted list of unique string values.
		 */
		private var _uniqueStrings:Array = [];
		
		/**
		 * String -> index in sorted _uniqueStrings
		 */
		private var _uniqueStringLookup:Object = new JS.Map();

		public function setRecords(keys:Array, stringData:Array):void
		{
			dataTask.begin(keys, stringData);
			_asyncSort.abort();
			
			_uniqueStrings.length = 0;
			_uniqueStringLookup.clear();
			_stringToNumberFunction = null;
			_numberToStringFunction = null;
			
			// compile the number format function from the metadata
			var numberFormat:String = getMetadata(ColumnMetadata.NUMBER);
			if (numberFormat)
			{
				try
				{
					_stringToNumberFunction = JS.compile(numberFormat, [ColumnMetadata.STRING, 'array'], errorHandler);
				}
				catch (e:Error)
				{
					JS.error(e);
				}
			}
			
			// compile the string format function from the metadata
			var stringFormat:String = getMetadata(ColumnMetadata.STRING);
			if (stringFormat)
			{
				try
				{
					_numberToStringFunction = JS.compile(stringFormat, [ColumnMetadata.NUMBER], errorHandler);
				}
				catch (e:Error)
				{
					JS.error(e);
				}
			}
		}
		
		private function errorHandler(e:*):void
		{
			var str:String = e is Error ? e.message : String(e);
			str = StandardLib.substitute("Error in script for AttributeColumn {0}:\n{1}", Weave.stringify(_metadata), str);
			if (_lastError != str)
			{
				_lastError = str;
				JS.error(e);
			}
		}
		
		private var _lastError:String;
		
		// variables that do not get reset after async task
		private var _stringToNumberFunction:Function = null;
		private var _numberToStringFunction:Function = null;
		
		private function filterStringValue(value:String):Boolean
		{
			if (!value)
				return false;
			
			// keep track of unique strings
			if (!_uniqueStringLookup.has(value))
			{
				_uniqueStrings.push(value);
				// initialize mapping
				_uniqueStringLookup.set(value, -1);
			}
			
			return true;
		}
		
		private function handleDataTaskComplete():void
		{
			// begin sorting unique strings previously listed
			_asyncSort.beginSort(_uniqueStrings, AsyncSort.compareCaseInsensitive);
		}
		
		private var _asyncSort:AsyncSort = Weave.disposableChild(this, AsyncSort);
		
		private function handleSortComplete():void
		{
			if (!_asyncSort.result)
				return;
			
			_i = 0;
			_numberToString.clear();
			_stringToNumber.clear();
			// high priority because not much can be done without data
			WeaveAPI.Scheduler.startTask(this, _iterate, WeaveAPI.TASK_PRIORITY_HIGH, asyncComplete);
		}
		
		private var _i:int;
		private var _numberToString:Object = new JS.Map();
		private var _stringToNumber:Object = new JS.Map();
		
		private function _iterate(stopTime:int):Number
		{
			for (; _i < _uniqueStrings.length; _i++)
			{
				if (JS.now() > stopTime)
					return _i / _uniqueStrings.length;
				
				var string:String = _uniqueStrings[_i];
				_uniqueStringLookup.set(string, _i);
				
				if (_stringToNumberFunction != null)
				{
					var number:Number = StandardLib.asNumber(_stringToNumberFunction(string));
					_stringToNumber.set(string, number);
					_numberToString.set(number, string);
				}
			}
			return 1;
		}
		
		private function asyncComplete():void
		{
			// cache needs to be cleared after async task completes because some values may have been cached while the task was busy
			dataCache.map.clear();
			triggerCallbacks();
		}

		// find the closest string value at a given normalized value
		public function deriveStringFromNumber(number:Number):String
		{
			if (_metadata && _metadata[ColumnMetadata.NUMBER])
			{
				if (_numberToString.has(number))
					return _numberToString.get(number);
				
				if (_numberToStringFunction != null)
				{
					var string:String = StandardLib.asString(_numberToStringFunction(number));
					_numberToString.set(number, string);
					return string;
				}
			}
			else if (number == int(number) && 0 <= number && number < _uniqueStrings.length)
			{
				return _uniqueStrings[int(number)];
			}
			return '';
		}
		
		override protected function generateValue(key:IQualifiedKey, dataType:Class):Object
		{
			var array:Array = dataTask.map_key_arrayData.get(key);
			
			if (dataType === String)
				return aggregate(array, _metadata ? _metadata[ColumnMetadata.AGGREGATION] : null) || '';
			
			var string:String = getValueFromKey(key, String);
			
			if (dataType === Number)
			{
				if (_stringToNumberFunction != null)
					return Number(_stringToNumber.get(string));
				
				return Number(_uniqueStringLookup.get(string));
			}
			
			if (dataType === IQualifiedKey)
			{
				var type:String = _metadata ? _metadata[ColumnMetadata.DATA_TYPE] : null;
				if (!type)
					type = DataType.STRING;
				return WeaveAPI.QKeyManager.getQKey(type, string);
			}
			
			return null;
		}
		
		/**
		 * Aggregates an Array of Strings into a single String.
		 * @param strings An Array of Strings.
		 * @param aggregation One of the constants in weave.api.data.Aggregation.
		 * @return An aggregated String.
		 * @see weave.api.data.Aggregation
		 */		
		public static function aggregate(strings:Array, aggregation:String):String
		{
			if (!strings)
				return undefined;
			
			if (!aggregation)
				aggregation = Aggregation.DEFAULT;
			
			switch (aggregation)
			{
				default:
				case Aggregation.SAME:
					var first:String = strings[0];
					for each (var value:String in strings)
						if (value != first)
							return Weave.lang(Aggregation.AMBIGUOUS_DATA);
					return first;
				
				case Aggregation.FIRST:
					return strings[0];
				
				case Aggregation.LAST:
					return strings[strings.length - 1];
			}
			return null;
		}
		
		public static function getSupportedAggregationModes():Array
		{
			return [Aggregation.SAME, Aggregation.FIRST, Aggregation.LAST];
		}
	}
}
