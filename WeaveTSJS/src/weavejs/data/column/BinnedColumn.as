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
	import weavejs.api.data.ColumnMetadata;
	import weavejs.api.data.IAttributeColumn;
	import weavejs.api.data.IBinClassifier;
	import weavejs.api.data.IPrimitiveColumn;
	import weavejs.api.data.IQualifiedKey;
	import weavejs.data.ColumnUtils;
	import weavejs.data.bin.DynamicBinningDefinition;
	import weavejs.data.bin.NumberClassifier;
	import weavejs.data.bin.SimpleBinningDefinition;
	import weavejs.util.JS;
	import weavejs.util.StandardLib;
	
	/**
	 * A binned column maps a record key to a bin key.
	 * 
	 * @author adufilie
	 */
	public class BinnedColumn extends ExtendedDynamicColumn implements IPrimitiveColumn
	{
		public function BinnedColumn()
		{
			super();
			binningDefinition.requestLocalObject(SimpleBinningDefinition, false);
			binningDefinition.generateBinClassifiersForColumn(internalDynamicColumn);
			Weave.linkableChild(this, binningDefinition.asyncResultCallbacks);
		}
		
		/**
		 * This number overrides the min,max metadata values.
		 * @param propertyName The name of a metadata property.
		 * @return The value of the specified metadata property.
		 */
		override public function getMetadata(propertyName:String):String
		{
			validateBins();
			if (_binClassifiers && _binClassifiers.length)
			{
				switch (propertyName)
				{
					case ColumnMetadata.MIN:
						return numberOfBins > 0 ? "0" : null;
					case ColumnMetadata.MAX:
						var binCount:int = numberOfBins;
						return binCount > 0 ? String(binCount - 1) : null;
				}
			}
			return super.getMetadata(propertyName);
		}
		
		/**
		 * This defines how to generate the bins for this BinnedColumn.
		 * This is used to generate the derivedBins.
		 */
		public const binningDefinition:DynamicBinningDefinition = Weave.linkableChild(this, new DynamicBinningDefinition(true));
		
		private var _binNames:Array = []; // maps a bin index to a bin name
		private var _binClassifiers:Array = []; // maps a bin index to an IBinClassifier
		private var map_key_binIndex:Object = new JS.Map(); // maps a record key to a bin index
		private var _binnedKeysArray:Array = []; // maps a bin index to a list of keys in that bin
		private var _binnedKeysMap:Object = {}; // maps a bin name to a list of keys in that bin
		private var _largestBinSize:uint = 0;
		private var _resultTriggerCount:uint = 0;
		
		/**
		 * This function generates bins using the binning definition and the internal column,
		 * and also saves lookups for mapping between bins and keys.
		 */
		private function validateBins():void
		{
			if (_resultTriggerCount != binningDefinition.asyncResultCallbacks.triggerCounter)
			{
				if (WeaveAPI.SessionManager.linkableObjectIsBusy(this))
					return;
				
				_resultTriggerCount = binningDefinition.asyncResultCallbacks.triggerCounter;
				// reset cached values
				_column = internalDynamicColumn.getInternalColumn();
				map_key_binIndex = new JS.Map();
				_binnedKeysArray = [];
				_binnedKeysMap = {};
				_largestBinSize = 0;
				// save bin names for faster lookup
				_binNames = binningDefinition.getBinNames();
				_binClassifiers = binningDefinition.getBinClassifiers();
				// create empty key arrays
				if (_binNames)
					for (var i:int = 0; i < _binNames.length; i++)
						_binnedKeysMap[_binNames[i]] = _binnedKeysArray[i] = []; // same Array pointer
				_keys = internalDynamicColumn.keys;
				_i = 0;
				if (StandardLib.getArrayType(_binClassifiers) == NumberClassifier)
					_dataType = Number;
				else
					_dataType = String;
				// fill all mappings
				if (_column && _binClassifiers)
				{
					// high priority because not much can be done without data
					WeaveAPI.Scheduler.startTask(this, _asyncIterate, WeaveAPI.TASK_PRIORITY_HIGH, triggerCallbacks, Weave.lang("Binning {0} records", _keys.length));
				}
			}
		}
		
		private var _dataType:Class;
		private var _column:IAttributeColumn;
		private var _i:int;
		private var _keys:Array;
		private function _asyncIterate(stopTime:int):Number
		{
			// stop immediately if result callbacks were triggered
			if (_resultTriggerCount != binningDefinition.asyncResultCallbacks.triggerCounter)
				return 1;

			for (; _i < _keys.length; _i++)
			{
				if (JS.now() > stopTime)
					return _i / _keys.length;
				
				var key:IQualifiedKey = _keys[_i];
				var value:* = _column.getValueFromKey(key, _dataType);
				var binIndex:int = 0;
				for (; binIndex < _binClassifiers.length; binIndex++)
				{
					if ((_binClassifiers[binIndex] as IBinClassifier).contains(value))
					{
						map_key_binIndex.set(key, binIndex);
						var array:Array = _binnedKeysArray[binIndex] as Array;
						if (array.push(key) > _largestBinSize)
							_largestBinSize = array.length;
						break;
					}
				}
			}
			return 1;
		}

		/**
		 * This is the number of bins that have been generated by
		 * the binning definition using with the internal column.
		 */
		public function get numberOfBins():uint
		{
			validateBins();
			return _binNames.length;
		}
		
		/**
		 * This is the largest number of records in any of the bins.
		 */		
		public function get largestBinSize():uint
		{
			validateBins();
			return _largestBinSize;
		}
		
		/**
		 * This function gets a list of keys in a bin.
		 * @param binIndex The index of the bin to get the keys from.
		 * @return An Array of keys in the specified bin.
		 */
		public function getKeysFromBinIndex(binIndex:uint):Array/*/<IQualifiedKey>/*/
		{
			validateBins();
			if (binIndex < _binnedKeysArray.length)
				return _binnedKeysArray[binIndex];
			return null;
		}
		
		/**
		 * This function gets a list of keys in a bin.
		 * @param binIndex The name of the bin to get the keys from.
		 * @return An Array of keys in the specified bin.
		 */
		public function getKeysFromBinName(binName:String):Array/*/<IQualifiedKey>/*/
		{
			validateBins();
			return _binnedKeysMap[binName] as Array;
		}
		
		public function getBinIndexFromDataValue(value:*):Number
		{
			validateBins();
			if (_binClassifiers)
				for (var i:int = 0; i < _binClassifiers.length; i++)
					if ((_binClassifiers[i] as IBinClassifier).contains(value))
						return i;
			return NaN;
		}

		/**
		 * This function returns different results depending on the dataType.
		 * Supported types:
		 *     default -> IBinClassifier that matches the given record key
		 *     Number -> bin index for the given record key
		 *     String -> bin name for the given record key
		 *     Array -> list of keys in the same bin as the given record key
		 * @param key A record identifier.
		 * @param dataType The requested return type.
		 * @return If the specified dataType is supported, a value of that type.  Otherwise, the default return value for the given record key.
		 */
		override public function getValueFromKey(key:IQualifiedKey, dataType:Class = null):*
		{
			validateBins();
			
			if (!_binClassifiers || !_binClassifiers.length)
				return super.getValueFromKey(key, dataType);
			
			var binIndex:Number = Number(map_key_binIndex.get(key)); // undefined -> NaN
			
			// Number: return bin index
			if (dataType == Number)
				return binIndex;
			
			// String: return bin name
			if (dataType == String)
				return isNaN(binIndex) ? '' : _binNames[binIndex];
			
			if (isNaN(binIndex))
				return undefined;
			
			// Array: return list of keys in the same bin
			if (dataType == Array)
				return _binnedKeysArray[binIndex] as Array;
			
			// default: return IBinClassifier
			return _binClassifiers && _binClassifiers[binIndex];
		}
		
		
		/**
		 * From a bin index, this function returns the name of the bin.
		 * @param value A bin index
		 * @return The name of the bin
		 */
		public function deriveStringFromNumber(value:Number):String
		{
			validateBins();
			
			if (!_binClassifiers || !_binClassifiers.length)
				return ColumnUtils.deriveStringFromNumber(internalDynamicColumn, value);
			
			try
			{
				return _binNames[value];
			}
			catch (e:Error) { } // ok to ignore Array[index] error
			
			return '';
		}
	}
}
