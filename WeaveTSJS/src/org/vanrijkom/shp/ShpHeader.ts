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

import ShpError = org.vanrijkom.shp.ShpError;
import JSByteArray = weavejs.util.JSByteArray;
import Rectangle = weavejs.geom.Rectangle;
import Point = weavejs.geom.Point;

/**
 * The ShpHeader class parses an ESRI Shapefile Header from a ByteArray.
 * @author Edwin van Rijkom
 * 
 */
export class ShpHeader
{
	/**
	 * Size of the entire Shapefile as stored in the Shapefile, in bytes.
	 */	
	public fileLength: number;
	/**
	 * Shapefile version. Expected value is 1000. 
	 */		
	public version: number;
	/**
	 * Type of the Shape records contained in the remainder of the
	 * Shapefile. Should match one of the constant values defined
	 * in the ShpType class.
	 * @see vanrijkom.shp.ShpType
	 */	
	public shapeType: number;
	/**
	 * The cartesian bounding box of all Shape records contained
	 * in this file.
	 */	
	public boundsXY: Rectangle;
	/**
	 * The minimum (Point.x) and maximum Z (Point.y) value expected
	 * to be encountered in this file.
	 */	
	public boundsZ: Point;
	/**
	 * The minimum (Point.x) and maximum M (Point.y) value expected
	 * to be encountered in this file.
	 */	
	public boundsM: Point;
	
	/**
	 * Constructor.
	 * @param src
	 * @return
	 * @throws vanrijkom.shp.ShpError Not a valid shape file header
	 * @throws vanrijkom.shp.ShpError Not a valid signature
	 * 
	 */			
	constructor(src: JSByteArray) {
		// endian:
		src.littleEndian = false;		
		
		// check length:
		if (src.length-src.position<100)
			throw (new ShpError("Not a valid shape file header (too small)"));
		
		// check signature	
		if (src.readInt() != 9994)
			throw (new ShpError("Not a valid signature. Expected 9994"));
		
		 // skip 5 numberegers;
		src.position += 5*4;
		
		// read file-length:
		this.fileLength = src.readInt();
		
		// switch endian:
		src.littleEndian = true;
		
		// read version:
		this.version = src.readInt();
				
		// read shape-type:
		this.shapeType = src.readInt();
		
		// read bounds:
		this.boundsXY = new Rectangle
			( src.readDouble(), src.readDouble()
			, src.readDouble(), src.readDouble()
			);
		this.boundsZ = new Point( src.readDouble(), src.readDouble() );
		this.boundsM = new Point( src.readDouble(), src.readDouble() );
	}
}

} // package