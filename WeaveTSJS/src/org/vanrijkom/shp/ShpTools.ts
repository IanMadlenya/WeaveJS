/* ************************************************************************ */
/*																			*/
/*  SHP (ESRI ShapeFile Reader)												*/
/*  Copyright (c)2007 Edwin van Rijkom										*/
/*  http://www.vanrijkom.org												*/
/*																			*/
/* This library is free software; you can redistribute it and/or			*/
/* modify it under the terms of the GNU Lesser General Public				*/
/* License as published by the Free Software Foundation; either				*/
/* version 2.1 of the License, or (at your option) any later version.		*/
/*																			*/
/* This library is distributed in the hope that it will be useful,			*/
/* but WITHOUT ANY WARRANTY; without even the implied warranty of			*/
/* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU		*/
/* Lesser General Public License or the LICENSE file for more details.		*/
/*																			*/
/* ************************************************************************ */

namespace org.vanrijkom.shp
{

import JSByteArray = weavejs.util.JSByteArray;
import ShpRecord = org.vanrijkom.shp.ShpRecord;
import ShpError = org.vanrijkom.shp.ShpError;

/**
 * The ShpTools class contains static tool methods for working with
 * ESRI Shapefiles.
 * @author Edwin van Rijkom
 * 
 */	
export class ShpTools
{
	/**
	 * Reads all available ESRI Shape records from the specified ByteArray.
	 * Reading starts at the ByteArrays current offset.
	 * 
	 * @param src ByteArray to read ESRI Shape records from.
	 * @return An Array containing zoomero or more ShpRecord typed values.
	 * @see org.vanrijkom.shp.ShpRecord
	 */	
	public static readRecords(src: JSByteArray): ShpRecord[] {
		var record: ShpRecord;
		var records: ShpRecord[] = [];
		while (true) {			
			try {		
				record = new ShpRecord(src);
				records.push(record);				
			} catch (e) {
				if (e.errorID == ShpError.ERROR_NODATA)
					break;
				else	
					throw(e);				
			}			
		}
		return records;
	}
	
	/* *
	* Draw all Polygon Shape records from an ESRI Shapefile using the
	* Flash drawing API.
	* @param	src
	* @param	dest
	* @param	zoom	
	* @return	Number of lines drawn.
	* /
	public static function drawPolyShpFile(src: ByteArray, dest: Graphics, zoom: Number=1): ShpHeader {
		var shp: ShpHeader = new ShpHeader(src);
		if 	(	shp.shapeType != ShpType.SHAPE_POLYGON 
			&& 	shp.shapeType != ShpType.SHAPE_POLYLINE
			) 
			throw(new ShpError("Shapefile does not contain Polygon records (found type: "+shp.shapeType+")"));
			
		var records: Array = ShpTools.readRecords(src);				
		var i: uint;
		
		for each(var p: ShpRecord in records) {
			// added for Weave
			if (!p.shape)
				continue;
			for each(var r: Array in (p.shape as ShpPolygon).rings) {
				if (r.length) {
					dest.moveTo(r[0].x*zoom,-r[0].y*zoom);
				}
				for (i=1; i<r.length; i++)
					dest.lineTo(r[i].x*zoom,-r[i].y*zoom);				
			}
		}
		return shp;		
	}*/
}
} // package