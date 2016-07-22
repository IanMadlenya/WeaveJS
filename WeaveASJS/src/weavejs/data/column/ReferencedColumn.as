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
	import weavejs.api.core.ILinkableHashMap;
	import weavejs.api.data.IAttributeColumn;
	import weavejs.api.data.IColumnReference;
	import weavejs.api.data.IColumnWrapper;
	import weavejs.api.data.IDataSource;
	import weavejs.api.data.IQualifiedKey;
	import weavejs.api.data.IWeaveTreeNode;
	import weavejs.core.CallbackCollection;
	import weavejs.core.LinkableString;
	import weavejs.core.LinkableVariable;
	import weavejs.core.LinkableWatcher;
	import weavejs.data.hierarchy.GlobalColumnDataSource;
	
	/**
	 * This provides a wrapper for a referenced column.
	 * 
	 * @author adufilie
	 */
	public class ReferencedColumn extends CallbackCollection implements IColumnWrapper
	{
		public function ReferencedColumn()
		{
			super();
		}
		
		private var _initialized:Boolean = false;
		
		private var _dataSource:IDataSource;
		
		private function updateDataSource():void
		{
			var root:ILinkableHashMap = Weave.getRoot(this);
			if (!root)
				return;
			
			if (!_initialized)
			{
				root.childListCallbacks.addImmediateCallback(this, updateDataSource);
				_initialized = true;
			}
			
			var ds:IDataSource = root.getObject(dataSourceName.value) as IDataSource;
			if (!ds)
				ds = GlobalColumnDataSource.getInstance(root);
			if (_dataSource != ds)
			{
				_dataSource = ds;
				triggerCallbacks();
			}
		}
		
		/**
		 * This is the name of an IDataSource in the top level session state.
		 */
		public const dataSourceName:LinkableString = Weave.linkableChild(this, LinkableString, updateDataSource);
		
		/**
		 * This holds the metadata used to identify a column.
		 */
		public const metadata:LinkableVariable = Weave.linkableChild(this, LinkableVariable);
		
		public function getDataSource():IDataSource
		{
			return _dataSource;
		}
		
		public function getHierarchyNode():/*/IWeaveTreeNode & IColumnReference/*/IWeaveTreeNode
		{
			IColumnReference; // make sure this is imported for TypeScript typing
			
			if (!_dataSource)
				return null;
			
			var meta:Object = metadata.getSessionState();
			return _dataSource.findHierarchyNode(meta);
		}
		
		/**
		 * Updates the session state to refer to a new column.
		 */
		public function setColumnReference(dataSource:IDataSource, metadata:Object):void
		{
			delayCallbacks();
			var root:ILinkableHashMap = Weave.getRoot(this);
			if (!root)
				throw new Error("ReferencedColumn is not registered with an instance of Weave");
			dataSourceName.value = root.getName(dataSource);
			this.metadata.setSessionState(metadata);
			resumeCallbacks();
		}
		
		public static function generateReferencedColumnStateFromColumnReference(ref:IColumnReference):Object
		{
			var dataSource:IDataSource = ref.getDataSource();
			var root:ILinkableHashMap = Weave.getRoot(dataSource);
			var name:String = root ? root.getName(dataSource) : null;
			return {
				"dataSourceName": name,
				"metadata": ref.getColumnMetadata()
			};
		}
		
		/**
		 * The trigger counter value at the last time the internal column was retrieved.
		 */		
		private var _prevTriggerCounter:uint = 0;
		/**
		 * the internal referenced column
		 */
		private var _internalColumn:IAttributeColumn = null;
		
		private var _columnWatcher:LinkableWatcher = Weave.linkableChild(this, LinkableWatcher);
		
		public function getInternalColumn():IAttributeColumn
		{
			if (_prevTriggerCounter != triggerCounter)
			{
				if (Weave.wasDisposed(_dataSource))
					_dataSource = null;
				
				_columnWatcher.target = _internalColumn = WeaveAPI.AttributeColumnCache.getColumn(_dataSource, metadata.state);
				
				_prevTriggerCounter = triggerCounter;
			}
			return _internalColumn;
		}
		
		
		/************************************
		 * Begin IAttributeColumn interface
		 ************************************/

		public function getMetadata(attributeName:String):String
		{
			if (_prevTriggerCounter != triggerCounter)
				getInternalColumn();
			return _internalColumn ? _internalColumn.getMetadata(attributeName) : null;
		}

		public function getMetadataPropertyNames():Array
		{
			if (_prevTriggerCounter != triggerCounter)
				getInternalColumn();
			return _internalColumn ? _internalColumn.getMetadataPropertyNames() : [];
		}
		
		/**
		 * @return the keys associated with this column.
		 */
		public function get keys():Array
		{
			if (_prevTriggerCounter != triggerCounter)
				getInternalColumn();
			return _internalColumn ? _internalColumn.keys : [];
		}

		/**
		 * @param key A key to test.
		 * @return true if the key exists in this IKeySet.
		 */
		public function containsKey(key:IQualifiedKey):Boolean
		{
			if (_prevTriggerCounter != triggerCounter)
				getInternalColumn();
			return _internalColumn && _internalColumn.containsKey(key);
		}
		
		/**
		 * getValueFromKey
		 * @param key A key of the type specified by keyType.
		 * @return The value associated with the given key.
		 */
		public function getValueFromKey(key:IQualifiedKey, dataType:Class = null):*
		{
			if (_prevTriggerCounter != triggerCounter)
				getInternalColumn();
			return _internalColumn ? _internalColumn.getValueFromKey(key, dataType) : undefined;
		}
	}
}
