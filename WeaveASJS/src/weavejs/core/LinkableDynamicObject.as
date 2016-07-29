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

package weavejs.core
{
	import weavejs.api.core.DynamicState;
	import weavejs.api.core.ICallbackCollection;
	import weavejs.api.core.ILinkableDynamicObject;
	import weavejs.api.core.ILinkableHashMap;
	import weavejs.api.core.ILinkableObject;

	/**
	 * This object links to an internal ILinkableObject.
	 * The internal object can be either a local one or a global one identified by a global name.
	 * 
	 * @author adufilie
	 */
	public class LinkableDynamicObject extends LinkableWatcher implements ILinkableDynamicObject, ICallbackCollection
	{
		/**
		 * @param typeRestriction If specified, this will limit the type of objects that can be added to this LinkableHashMap.
		 */
		public function LinkableDynamicObject(typeRestriction:Class = null)
		{
			super(typeRestriction);
		}
		
		// the callback collection for this object
		private var cc:CallbackCollection = Weave.disposableChild(this, CallbackCollection);
		
		// when this is true, the linked object cannot be changed
		private var _locked:Boolean = false;
		
		private static const ARRAY_CLASS_NAME:String = 'Array';
		
		public function get internalObject():ILinkableObject
		{
			return target;
		}
		
		public function getSessionState():Array
		{
			var obj:Object = targetPath || target;
			if (!obj)
				return [];
			
			var className:String = Weave.className(LinkablePlaceholder.getClass(obj));
			var sessionState:Object = obj as Array || Weave.getState(obj as ILinkableObject);
			return [DynamicState.create(null, className, sessionState)];
		}
		
		public function setSessionState(newState:Array, removeMissingDynamicObjects:Boolean):void
		{
			// special case - no change
			if (newState == null)
				return;
			
			try
			{
				// make sure callbacks only run once
				cc.delayCallbacks();
				
				// stop if there are no items
				if (!newState.length)
				{
					if (removeMissingDynamicObjects)
						target = null;
					return;
				}
				
				// if it's not a dynamic state array, treat it as a path
				if (!DynamicState.isDynamicStateArray(newState, true))
				{
					targetPath = newState;
					return;
				}
				
				// if there is more than one item, it's in a deprecated format
				if (newState.length > 1)
				{
					handleDeprecatedSessionState(newState, removeMissingDynamicObjects);
					return;
				}
				
				var dynamicState:Object = newState[0];
				var className:String = dynamicState[DynamicState.CLASS_NAME];
				var objectName:String = dynamicState[DynamicState.OBJECT_NAME];
				var sessionState:Object = dynamicState[DynamicState.SESSION_STATE];
				
				// backwards compatibility
				if (className == 'weave.core::GlobalObjectReference' || className == 'GlobalObjectReference')
				{
					className = ARRAY_CLASS_NAME;
					sessionState = [objectName];
				}
				
				if (className == ARRAY_CLASS_NAME || (!className && targetPath))
					targetPath = sessionState as Array;
				else if (className == SessionManager.DIFF_DELETE)
					target = null;
				else
				{
					var prevTarget:ILinkableObject = target;
					var classDef:Class = Weave.getDefinition(className);
					// if className is not specified, make no change unless removeMissingDynamicObjects is true
					if (className || removeMissingDynamicObjects)
						setLocalObjectType(classDef);
					
					var targetClassDef:Class = LinkablePlaceholder.getClass(target);
					
					if ((!className && target) || (classDef && (targetClassDef === classDef || targetClassDef.prototype is classDef)))
						Weave.setState(target, sessionState, prevTarget != target || removeMissingDynamicObjects);
				}
			}
			finally
			{
				// allow callbacks to run once now
				cc.resumeCallbacks();
			}
		}
		
		override public function set target(newTarget:ILinkableObject):void
		{
			if (_locked || this.target === newTarget)
				return;
			
			if (!newTarget)
			{
				super.target = null;
				return;
			}
			
			cc.delayCallbacks();
			
			// if the target can be found by a path, use the path
			var path:Array = Weave.findPath(Weave.getRoot(this), newTarget);
			if (path)
			{
				targetPath = path;
			}
			else
			{
				// it's ok to assign a local object that we own or that doesn't have an owner yet
				// otherwise, unset the target
				var owner:ILinkableObject = Weave.getOwner(newTarget);
				if (owner === this || !owner)
					super.target = newTarget;
				else
					super.target = null;
			}
			
			cc.resumeCallbacks();
		}
		
		override protected function internalSetTarget(newTarget:ILinkableObject):void
		{
			// don't allow recursive linking
			if (newTarget === this || Weave.getDescendants(newTarget, LinkableDynamicObject).indexOf(this) >= 0)
				newTarget = null;
			
			super.internalSetTarget(newTarget);
		}
		
		override public function set targetPath(path:Array/*/<string|number>/*/):void
		{
			if (_locked)
				return;
			super.targetPath = path;
		}
		
		private function setLocalObjectType(classDef:Class):void
		{
			// stop if locked
			if (_locked)
				return;
			
			cc.delayCallbacks();
			
			targetPath = null;
			
			if ( Weave.isLinkable(classDef) && (_typeRestriction == null || classDef === _typeRestriction || classDef.prototype is _typeRestriction) )
			{
				if (classDef != LinkablePlaceholder.getClass(target))
				{
					if (Weave.isAsyncClass(classDef))
						super.target = new LinkablePlaceholder(classDef);
					else
						super.target = new classDef();
				}
			}
			else
			{
				super.target = null;
			}
			
			cc.resumeCallbacks();
		}
		
		public function requestLocalObject(objectType:Class, lockObject:Boolean = false):*
		{
			if (objectType is String)
				objectType = Weave.getDefinition(String(objectType), true);
			
			cc.delayCallbacks();
			
			if (objectType)
				setLocalObjectType(objectType);
			else
				target = null;
			
			if (lockObject)
				_locked = true;
			
			cc.resumeCallbacks();
			
			if (objectType)
				return target as objectType;
			return target;
		}
		
		public function requestGlobalObject(name:String, objectType:Class, lockObject:Boolean = false):*
		{
			if (objectType is String)
				objectType = Weave.getDefinition(String(objectType), true);
			
			if (!name)
				return requestLocalObject(objectType, lockObject);
			
			if (!_locked)
			{
				cc.delayCallbacks();
				
				targetPath = [name];
				Weave.getRoot(this).requestObject(name, objectType, lockObject);
				if (lockObject)
					_locked = true;
				
				cc.resumeCallbacks();
			}
			
			if (objectType)
				return target as objectType;
			return target;
		}
		
		public function requestLocalObjectCopy(objectToCopy:ILinkableObject):void
		{
			cc.delayCallbacks(); // make sure callbacks only trigger once
			var classDef:Class = LinkablePlaceholder.getClass(objectToCopy);
			var object:ILinkableObject = requestLocalObject(classDef, false);
			if (object != null && objectToCopy != null)
				Weave.copyState(objectToCopy, object);
			cc.resumeCallbacks();
		}
		
		/**
		 * This is the name of the linked global object, or null if the internal object is local.
		 */
		public function get globalName():String
		{
			if (_targetPath && _targetPath.length == 1)
				return _targetPath[0];
			return null;
		}

		/**
		 * This function will change the internalObject if the new globalName is different, unless this object is locked.
		 * If a new global name is given, the session state of the new global object will take precedence.
		 * @param newGlobalName This is the name of the global object to link to, or null to unlink from the current global object.
		 */
		public function set globalName(newGlobalName:String):void
		{
			if (_locked)
				return;
			
			// change empty string to null
			if (!newGlobalName)
				newGlobalName = null;
			
			var oldGlobalName:String = globalName;
			if (oldGlobalName == newGlobalName)
				return;
			
			cc.delayCallbacks();
			
			if (newGlobalName == null)
			{
				// unlink from global object and copy session state into a local object
				requestLocalObjectCopy(internalObject);
			}
			else
			{
				// when switching from a local object to a global one that doesn't exist yet, copy the local object
				var root:ILinkableHashMap = Weave.getRoot(this);
				if (target && !targetPath && !root.getObject(newGlobalName))
					root.requestObjectCopy(newGlobalName, internalObject);
				
				// link to new global name
				targetPath = [newGlobalName];
			}
			
			cc.resumeCallbacks();
		}

		/**
		 * Handles backwards compatibility.
		 * @param newState An Array with two or more items.
		 * @param removeMissingDynamicObjects true when applying an absolute session state, false if applying a diff
		 * @return An Array with one item.
		 */
		private function handleDeprecatedSessionState(newState:Array, removeMissingDynamicObjects:Boolean):void
		{
			// Loop backwards because when diffs are combined, most recent entries
			// are added last and we want to use the most recently applied diff.
			var i:int = newState.length;
			while (i--)
			{
				var item:Object = newState[i];
				
				// handle item as a global Array
				if (item is String)
					item = DynamicState.create(null, ARRAY_CLASS_NAME, [item]);
				
				// stop if it's not a typed state
				if (!DynamicState.isDynamicState(item))
					break;
				
				if (item[DynamicState.CLASS_NAME] == SessionManager.DIFF_DELETE)
				{
					// remove object if name matches
					if (globalName == (item[DynamicState.OBJECT_NAME] || null)) // convert empty string to null
						target = null;
				}
				else
				{
					// use the first item we see that isn't a deleted object
					setSessionState([item], removeMissingDynamicObjects);
					return;
				}
			}
			if (removeMissingDynamicObjects)
				target = null;
		}
		
		public function lock():void
		{
			_locked = true;
		}
		
		public function get locked():Boolean
		{
			return _locked;
		}

		public function removeObject():void
		{
			if (!_locked)
				super.target = null;
		}
		
		override public function dispose():void
		{
			// explicitly dispose the CallbackCollection before anything else
			cc.dispose();
			super.dispose();
		}
		
		////////////////////////////////////////////////////////////////////////
		// ICallbackCollection interface included for backwards compatibility
		public function addImmediateCallback(relevantContext:Object, callback:Function, runCallbackNow:Boolean = false, alwaysCallLast:Boolean = false):void { cc.addImmediateCallback(relevantContext, callback, runCallbackNow, alwaysCallLast); }
		public function addGroupedCallback(relevantContext:Object, groupedCallback:Function, triggerCallbackNow:Boolean = false, delayWhileBusy:Boolean = true):void { cc.addGroupedCallback(relevantContext, groupedCallback, triggerCallbackNow, delayWhileBusy); }
		public function addDisposeCallback(relevantContext:Object, callback:Function, allowDelay:Boolean = false):void { cc.addDisposeCallback(relevantContext, callback, allowDelay); }
		public function removeCallback(relevantContext:Object, callback:Function):void { cc.removeCallback(relevantContext, callback); }
		public function get triggerCounter():uint { return cc.triggerCounter; }
		public function triggerCallbacks():void { cc.triggerCallbacks(); }
		public function get callbacksAreDelayed():Boolean { return cc.callbacksAreDelayed; }
		public function delayCallbacks():void { cc.delayCallbacks(); }
		public function resumeCallbacks():void { cc.resumeCallbacks(); }
	}
}
