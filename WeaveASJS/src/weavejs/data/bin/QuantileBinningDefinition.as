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

package weavejs.data.bin
{
	import weavejs.WeaveAPI;
	import weavejs.api.data.IAttributeColumn;
	import weavejs.api.data.IColumnStatistics;
	import weavejs.api.data.IQualifiedKey;
	import weavejs.core.LinkableNumber;
	import weavejs.util.AsyncSort;
	
	/**
	 * QuantileBinningDefinition
	 * 
	 * @author adufilie
	 * @author abaumann
	 * @author sanbalagan
	 */
	public class QuantileBinningDefinition extends AbstractBinningDefinition
	{
		public function QuantileBinningDefinition()
		{
			super(true, false);
		}
		
		public const refQuantile:LinkableNumber = Weave.linkableChild(this, new LinkableNumber(.3));
		
		/**
		 * getBinClassifiersForColumn - implements IBinningDefinition Interface
		 * @param column 
		 * @param output
		 */
		override public function generateBinClassifiersForColumn(column:IAttributeColumn):void
		{
			var name:String;
			// clear any existing bin classifiers
			output.removeAllObjects();
			
			var stats:IColumnStatistics = WeaveAPI.StatisticsCache.getColumnStatistics(column);
			var sortedColumn:Array = getSortedColumn(column);
			var binMin:Number;
			var binMax:Number = sortedColumn[0];
			var maxInclusive:Boolean;
			
			var recordCount:int = stats.getCount();
			var refBinSize:Number = Math.ceil(recordCount * refQuantile.value);//how many records in a bin
			if (!refBinSize)
				refBinSize = recordCount;
			var numberOfBins:int = Math.ceil(recordCount / refBinSize);
			var binRecordCount:uint = refBinSize;
			
			for (var iBin:int = 0; iBin < numberOfBins; iBin++)
			{
				binRecordCount = (iBin + 1) * refBinSize;
				binMin = binMax;
				if (iBin == numberOfBins - 1)
				{
					binMax = sortedColumn[sortedColumn.length -1];
					maxInclusive = true;
				}
				else
				{
					binMax = sortedColumn[binRecordCount -1];
					maxInclusive = binMax == binMin;
				}
				tempNumberClassifier.min.value = binMin;
				tempNumberClassifier.max.value = binMax;
				tempNumberClassifier.minInclusive.value = true;
				tempNumberClassifier.maxInclusive.value = maxInclusive;
				
				//first get name from overrideBinNames
				name = getOverrideNames()[iBin];
				//if it is empty string set it from generateBinLabel
				if (!name)
					name = tempNumberClassifier.generateBinLabel(column);
				output.requestObjectCopy(name, tempNumberClassifier);
			}
			
			// trigger callbacks now because we're done updating the output
			asyncResultCallbacks.triggerCallbacks();
		}
		
		// reusable temporary object
		private var tempNumberClassifier:NumberClassifier = Weave.disposableChild(this, NumberClassifier);
		
		//variables for getSortedColumn method
		
		/**
		 * getSortedColumn 
		 * @param column 
		 * @return _sortedColumn array 
		 */
		private function getSortedColumn(column:IAttributeColumn):Array
		{
			var keys:Array = column ? column.keys : [];
			var _sortedColumn:Array = new Array(keys.length);
			var i:uint = 0;
			for each (var key:IQualifiedKey in keys)	
			{
				var n:Number = column.getValueFromKey(key,Number);
				if (isFinite(n))
					_sortedColumn[i++] = n;
			}
			_sortedColumn.length = i;
			AsyncSort.sortImmediately(_sortedColumn);
			return _sortedColumn;
		}

	}
}
