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
	import weavejs.util.Dictionary2D;
	import weavejs.util.JS;
	import weavejs.util.StandardLib;
	
	/**
	 * @author adufilie
	 */
	public class NumberColumn extends AbstractAttributeColumn implements IPrimitiveColumn, IBaseColumn
	{
		public function NumberColumn(metadata:Object = null)
		{
			super(metadata);
			
			dataTask = new ColumnDataTask(this, isFinite, asyncComplete);
			dataCache = new Dictionary2D();
		}
		
		override public function getMetadata(propertyName:String):String
		{
			if (propertyName == ColumnMetadata.DATA_TYPE)
				return DataType.NUMBER;
			return super.getMetadata(propertyName);
		}

		public function setRecords(keys:Array, numericData:Array):void
		{
			dataTask.begin(keys, numericData);

			numberToStringFunction = null;
			// compile the string format function from the metadata
			var stringFormat:String = getMetadata(ColumnMetadata.STRING);
			if (stringFormat)
			{
				try
				{
					numberToStringFunction = JS.compile(stringFormat, [ColumnMetadata.NUMBER, 'array'], errorHandler);
				}
				catch (e:Error)
				{
					errorHandler(e);
				}
			}
		}
		
		private function asyncComplete():void
		{
			// cache needs to be cleared after async task completes because some values may have been cached while the task was busy
			dataCache.map.clear();
			triggerCallbacks();
		}
		
		private function errorHandler(e:*):void
		{
			var str:String = e is Error ? e.message : String(e);
			str = StandardLib.substitute("Error in script for attribute column {0}:\n{1}", Weave.stringify(_metadata), str);
			if (_lastError != str)
			{
				_lastError = str;
				JS.error(e);
			}
		}
		
		private var _lastError:String;
		
		private var numberToStringFunction:Function = null;
		
		/**
		 * Get a string value for a given number.
		 */
		public function deriveStringFromNumber(number:Number):String
		{
			if (numberToStringFunction != null)
				return StandardLib.asString(numberToStringFunction(number, [number]));
			return StandardLib.formatNumber(number);
		}
		
		override protected function generateValue(key:IQualifiedKey, dataType:Class):Object
		{
			var array:Array = dataTask.map_key_arrayData.get(key);
			
			if (dataType === Number)
				return aggregate(array, _metadata ? _metadata[ColumnMetadata.AGGREGATION] : null);
			
			if (dataType === String)
			{
				var number:Number = getValueFromKey(key, Number);
				if (numberToStringFunction != null)
				{
					return StandardLib.asString(numberToStringFunction(number, array));
				}
				if (isNaN(number) && array && array.length > 1)
				{
					var aggregation:String = (_metadata && _metadata[ColumnMetadata.AGGREGATION]) as String || Aggregation.DEFAULT;
					if (aggregation == Aggregation.SAME)
						return Weave.lang(Aggregation.AMBIGUOUS_DATA);
				}
				return StandardLib.formatNumber(number);
			}
			
			if (dataType === IQualifiedKey)
				return WeaveAPI.QKeyManager.getQKey(DataType.NUMBER, getValueFromKey(key, Number));
			
			return null;
		}

		/**
		 * Aggregates an Array of Numbers into a single Number.
		 * @param numbers An Array of Numbers.
		 * @param aggregation One of the constants in weave.api.data.Aggregation.
		 * @return An aggregated Number.
		 * @see weave.api.data.Aggregation
		 */		
		public static function aggregate(numbers:Array, aggregation:String):Number
		{
			if (!numbers)
				return NaN;
			
			if (!aggregation)
				aggregation = Aggregation.DEFAULT;
			
			switch (aggregation)
			{
				case Aggregation.SAME:
					var first:Number = numbers[0];
					for each (var value:Number in numbers)
						if (value != first)
							return NaN;
					return first;
				case Aggregation.FIRST:
					return numbers[0];
				case Aggregation.LAST:
					return numbers[numbers.length - 1];
				case Aggregation.COUNT:
					return numbers.length;
				case Aggregation.MEAN:
					return StandardLib.mean(numbers);
				case Aggregation.SUM:
					return StandardLib.sum(numbers);
				case Aggregation.MIN:
					return Math.min.apply(null, numbers);
				case Aggregation.MAX:
					return Math.max.apply(null, numbers);
				default:
					return NaN;
			}
		}
	}
}
