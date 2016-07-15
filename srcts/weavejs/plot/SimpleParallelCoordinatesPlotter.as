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

namespace weavejs.plot
{
	import Graphics = PIXI.Graphics;
	import Shape = flash.display.Shape;
	import Point = weavejs.geom.Point;
	import Dictionary = flash.utils.Dictionary;
	
	import IAttributeColumn = weavejs.api.data.IAttributeColumn;
	import IColumnStatistics = weavejs.api.data.IColumnStatistics;
	import IQualifiedKey = weavejs.api.data.IQualifiedKey;
	import Bounds2D = weavejs.geom.Bounds2D;
	import IPlotter = weavejs.api.ui.IPlotter;
	import IPlotterWithGeometries = weavejs.api.ui.IPlotterWithGeometries;
	import ISelectableAttributes = weavejs.api.data.ISelectableAttributes;
	import LinkableBoolean = weavejs.core.LinkableBoolean;
	import LinkableHashMap = weavejs.core.LinkableHashMap;
	import GeometryType = weavejs.geom.GeometryType;
	import SimpleGeometry = weavejs.geom.SimpleGeometry;
	import DrawUtils = weavejs.util.DrawUtils;
	import SolidLineStyle = weavejs.geom.SolidLineStyle;
	
	export class SimpleParallelCoordinatesPlotter extends AbstractPlotter implements IPlotterWithGeometries, ISelectableAttributes
	{
		WeaveAPI.ClassRegistry.registerImplementation(IPlotter, SimpleParallelCoordinatesPlotter, "Parallel Coordinates");
		
		private static tempBoundsArray:Array = []; // Array of reusable Bounds2D objects
		private static tempPoint:Point = new Point(); // reusable Point object
		
		public columns:LinkableHashMap = Weave.linkableChild(this, new LinkableHashMap(IAttributeColumn));
		public normalize:LinkableBoolean = Weave.linkableChild(this, new LinkableBoolean(true));
		public selectableLines:LinkableBoolean = Weave.linkableChild(this, new LinkableBoolean(false));
		
		public lineStyle:SolidLineStyle = Weave.linkableChild(this, SolidLineStyle);
		public curvedLines:LinkableBoolean = Weave.linkableChild(this, new LinkableBoolean(false));
		
		private _columns:Array = [];
		private _stats:Dictionary = new Dictionary(true);
		private extendPointBounds:number = 0.25; // extends point bounds when selectableLines is false
		private drawStubs:boolean = true; // draws stubbed line segments eminating from points with missing neighboring values
		
		public constructor()
		{
			lineStyle.color.internalDynamicColumn.globalName = WeaveProperties.DEFAULT_COLOR_COLUMN;
			lineStyle.weight.defaultValue.value = 1;
			lineStyle.alpha.defaultValue.value = 1.0;
			
			clipDrawing = false;
			
			columns.childListCallbacks.addImmediateCallback(this, handleColumnsListChange);
			// bounds need to be re-indexed when this option changes
			this.addSpatialDependencies(Weave.properties.enableGeometryProbing);
			this.addSpatialDependencies(this.columns, this.normalize, this.selectableLines);
		}
		private handleColumnsListChange():void
		{
			// When a new column is created, register the stats to trigger callbacks and affect busy status.
			// This will be cleaned up automatically when the column is disposed.
			var newColumn:IAttributeColumn = columns.childListCallbacks.lastObjectAdded as IAttributeColumn;
			if (newColumn)
			{
				_stats[newColumn] = WeaveAPI.StatisticsCache.getColumnStatistics(newColumn);
				Weave.linkableChild(spatialCallbacks, _stats[newColumn]);
			}
			
			_columns = columns.getObjects();
			
			setColumnKeySources([lineStyle.color].concat(_columns));
		}
		
		public getSelectableAttributeNames():Array
		{
			return ["Color", "Columns"];
		}
		public getSelectableAttributes():Array
		{
			return [lineStyle.color, columns];
		}

		/**
		 * Gets an Array of numeric values from the columns.
		 * @param recordKey A key.
		 * @return An Array Numbers.
		 */
		private getValues(recordKey:IQualifiedKey):Array
		{
			var output:Array = new Array(_columns.length);
			for (var i:int = 0; i < _columns.length; i++)
			{
				var column:IAttributeColumn = _columns[i];
				if (normalize.value)
					output[i] = (_stats[column] as IColumnStatistics).getNorm(recordKey);
				else
					output[i] = column.getValueFromKey(recordKey, Number);
			}
			return output;
		}
		
		/*override*/ public getDataBoundsFromRecordKey(recordKey:IQualifiedKey, output:Bounds2D[]):void
		{
			var enableGeomProbing:boolean = Weave.properties.enableGeometryProbing.value;
			
			var values:Array = getValues(recordKey);
			
			// when geom probing is enabled, report a single data bounds
			initBoundsArray(output, enableGeomProbing ? 1 : values.length);
			
			var stubSize:number = selectableLines.value ? 0.5 : extendPointBounds;
			var outputIndex:int = 0;
			for (var x:int = 0; x < values.length; x++)
			{
				var y:number = values[x];
				if (isFinite(y))
				{
					var bounds:Bounds2D = output[outputIndex] as Bounds2D;
					bounds.includeCoords(x, y);
					if (drawStubs)
					{
						bounds.includeCoords(x - stubSize, y);
						bounds.includeCoords(x + stubSize, y);
					}
					if (!enableGeomProbing)
						outputIndex++;
				}
			}
		}
		
