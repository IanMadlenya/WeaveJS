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

package weavejs.geom
{
	import weavejs.util.ArrayUtils;
	import weavejs.util.JS;
	import weavejs.util.StandardLib;
	
	/**
	 * This class defines a K-Dimensional Tree.
	 * 
	 * @author adufilie
	 */
	public class KDTree/*/<T>/*/
	{
		/**
		 * Constructs an empty KDTree with the given dimensionality.
		 * 
		 * TODO: add parameter for an Array of key,object pairs and create a balanced tree from those.
		 */
		public function KDTree(dimensionality:uint)
		{
			this.dimensionality = dimensionality;
			if (dimensionality <= 0)
				throw("KDTree dimensionality must be > 0. (Given: "+dimensionality+")");
		}
		
		/**
		 * The dimensionality of the KDTree.
		 */
		private var dimensionality:int;
		
		/**
		 * This is the root of the tree.
		 */
		private var rootNode:KDNode/*/<T>/*/ = null;
		
		/**
		 * This Array contains pointers to all nodes in the tree.
		 */
		private var allNodes:Array/*/<KDNode<T>>/*/ = [];
		
		/**
		 * The number of nodes in the tree.
		 */
		public function get nodeCount():int
		{
			return allNodes.length;
		}
		
		/**
		 * If this is true, the tree will automatically balance itself when queried after nodes are inserted.
		 * 
		 * NOTE: Balancing a large tree is very slow, so this will not give any benefit if the tree changes often.
		 */
		public var autoBalance:Boolean = false; // should stay false except for special cases
		
		/**
		 * This flag will be true if the tree needs to be balanced before querying.
		 */
		private var needsBalancing:Boolean = false;
		
		private var balanceStack:Array = [];
		private const LEFT_SIDE:int = 0, RIGHT_SIDE:int = 1;
		/**
		 * Balance the tree so there are an (approximately) equal number of points
		 * on either side of any given node. A balanced tree yields faster query
		 * times compared to an unbalanced tree.
		 * 
		 * NOTE: Balancing a large tree is very slow, so this should not be called very often.
		 */
		public function balance():void
		{
			//trace("balance "+nodeCount+" nodes");
			
			// tree will be balanced after calling this function, so clear needsBalancing flag
			needsBalancing = false;
			// do nothing if there are no nodes
			if (nodeCount == 0)
				return;
			var params:Object;
			var medianIndex:int, firstIndex:int, lastIndex:int;
			var medianNode:KDNode;
			var nextAxis:int;
			// begin by sorting the entire collection of nodes on the first dimension (axis)
			var stackPos:int = 0;
			balanceStack[0] = {parent: null, firstIndex: 0, lastIndex: allNodes.length - 1, axis: 0};
			while (stackPos >= 0)
			{
				// pop params off stack
				params = balanceStack[stackPos] as Object;
				balanceStack[stackPos] = null;
				stackPos--;
				// get values from params
				firstIndex = params.firstIndex;
				lastIndex = params.lastIndex;
				nextAxis = params.axis;
				// set static variable used by the compareNodes function
				compareNodesSortDimension = nextAxis;
				// get index of median node
				medianIndex = ArrayUtils.getMedianIndex(allNodes, compareNodes, firstIndex, lastIndex);
				
				//if (params.parent == null)
				//	trace("sort "+nodes.length+" "+DebugUtils.getTime());
				
				// get median node and initialize split dimension
				medianNode = allNodes[medianIndex];
				medianNode.clearChildrenAndSetSplitDimension(params.axis);
				// add median node to tree according to params
				if (params.parent == null)
					rootNode = medianNode;
				else if (params.side == LEFT_SIDE)
					(params.parent as KDNode).left = medianNode;
				else // right side
					(params.parent as KDNode).right = medianNode;
				// calculate split dimension for next group of nodes
				nextAxis = (params.axis + 1) % dimensionality;
				// push params for balancing left side of median
				if (medianIndex > firstIndex)
				{
					balanceStack[++stackPos] = {
						parent: medianNode,
						side: LEFT_SIDE,
						firstIndex: firstIndex,
						lastIndex: medianIndex - 1,
							axis: nextAxis
					};
				}
				if (medianIndex < lastIndex)
				{
					// push params for balancing right side of median
					balanceStack[++stackPos] = {
						parent: medianNode,
						side: RIGHT_SIDE,
						firstIndex: medianIndex + 1,
							lastIndex: lastIndex,
							axis: nextAxis
					};
				}
			}
		}
		
		/**
		 * This function inserts a new key,object pair into the KDTree.
		 * Warning: This function could cause the tree to become unbalanced and degrade performance.
		 * @param key The k-dimensional key that corresponds to the object.
		 * @param object The object to insert in the tree.
		 * @return A KDNode object that can be used as a parameter to the remove() function.
		 */
		public function insert(key:Array/*/<number>/*/, obj:/*/T/*/Object):KDNode/*/<T>/*/
		{
			if (key.length != dimensionality)
				throw new Error("KDTree.insert key parameter must have same dimensionality as tree");
			
			var newNode:KDNode;
			if (autoBalance)
			{
				// add the node to the list of all nodes
				newNode = getUnusedNode(key, obj);
				allNodes.push(newNode);
				// make sure the tree will balance itself before querying
				needsBalancing = true;
				return newNode;
			}
			
			// base case: if object is null, don't insert it in the tree.
			if (obj == null)
				return null;
			// base case: if the tree is empty, store this key,object pair at the root node
			if (rootNode == null)
			{
				rootNode = getUnusedNode(key, obj);
				allNodes.push(rootNode);
				return rootNode;
			}
			var node:KDNode = rootNode;
			while (true)
			{
				if (key[node.splitDimension] < node.location)
				{
					// left side
					if (node.left == null)
					{
						// no node to the left, insert there
						node.left = getUnusedNode(key, obj, (node.splitDimension + 1) % dimensionality);
						allNodes.push(node.left);
						return node.left;
					}
					// go down the tree
					node = node.left;
				}
				else if (StandardLib.compare(key, node.key) == 0)
				{
					// identical key
					if (node.siblings == null)
						node.siblings = [];
					newNode = getUnusedNode(key, obj, node.splitDimension);
					node.siblings.push(newNode);
					return newNode;
				}
				else // key >= location
				{
					// right side
					if (node.right == null)
					{
						// no node to the right, insert there
						node.right = getUnusedNode(key, obj, (node.splitDimension + 1) % dimensionality);
						allNodes.push(node.right);
						return node.right;
					}
					// go down the tree
					node = node.right;
				}
			}
			throw "unreachable";
		}
		
		/**
		 * Remove a single node from the tree.
		 * @param node The node to remove from the tree.
		 */
		public function remove(node:KDNode/*/<T>/*/):void
		{
			var index:int = allNodes.indexOf(node);
			// stop if node not in tree
			if (index < 0)
				return;
			// remove node from allNodes Array
			allNodes.splice(index, 1);
			//temporary solution: set object to null so it won't be returned in future query results
			node.object = null;
			//TODO: should restructure the tree by re-inserting descendants of this node.
		}
		
		/**
		 * Remove all nodes from the tree.
		 */
		public function clear():void
		{
			rootNode = null;
			for (var i:int = allNodes.length; i--;)
				saveUnusedNode(allNodes[i] as KDNode);
			allNodes.length = 0; // clear references to nodes
		}
		
		/**
		 * used internally to keep track of the current traversal operation
		 */
		private var nodeStack:Array/*/<KDNode>/*/ = [];
		
		/**
		 * Use these values for the sortDirection parameter of queryRange().
		 */
		public static const ASCENDING:String = "ascending", DESCENDING:String = "descending";
		
		/**
		 * @param minKey The minimum key values allowed for results of this query
		 * @param maxKey The maximum key values allowed for results of this query
		 * @param boundaryInclusive Specify whether to include the boundary for the query
		 * @param sortDimension Specify an integer >= 0 for the dimension to sort by
		 * @param sortDirection Specify either ASCENDING or DESCENDING
		 * @return An array of pointers to objects with K-Dimensional keys that fall between minKey and maxKey.
		 */
		public function queryRange(minKey:Array/*/<number>/*/, maxKey:Array/*/<number>/*/, boundaryInclusive:Boolean = true, sortDimension:int = -1, sortDirection:String = 'ascending'):Array/*/<T>/*/
		{
			var queryResult:Array = new Array();
			if (minKey.length != dimensionality || maxKey.length != dimensionality)
				throw new Error("KDTree.queryRange parameters must have same dimensionality as tree");
			
			// if tree needs to be balanced before querying, balance it now
			if (needsBalancing)
				balance();
			
			var i:int;
			
			// make sure parameters are valid before continuing
			var parametersAreValid:Boolean = true;
			for (i = 0; i < dimensionality; i++)
				if (isNaN(minKey[i]) || isNaN(maxKey[i]))
					parametersAreValid = false;
			
			var map_ignore:Object = new JS.Map();
			var resultCount:int = 0;
			// only continue if root node is not null and rootNode location is defined
			if (rootNode != null && !isNaN(rootNode.location) && parametersAreValid)
			{
				// declare temp variables
				var inRange:Boolean;
				var node:KDNode, sibling:KDNode, key:Array, keyVal:Number, dimension:int, location:Number;
				// traverse the tree
				// begin by putting the root node on the stack
				var stackPos:int = 0;
				nodeStack[0] = rootNode;
				// loop until the stack is empty
				while (stackPos >= 0)
				{
					// pop a node off the stack (and clean up pointer)
					node = nodeStack[stackPos];
					nodeStack[stackPos] = null;
					stackPos--;
					
					key = node.key;
					dimension = node.splitDimension;
					location = node.location;
					
					if (node.object != null && !map_ignore.has(node.object)) // only append non-null objects to queryResult
					{
						// see if this node falls within query range
						inRange = true;
						for (i = 0; i < dimensionality; i++)
						{
							keyVal = key[i];
							if (boundaryInclusive == true)
							{
								if (keyVal < minKey[i] || keyVal > maxKey[i]) // false if keyVal is NaN
								{
									inRange = false; // no hit if key out of range
									break;
								}
							}
							else
							{
								if (keyVal <= minKey[i] || keyVal >= maxKey[i]) // false if keyVal is NaN
								{
									inRange = false; // no hit if key out of range
									break;
								}								
							}
						}
						// if this node is in range, append associated object to query results
						if (inRange)
						{
							// if sort dimension is specified, add node to query result array
							if (sortDimension >= 0)
							{
								queryResult[resultCount++] = node;
								for each (sibling in node.siblings)
								queryResult[resultCount++] = sibling;
							}
							else // if no sort dimension specified, add object to result array
							{
								queryResult[resultCount++] = node.object;
								for each (sibling in node.siblings)
								queryResult[resultCount++] = sibling.object;
							}
							// avoid adding the object to the result more than once
							map_ignore.set(node.object, true);
						}
					}
					
					// traverse left as long as there may be results on the left side of the splitting plane
					if (node.left != null && !(minKey[dimension] > location)) // if location is NaN, '>' comparison is false
					{
						// push left child node on the stack
						nodeStack[++stackPos] = node.left;
					}
					
					// traverse right as long as there may be results on the right side of the splitting plane
					if (node.right != null && !(maxKey[dimension] < location)) // if location is NaN, '<' comparison is false
					{
						// push right child node on the stack
						nodeStack[++stackPos] = node.right;
					}
				}
			}
			queryResult.length = resultCount;
			// if sort dimension is specified, sort queryResult and replace nodes with objects
			// otherwise, queryResult is already an array of objects
			if (sortDimension >= 0)
			{
				KDTree.compareNodesSortDimension = sortDimension;
				KDTree.compareNodesDescending = sortDirection == DESCENDING;
				StandardLib.sortOn(queryResult, getNodeSortValue, compareNodesDescending ? -1 : 1);
				
				// replace nodes with objects in queryResult
				i = resultCount;
				while (i--)
					queryResult[i] = (queryResult[i] as KDNode).object;
			}
			return queryResult;
		}
		
		/**
		 * This function is used to sort the results of queryRange().
		 */
		private static function getNodeSortValue(node:KDNode/*/<T>/*/):Number
		{
			return node.key[compareNodesSortDimension];
		}
		private static function compareNodes(node1:KDNode/*/<T>/*/, node2:KDNode/*/<T>/*/):int
		{
			var result:int = StandardLib.numericCompare(
				node1.key[compareNodesSortDimension],
				node2.key[compareNodesSortDimension]
			);
			return compareNodesDescending ? -result : result;
		}
		private static var compareNodesSortDimension:int = 0;
		private static var compareNodesDescending:Boolean = false;
		
		
		/**
		 * This array contains nodes no longer in use.
		 */
		private static const unusedNodes:Array = [];
		/**
		 * This function is used to save old nodes for later use.
		 * @param node The node to save for later.
		 */		
		private static function saveUnusedNode(node:KDNode/*/<T>/*/):void
		{
			for each (var sibling:KDNode in node.siblings)
			saveUnusedNode(sibling);
			// clear all pointers stored in node
			node.object = null;
			node.left = null;
			node.right = null;
			if (node.siblings)
				node.siblings.length = 0;
			// save node
			unusedNodes.push(node);
		}
		/**
		 * This function uses object pooling to get an instance of KDNode.
		 * @return Either a previously saved unused node, or a new node.
		 */
		private static function getUnusedNode(key:Array/*/<number>/*/, object:/*/T/*/Object, splitDimension:int = 0):KDNode/*/<T>/*/
		{
			var node:KDNode;
			// if no more unused nodes left, return new node
			if (unusedNodes.length == 0)
				node = new KDNode();
			else // get last unused node and remove from unusedNodes array
				node = unusedNodes.pop() as KDNode;
			// initialize node
			var i:int = node.key.length = key.length;
			while (i--)
				node.key[i] = key[i];
			node.object = object;
			node.clearChildrenAndSetSplitDimension(splitDimension);
			return node;
		}
	}
}
