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
	import Point = weavejs.geom.Point;
	
	import DynamicState = weavejs.api.core.DynamicState;
	import IQualifiedKey = weavejs.api.data.IQualifiedKey;
	import AlwaysDefinedColumn = weavejs.data.column.AlwaysDefinedColumn;
	import DynamicColumn = weavejs.data.column.DynamicColumn;
	import Bounds2D = weavejs.geom.Bounds2D;
	import SolidFillStyle = weavejs.plot.SolidFillStyle;
	import SolidLineStyle = weavejs.plot.SolidLineStyle;
	import WeaveProperties = weavejs.app.WeaveProperties;

	/**
	 * This plotter plots rectangles using xMin,yMin,xMax,yMax values.
	 * There is a set of data coordinates and a set of screen offset coordinates.
	 */
	export class BoundsPlotter extends AbstractPlotter
	{
		public constructor()
		{
			super();

			this.addSpatialDependencies(this.xMinData, this.yMinData, this.xMaxData, this.yMaxData);
			this.fill.color.internalDynamicColumn.targetPath = [WeaveProperties.DEFAULT_COLOR_COLUMN];
			this.setColumnKeySources([this.xMinData, this.yMinData, this.xMaxData, this.yMaxData]);
		}

		// spatial properties
		/**
		 * This is the minimum X data value associated with the rectangle.
		 */
		public xMinData:DynamicColumn = Weave.linkableChild(this, DynamicColumn);
		/**
		 * This is the minimum Y data value associated with the rectangle.
		 */
		public yMinData:DynamicColumn = Weave.linkableChild(this, DynamicColumn);
		/**
		 * This is the maximum X data value associated with the rectangle.
		 */
		public xMaxData:DynamicColumn = Weave.linkableChild(this, DynamicColumn);
		/**
		 * This is the maximum Y data value associated with the rectangle.
		 */
		public yMaxData:DynamicColumn = Weave.linkableChild(this, DynamicColumn);

		// visual properties
		/**
		 * This is an offset in screen coordinates when projecting the data rectangle onto the screen.
		 */
		public xMinScreenOffset:AlwaysDefinedColumn = Weave.linkableChild(this, new AlwaysDefinedColumn(0));
		/**
		 * This is an offset in screen coordinates when projecting the data rectangle onto the screen.
		 */
		public yMinScreenOffset:AlwaysDefinedColumn = Weave.linkableChild(this, new AlwaysDefinedColumn(0));
		/**
		 * This is an offset in screen coordinates when projecting the data rectangle onto the screen.
		 */
		public xMaxScreenOffset:AlwaysDefinedColumn = Weave.linkableChild(this, new AlwaysDefinedColumn(0));
		/**
		 * This is an offset in screen coordinates when projecting the data rectangle onto the screen.
		 */
		public yMaxScreenOffset:AlwaysDefinedColumn = Weave.linkableChild(this, new AlwaysDefinedColumn(0));
		/**
		 * This is the line style used to draw the outline of the rectangle.
		 */
		public line:SolidLineStyle = Weave.linkableChild(this, SolidLineStyle);
		/**
		 * This is the fill style used to fill the rectangle.
		 */
		public fill:SolidFillStyle = Weave.linkableChild(this, SolidFillStyle);

		/**
		 * This function returns a Bounds2D object set to the data bounds associated with the given record key.
		 * @param key The key of a data record.
		 * @param output An Array of Bounds2D object to store the result in.
		 */
		/*override*/ public getDataBoundsFromRecordKey(recordKey:IQualifiedKey, output:Bounds2D[]):void
		{
			this.initBoundsArray(output);
			output[0].setBounds(
				this.xMinData.getValueFromKey(recordKey, Number),
				this.yMinData.getValueFromKey(recordKey, Number),
				this.xMaxData.getValueFromKey(recordKey, Number),
				this.yMaxData.getValueFromKey(recordKey, Number)
			);
		}

		/**
		 * This function may be defined by a class that extends AbstractPlotter to use the basic template code in AbstractPlotter.drawPlot().
		 */
		/*override*/ protected addRecordGraphics(recordKey:IQualifiedKey, dataBounds:Bounds2D, screenBounds:Bounds2D, graphics:Graphics):void
		{
			// project data coordinates to screen coordinates and draw graphics
			BoundsPlotter.tempPoint.x = this.xMinData.getValueFromKey(recordKey, Number);
			BoundsPlotter.tempPoint.y = this.yMinData.getValueFromKey(recordKey, Number);
			dataBounds.projectPointTo(BoundsPlotter.tempPoint, screenBounds);
			BoundsPlotter.tempPoint.x += this.xMinScreenOffset.getValueFromKey(recordKey, Number);
			BoundsPlotter.tempPoint.y += this.yMinScreenOffset.getValueFromKey(recordKey, Number);
			BoundsPlotter.tempBounds.setMinPoint(BoundsPlotter.tempPoint);
			
			BoundsPlotter.tempPoint.x = this.xMaxData.getValueFromKey(recordKey, Number);
			BoundsPlotter.tempPoint.y = this.yMaxData.getValueFromKey(recordKey, Number);
			dataBounds.projectPointTo(BoundsPlotter.tempPoint, screenBounds);
			BoundsPlotter.tempPoint.x += this.xMaxScreenOffset.getValueFromKey(recordKey, Number);
			BoundsPlotter.tempPoint.y += this.yMaxScreenOffset.getValueFromKey(recordKey, Number);
			BoundsPlotter.tempBounds.setMaxPoint(BoundsPlotter.tempPoint);
				
			// draw graphics
			this.line.beginLineStyle(recordKey, graphics);
			this.fill.beginFillStyle(recordKey, graphics);

			//trace(recordKey,tempBounds);
			graphics.drawRect(BoundsPlotter.tempBounds.getXMin(), BoundsPlotter.tempBounds.getYMin(), BoundsPlotter.tempBounds.getWidth(), BoundsPlotter.tempBounds.getHeight());

			graphics.endFill();
		}
		
		private static tempBounds:Bounds2D = new Bounds2D(); // reusable object
		private static tempPoint:Point = new Point(); // reusable object
		
		/*[Deprecated(replacement="line")] public set lineStyle(value:Object):void
		{
			try
			{
				Weave.setState(line, value[0][DynamicState.SESSION_STATE]);
			}
			catch (e)
			{
				console.error(e);
			}
		}
		[Deprecated(replacement="fill")] public set fillStyle(value:Object):void
		{
			try
			{
				Weave.setState(fill, value[0][DynamicState.SESSION_STATE]);
			}
			catch (e)
			{
				console.error(e);
			}
		}*/
	}
}

