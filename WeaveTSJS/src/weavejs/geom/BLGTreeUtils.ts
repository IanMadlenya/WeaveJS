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

namespace weavejs.geom
{
	import StandardLib = weavejs.util.StandardLib;
	import Bounds2D = weavejs.geom.Bounds2D;	
	
	/**
	 * This is an all-static class for building Binary Line Generalization Trees.
	 * 
	 * @author adufilie
	 */
	export class BLGTreeUtils
	{
		public static /* readonly */ METHOD_SORT:string = "BLGTreeUtils.METHOD_SORT";
		public static /* readonly */ METHOD_SAMPLE:string = "BLGTreeUtils.METHOD_SAMPLE";
		
		public static buildBLGTree(vertexChain:VertexChainLink, output:BLGTree, method:string = null):void
		{
			switch (method)
			{
				default:
				case BLGTreeUtils.METHOD_SORT:
					return BLGTreeUtils.buildBLGTreeSortMethod(vertexChain, output);
				case BLGTreeUtils.METHOD_SAMPLE:
					return BLGTreeUtils.buildBLGTreeSampleMethod(vertexChain, output);
			}
		}
		
		/**
		 * Reusable temporary object, helps reduce garbage collection activity.
		 */
		private static /* readonly */ tempBounds:Bounds2D = new Bounds2D();

		/**
		 * Sorts points by importance value, removes least important points first.
		 * @param firstVertex The first vertex in a chain.
		 * @param outputCoordinates The BLGTree to store the processed points in.
		 */
		private static buildBLGTreeSortMethod(firstVertex:VertexChainLink, outputCoordinates:BLGTree):void
		{
			var startingChainLength:int = 0;
			
			// get the bounding box of the chain
			var vertex:VertexChainLink = firstVertex;
			BLGTreeUtils.tempBounds.reset();
			do {
				BLGTreeUtils.tempBounds.includeCoords(vertex.x, vertex.y);
				startingChainLength++; // keep track of the length of the chain
				vertex = vertex.next;
			} while (vertex != firstVertex);
			
			// calculate the maximum possible importance of vertices in this chain
			var maxImportance:number = BLGTreeUtils.tempBounds.getArea();
			if (maxImportance == 0)
			{
				var length:number = BLGTreeUtils.tempBounds.getWidth() + BLGTreeUtils.tempBounds.getHeight();
				if (length > 0)
					maxImportance = length * length;
				else
					maxImportance = Infinity; // a single point
			}

			// begin removing vertices
			var minSize:int = 2; // geomType == GEOM_TYPE_POLYGON ? 3 : 2;
			var sortArray:VertexChainLink[] = [];
			var index:int;
			var currentChainLength:int = startingChainLength;
			while (startingChainLength > minSize)
			{
				// validate importance of vertices, then sort by importance
				sortArray.length = startingChainLength;
				vertex = firstVertex;
				for (index = 0; index < startingChainLength; index++)
				{
					vertex.validateImportance();
					sortArray[index] = vertex;
					vertex = vertex.next;
				}
				StandardLib.sortOn(sortArray, VertexChainLink.IMPORTANCE);
				
				// in sorted order, extract each point as long as its
				// surrounding points have not been invalidated
				for (index = 0; index < startingChainLength && currentChainLength > minSize; index++)
				{
					vertex = sortArray[index];
					// skip vertices whose importance needs to be updated
					if (!vertex.importanceIsValid)
						continue;
					// set firstVertex to next one to make sure next loop iteration will work
					firstVertex = vertex.next;
					// extract this vertex, invalidating adjacent vertices
					outputCoordinates.insert(vertex.vertexID, vertex.importance, vertex.x, vertex.y);
					vertex.removeFromChain();
					currentChainLength--;
				}
				// prepare for next loop iteration
				startingChainLength = currentChainLength;
			}
			
			// remaining vertices are required for displaying this shape
			// extract remaining points, setting importance value
			for (index = 0; index < startingChainLength; index++)
			{
				vertex = firstVertex.next;
				outputCoordinates.insert(vertex.vertexID, maxImportance, vertex.x, vertex.y);
				vertex.removeFromChain();
			}
		}

		private static buildBLGTreeSampleMethod(firstVertex:VertexChainLink, output:BLGTree, sampleInterval:int = 3):void
		{
			var tree:BLGTree = output;
			var vertex:VertexChainLink = firstVertex;
			var chainLength:int = 0;
			
			// get the bounding box of the chain
			do {
				chainLength++; //determine lenfth of chain
				vertex = vertex.next;
			} while (vertex != firstVertex);
			
			while( chainLength != 0 )
			{	
				for( var i:int = 0; i < sampleInterval-1; i++) //move over interval number of vertices
					vertex = vertex.next;
				vertex.next.validateImportance();
				output.insert(vertex.next.vertexID, vertex.next.importance, vertex.next.x, vertex.next.y);
				vertex.next.removeFromChain();
				chainLength--;
			}
		}
	}
}






























