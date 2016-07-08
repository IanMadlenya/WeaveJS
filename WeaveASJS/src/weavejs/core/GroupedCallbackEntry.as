/*
	This Source Code Form is subject to the terms of the
	Mozilla Public License, v. 2.0. If a copy of the MPL
	was not distributed with this file, You can obtain
	one at https://mozilla.org/MPL/2.0/.
*/
package weavejs.core
{
	import weavejs.WeaveAPI;
	import weavejs.api.core.ICallbackCollection;
	import weavejs.util.Dictionary2D;

	/**
	 * @private
	 */
	internal class GroupedCallbackEntry extends CallbackEntry
	{
		public static function addGroupedCallback(callbackCollection:ICallbackCollection, relevantContext:Object, groupedCallback:Function, triggerCallbackNow:Boolean, delayWhileBusy:Boolean):void
		{
			if (!relevantContext)
				relevantContext = CONTEXT_PLACEHOLDER;
			
			// make sure the actual function is not already added as a callback.
			callbackCollection.removeCallback(relevantContext, groupedCallback);
			
			// get (or create) the shared entry for the groupedCallback
			var entry:GroupedCallbackEntry = d2d_context_callback_entry.get(relevantContext, groupedCallback);
			if (!entry)
			{
				entry = new GroupedCallbackEntry(relevantContext, groupedCallback);
				d2d_context_callback_entry.set(relevantContext, groupedCallback, entry);
			}
			
			// add this callbackCollection to the list of targets
			entry.targets.push(callbackCollection);
			
			// once delayWhileBusy is set to true, don't set it to false
			if (delayWhileBusy)
				entry.delayWhileBusy = true;
			
			// add the trigger function as a callback
			callbackCollection.addImmediateCallback(relevantContext, entry.trigger, triggerCallbackNow);
		}
		
		public static function removeGroupedCallback(callbackCollection:ICallbackCollection, relevantContext:Object, groupedCallback:Function):void
		{
			if (!relevantContext)
				relevantContext = CONTEXT_PLACEHOLDER;
			
			var entry:GroupedCallbackEntry = d2d_context_callback_entry.get(relevantContext, groupedCallback);
			if (entry)
			{
				// remove the trigger function as a callback
				callbackCollection.removeCallback(relevantContext, entry.trigger);
				
				// remove the callbackCollection from the list of targets
				var index:int = entry.targets.indexOf(callbackCollection);
				if (index >= 0)
				{
					entry.targets.splice(index, 1);
					if (entry.targets.length == 0)
					{
						// when there are no more targets, remove the entry
						d2d_context_callback_entry.remove(relevantContext, groupedCallback);
					}
				}
			}
		}
		
		/**
		 * This function gets called once per frame and allows grouped callbacks to run.
		 */
		private static function _handleGroupedCallbacks():void
		{
			var i:int;
			var entry:GroupedCallbackEntry;
		
			// Handle grouped callbacks in the order they were triggered,
			// anticipating that more may be added to the end of the list in the process.
			for (i = 0; i < _triggeredEntries.length; i++)
			{
				entry = _triggeredEntries[i];
				entry.handleGroupedCallback();
			}
			
			// reset triggered entries for next frame
			for each (entry in _triggeredEntries)
				entry.handled = entry.triggered = entry.triggeredAgain = false;
			_triggeredEntries.length = 0;
		}
		
		/**
		 * Used as a placeholder for a missing context because null cannot be used as a WeakMap key.
		 */
		private static const CONTEXT_PLACEHOLDER:Object = {};
		
		/**
		 * This gets set to true when the static _handleGroupedCallbacks() callback has been added as a frame listener.
		 */
		private static var _initialized:Boolean = false;
		
		/**
		 * This maps a groupedCallback function to its corresponding GroupedCallbackEntry.
		 */
		private static const d2d_context_callback_entry:Dictionary2D = new Dictionary2D(true, true);
		
		/**
		 * This is a list of GroupedCallbackEntry objects in the order they were triggered.
		 */		
		private static const _triggeredEntries:Array = [];
		
		/**
		 * Constructor
		 */
		public function GroupedCallbackEntry(context:Object, groupedCallback:Function)
		{
			// context will be an array of contexts
			super(context, groupedCallback);
			
			if (!_initialized)
			{
				_initialized = true;
				WeaveAPI.Scheduler.frameCallbacks.addImmediateCallback(null, _handleGroupedCallbacks);
			}
		}
		
		/**
		 * If true, the callback was handled this frame.
		 */
		public var handled:Boolean = false;
				
		/**
		 * If true, the callback was triggered this frame.
		 */
		public var triggered:Boolean = false;
		
		/**
		 * If true, the callback was triggered again from another grouped callback.
		 */
		public var triggeredAgain:Boolean = false;
		
		/**
		 * Specifies whether to delay the callback while the contexts are busy.
		 */
		public var delayWhileBusy:Boolean = false;
		
		/**
		 * An Array of ICallbackCollections to which the callback was added.
		 */
		public var targets:Array = [];
		
		/**
		 * Marks the entry to be handled later (unless already triggered this frame).
		 * This also takes care of preventing recursion.
		 */
		public function trigger():void
		{
			if (!triggered)
			{
				// not previously triggered
				_triggeredEntries.push(this);
				triggered = true;
			}
			else if (handled && !triggeredAgain)
			{
				// triggered again after being handled
				_triggeredEntries.push(this);
				triggeredAgain = true;
			}
		}
		
		/**
		 * Checks the context and targets before calling groupedCallback
		 */
		public function handleGroupedCallback():void
		{
			if (!callback)
			{
				Weave.dispose(this);
				return;
			}
			
			for (var i:int = 0; i < targets.length; i++)
			{
				var target:ICallbackCollection = targets[i];
				if (WeaveAPI.SessionManager.objectWasDisposed(target))
					targets.splice(i--, 1);
				else if (delayWhileBusy && WeaveAPI.SessionManager.linkableObjectIsBusy(target))
					return;
			}
			
			// if there are no more relevant contexts for this callback, don't run it.
			if (targets.length == 0)
			{
				dispose();
				d2d_context_callback_entry.remove(context, callback);
				return;
			}
			
			// avoid immediate recursion
			if (recursionCount == 0)
			{
				recursionCount++;
				
				callback.apply(context === CONTEXT_PLACEHOLDER ? callback['this'] : context);
				handled = true;
				
				recursionCount--;
			}
		}
		
		override public function dispose():void
		{
			for each (var target:ICallbackCollection in targets)
				removeGroupedCallback(target, context, callback);
			super.dispose();
		}
	}
}
