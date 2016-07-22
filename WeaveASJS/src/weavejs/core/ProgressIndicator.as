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
	import weavejs.WeaveAPI;
	import weavejs.api.core.ICallbackCollection;
	import weavejs.api.core.ILinkableObject;
	import weavejs.api.core.IProgressIndicator;
	import weavejs.util.DebugUtils;
	import weavejs.util.JS;
	import weavejs.util.WeavePromise;

	public class ProgressIndicator implements IProgressIndicator
	{
		/**
		 * For debugging, returns debugIds for active tasks.
		 */
		public function debugTasks():Array
		{
			var result:Array = [];
			var tasks:Array = JS.mapKeys(map_task_progress);
			for each (var task:Object in tasks)
				result.push(DebugUtils.debugId(task));
			return result;
		}
		public function getDescriptions():Array/*/<[any, number, string]>/*/
		{
			var result:Array = [];
			var tasks:Array = JS.mapKeys(map_task_progress);
			for each (var task:Object in tasks)
			{
				var desc:String = map_task_description.get(task) || "Unnamed task";
				if (desc)
					result.push([task, map_task_progress.get(task), desc]);
			}
			return result;
		}
		
		public function getTaskCount():int
		{
			return _taskCount;
		}

		public function addTask(taskToken:Object, busyObject:ILinkableObject = null, description:String = null):void
		{
			var cc:ICallbackCollection = Weave.getCallbacks(this);
			cc.delayCallbacks();
			
			var isNewTask:Boolean = !map_task_progress.has(taskToken);
			
			map_task_description.set(taskToken, description);
			
			// add task before WeaveAPI.SessionManager.assignBusyTask()
			updateTask(taskToken, NaN); // NaN is used as a special case when adding the task
			
			if (isNewTask && WeavePromise.isThenable(taskToken))
			{
				var remove:Function = removeTask.bind(this, taskToken);
				taskToken.then(remove, remove);
			}
			
			if (busyObject)
				WeaveAPI.SessionManager.assignBusyTask(taskToken, busyObject);
			
			cc.resumeCallbacks();
		}
		
		public function hasTask(taskToken:Object):Boolean
		{
			return map_task_progress.has(taskToken);
		}
		
		public function updateTask(taskToken:Object, progress:Number):void
		{
			// if this token isn't in the Dictionary yet, increase count
			if (!map_task_progress.has(taskToken))
			{
				// expecting NaN from addTask()
				if (!isNaN(progress))
					throw new Error("updateTask() called, but task was not previously added with addTask()");
				if (WeaveAPI.debugAsyncStack)
					map_task_stackTrace.set(taskToken, new Error("Stack trace"));
				
				// increase count when new task is added
				_taskCount++;
				_maxTaskCount++;
			}
			
			if (map_task_progress.get(taskToken) !== progress)
			{
				map_task_progress.set(taskToken, progress);
				Weave.getCallbacks(this).triggerCallbacks();
			}
		}
		
		public function removeTask(taskToken:Object):void
		{
			// if the token isn't in the dictionary, do nothing
			if (!map_task_progress.has(taskToken))
				return;

			var stackTrace:String = map_task_stackTrace.get(taskToken); // check this when debugging
			
			map_task_progress['delete'](taskToken);
			map_task_description['delete'](taskToken);
			map_task_stackTrace['delete'](taskToken);
			_taskCount--;
			// reset max count when count drops to 1
			if (_taskCount == 1)
				_maxTaskCount = _taskCount;
			
			WeaveAPI.SessionManager.unassignBusyTask(taskToken);

			Weave.getCallbacks(this).triggerCallbacks();
		}
		
		public function getNormalizedProgress():Number
		{
			// add up the percentages
			var sum:Number = 0;
			var tasks:Array = JS.mapKeys(map_task_progress);
			for each (var task:Object in tasks)
			{
				var stackTrace:String = map_task_stackTrace.get(task); // check this when debugging
				var progress:Number = map_task_progress.get(task);
				if (isFinite(progress))
					sum += progress;
			}
			// make any pending requests that no longer exist count as 100% done
			sum += _maxTaskCount - _taskCount;
			// divide by the max count to get overall percentage
			if (sum)
				return sum / _maxTaskCount;
			return _taskCount ? 0 : 1;
		}

		private var _taskCount:int = 0;
		private var _maxTaskCount:int = 1;
		private var map_task_progress:Object = new JS.Map();
		private var map_task_description:Object = new JS.Map();
		private var map_task_stackTrace:Object = new JS.Map();
		
		public function test():void
		{
			var tasks:Array = JS.mapKeys(map_task_progress);
			for each (var task:Object in tasks)
			{
				var stackTrace:String = map_task_stackTrace.get(task); // check this when debugging
				var description:String = map_task_description.get(task);
				JS.log(DebugUtils.debugId(task), description, stackTrace);
			}
		}
	}
}