		public getGeometriesFromRecordKey(recordKey:IQualifiedKey, minImportance:number = 0, dataBounds:Bounds2D = null):Array
		{
			var x:int;
			var y:number;
			var results:Array = [];
			var values:Array = getValues(recordKey);
			if (selectableLines.value)
			{
				var continueLine:boolean = false;
				for (x = 0; x < values.length; x++)
				{
					y = values[x];
					if (isFinite(y))
					{
						if (continueLine)
						{
							// finite -> finite
							results.push(new SimpleGeometry(GeometryType.LINE, [
								new Point(x - 1, values[x - 1]),
								new Point(x, y)
							]));
						}
						else
						{
							// NaN -> finite
							if (drawStubs && x > 0)
							{
								results.push(new SimpleGeometry(GeometryType.LINE, [
									new Point(x - 0.5, y),
									new Point(x, y)
								]));
							}
							else if (x == values.length - 1)
							{
								results.push(new SimpleGeometry(GeometryType.POINT, [
									new Point(x, y)
								]));
							}
						}
						continueLine = true;
					}
					else
					{
						if (continueLine)
						{
							// finite -> NaN
							y = values[x - 1];
							if (drawStubs)
							{
								results.push(new SimpleGeometry(GeometryType.LINE, [
									new Point(x - 1, y),
									new Point(x - 0.5, y)
								]));
							}
							else
							{
								results.push(new SimpleGeometry(GeometryType.POINT, [
									new Point(x - 1, y)
								]));
							}
						}
						continueLine = false;
					}
				}
			}
			else
			{
				for (x = 0; x < values.length; x++)
				{
					y = values[x];
					if (isFinite(y))
					{
						if (extendPointBounds)
							results.push(new SimpleGeometry(GeometryType.LINE, [
								new Point(x - extendPointBounds, y),
								new Point(x + extendPointBounds, y)
							]));
						else
							results.push(new SimpleGeometry(GeometryType.POINT, [
								new Point(x, y)
							]));
					}
				}
			}
			
			return results;
		}
		
		public getBackgroundGeometries():Array
		{
			return [];
		}
		
		/**
		 * This function may be defined by a class that extends AbstractPlotter to use the basic template code in AbstractPlotter.drawPlot().
		 */
		/*override*/ protected function addRecordGraphicsToTempShape(recordKey:IQualifiedKey, dataBounds:Bounds2D, screenBounds:Bounds2D, tempShape:Shape):void
		{
			var graphics:Graphics = tempShape.graphics;
			var prevScreenX:number = NaN;
			var prevScreenY:number = NaN;
			var continueLine:boolean = false;
			
			lineStyle.beginLineStyle(recordKey, graphics);
			
			var values:Array = getValues(recordKey);
			for (var x:int = 0; x < values.length; x++)
			{
				var y:number = values[x];
				if (!isFinite(y))
				{
					// missing value
					if (drawStubs && continueLine)
					{
						// previous value was not missing, so half a horizontal line eminating from the previous point
						tempPoint.x = x - 0.5;
						tempPoint.y = values[x - 1];
						dataBounds.projectPointTo(tempPoint, screenBounds);
						graphics.lineTo(tempPoint.x, tempPoint.y);
					}
					
					continueLine = false;
					continue;
				}
				
				// value is not missing
				
				if (x > 0 && drawStubs && !continueLine)
				{
					// previous value was missing, so draw half a horizontal line going into the current point
					tempPoint.x = x - 0.5;
					tempPoint.y = y;
					dataBounds.projectPointTo(tempPoint, screenBounds);
					prevScreenX = tempPoint.x
					prevScreenY = tempPoint.y;
					graphics.moveTo(prevScreenX, prevScreenY);
					continueLine = true;
				}
				
				tempPoint.x = x;
				tempPoint.y = y;
				dataBounds.projectPointTo(tempPoint, screenBounds);
				if (continueLine)
				{
					if (curvedLines.value)
						DrawUtils.drawDoubleCurve(graphics, prevScreenX, prevScreenY, tempPoint.x, tempPoint.y, true, 1, continueLine);
					else
						graphics.lineTo(tempPoint.x, tempPoint.y);
				}
				else
					graphics.moveTo(tempPoint.x, tempPoint.y);
				
				continueLine = true;
				prevScreenX = tempPoint.x;
				prevScreenY = tempPoint.y;
			}
		}
		
		/*override*/ public getBackgroundDataBounds(output:Bounds2D):void
		{
			output.setXRange(0, _columns.length - 1);
			if (normalize.value)
			{
				output.setYRange(0, 1);
			}
			else
			{
				output.setYRange(NaN, NaN);
				for (var i:int = 0; i < _columns.length; i++)
				{
					var stats:IColumnStatistics = _stats[_columns[i]];
					output.includeCoords(i, stats.getMin());
					output.includeCoords(i, stats.getMax());
				}
			}
		}
	}
}
