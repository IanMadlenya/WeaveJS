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
	import weavejs.api.core.IDisposableObject;
	import weavejs.api.core.ILinkableObject;
	import weavejs.api.core.ILinkableVariable;
	import weavejs.api.core.ISessionManager;
	import weavejs.util.JS;
	import weavejs.util.StandardLib;

	/**
	 * This class saves the session history of an ILinkableObject.
	 * 
	 * @author adufilie
	 */
	public class SessionStateLog implements ILinkableVariable, IDisposableObject
	{
		public static var debug:Boolean = false;
		public static var enableHistoryRewrite:Boolean = true; // should be set to true except for debugging
		
		public function SessionStateLog(subject:ILinkableObject, syncDelay:uint = 0)
		{
			_syncTime = JS.now();
			_undoHistory = [];
			_redoHistory = [];
			
			_subject = subject;
			_syncDelay = syncDelay;
			_prevState = JS.copyObject(WeaveAPI.SessionManager.getSessionState(_subject)); // remember the initial state
			WeaveAPI.SessionManager.registerDisposableChild(_subject, this); // make sure this is disposed when _subject is disposed
			
			var cc:ICallbackCollection = WeaveAPI.SessionManager.getCallbackCollection(_subject);
			cc.addImmediateCallback(this, immediateCallback);
			cc.addGroupedCallback(this, groupedCallback);
		}
		
		public function dispose():void
		{
			if (_undoHistory == null)
				throw new Error("SessionStateLog.dispose() called more than once");
			
			_subject = null;
			_undoHistory = null;
			_redoHistory = null;
		}
		
		private var _subject:ILinkableObject; // the object we are monitoring
		private var _syncDelay:uint; // the number of milliseconds to wait before automatically synchronizing
		private var _prevState:Object = null; // the previously seen session state of the subject
		private var _undoHistory:Array; // diffs that can be undone
		private var _redoHistory:Array; // diffs that can be redone
		private var _nextId:int = 0; // gets incremented each time a new diff is created
		private var _undoActive:Boolean = false; // true while an undo operation is active
		private var _redoActive:Boolean = false; // true while a redo operation is active
		
		private var _syncTime:int; // this is set to getTimer() when synchronization occurs
		private var _triggerDelay:int = -1; // this is set to (getTimer() - _syncTime) when immediate callbacks are triggered for the first time since the last synchronization occurred
		private var _saveTime:uint = 0; // this is set to getTimer() + _syncDelay to determine when the next diff should be computed and logged
		private var _savePending:Boolean = false; // true when a diff should be computed
		
		/**
		 * When this is set to true, changes in the session state of the subject will be automatically logged.
		 */
		public const enableLogging:LinkableBoolean = WeaveAPI.SessionManager.registerLinkableChild(this, new LinkableBoolean(true), synchronizeNow);
		
		/**
		 * This will squash a sequence of undos or redos into a single undo or redo.
		 * @param directionalSquashCount Number of undos (negative) or redos (positive) to squash.
		 */		
		public function squashHistory(directionalSquashCount:int):void
		{
			var sm:ISessionManager = WeaveAPI.SessionManager;
			var cc:ICallbackCollection = sm.getCallbackCollection(this);
			cc.delayCallbacks();
			
			synchronizeNow();

			var count:int = StandardLib.constrain(directionalSquashCount, -_undoHistory.length, _redoHistory.length);
			if (count < -1 || count > 1)
			{
				cc.triggerCallbacks();
				
				var entries:Array;
				if (count < 0)
					entries = _undoHistory.splice(_undoHistory.length + count, -count);
				else
					entries = _redoHistory.splice(0, count);
				
				var entry:LogEntry;
				var squashBackward:Object = null;
				var squashForward:Object = null;
				var totalDuration:int = 0;
				var totalDelay:int = 0;
				var last:int = entries.length - 1;
				for (var i:int = 0; i <= last; i++)
				{
					entry = entries[last - i] as LogEntry;
					squashBackward = sm.combineDiff(squashBackward, entry.backward);
					
					entry = entries[i] as LogEntry;
					squashForward = sm.combineDiff(squashForward, entry.forward);
					
					totalDuration += entry.diffDuration;
					totalDelay += entry.triggerDelay;
				}
				
				entry = new LogEntry(_nextId++, squashForward, squashBackward, totalDelay, totalDuration);
				if (count < 0)
					_undoHistory.push(entry);
				else
					_redoHistory.unshift(entry);
			}
			
			cc.resumeCallbacks();
		}
		
		/**
		 * This will clear all undo and redo history.
		 * @param directional Zero will clear everything. Set this to -1 to clear all undos or 1 to clear all redos.
		 */
		public function clearHistory(directional:int = 0):void
		{
			var cc:ICallbackCollection = WeaveAPI.SessionManager.getCallbackCollection(this);
			cc.delayCallbacks();
			
			synchronizeNow();
			
			if (directional <= 0)
			{
				if (_undoHistory.length > 0)
					cc.triggerCallbacks();
				_undoHistory.length = 0;
			}
			if (directional >= 0)
			{
				if (_redoHistory.length > 0)
					cc.triggerCallbacks();
				_redoHistory.length = 0;
			}
			
			cc.resumeCallbacks();
		}
		
		/**
		 * This gets called as an immediate callback of the subject.
		 */		
		private function immediateCallback():void
		{
			if (!enableLogging.value)
				return;
			
			// we have to wait until grouped callbacks are called before we save the diff
			_saveTime = Number.MAX_VALUE;
			
			// make sure only one call to saveDiff() is pending
			if (!_savePending)
			{
				_savePending = true;
				saveDiff();
			}
			
			if (debug && (_undoActive || _redoActive))
			{
				var state:Object = WeaveAPI.SessionManager.getSessionState(_subject);
				var forwardDiff:* = WeaveAPI.SessionManager.computeDiff(_prevState, state);
				JS.log('immediate diff:', forwardDiff);
			}
		}
		
		/**
		 * This gets called as a grouped callback of the subject.
		 */
		private function groupedCallback():void
		{
			if (!enableLogging.value)
				return;
			
			// Since grouped callbacks are currently running, it means something changed, so make sure the diff is saved.
			immediateCallback();
			// It is ok to save a diff some time after the last time grouped callbacks are called.
			// If callbacks are triggered again before the next frame, the immediateCallback will reset this value.
			_saveTime = JS.now() + _syncDelay;
			
			if (debug && (_undoActive || _redoActive))
			{
				var state:Object = WeaveAPI.SessionManager.getSessionState(_subject);
				var forwardDiff:* = WeaveAPI.SessionManager.computeDiff(_prevState, state);
				JS.log('grouped diff:', forwardDiff);
			}
		}
		
		/**
		 * This will save a diff in the history, if there is any.
		 * @param immediately Set to true if it should be saved immediately, or false if it can wait.
		 */
		private function saveDiff(immediately:Boolean = false):void
		{
			if (!enableLogging.value)
			{
				_savePending = false;
				return;
			}
			
			var currentTime:int = JS.now();
			
			// remember how long it's been since the last synchronization
			if (_triggerDelay < 0)
				_triggerDelay = currentTime - _syncTime;
			
			if (!immediately && JS.now() < _saveTime)
			{
				// we have to wait until the next frame to save the diff because grouped callbacks haven't finished.
				WeaveAPI.Scheduler.callLater(this, saveDiff);
				return;
			}
			
			var sm:ISessionManager = WeaveAPI.SessionManager;
			var cc:ICallbackCollection = sm.getCallbackCollection(this);
			cc.delayCallbacks();
			
			var state:Object = sm.getSessionState(_subject);
			var forwardDiff:* = JS.copyObject(sm.computeDiff(_prevState, state));
			if (forwardDiff !== undefined)
			{
				var diffDuration:int = currentTime - (_syncTime + _triggerDelay);
				var backwardDiff:* = JS.copyObject(sm.computeDiff(state, _prevState));
				var oldEntry:LogEntry;
				var newEntry:LogEntry;
				if (_undoActive)
				{
					// To prevent new undo history from being added as a result of applying an undo, overwrite first redo entry.
					// Keep existing delay/duration.
					oldEntry = _redoHistory[0] as LogEntry;
					newEntry = new LogEntry(_nextId++, backwardDiff, forwardDiff, oldEntry.triggerDelay, oldEntry.diffDuration);
					if (enableHistoryRewrite)
					{
						_redoHistory[0] = newEntry;
					}
					else if (StandardLib.compare(oldEntry.forward, newEntry.forward) != 0)
					{
						_redoHistory.unshift(newEntry);
					}
				}
				else
				{
					newEntry = new LogEntry(_nextId++, forwardDiff, backwardDiff, _triggerDelay, diffDuration);
					if (_redoActive)
					{
						// To prevent new undo history from being added as a result of applying a redo, overwrite last undo entry.
						// Keep existing delay/duration.
						oldEntry = _undoHistory.pop() as LogEntry;
						newEntry.triggerDelay = oldEntry.triggerDelay;
						newEntry.diffDuration = oldEntry.diffDuration;
						
						if (!enableHistoryRewrite && StandardLib.compare(oldEntry.forward, newEntry.forward) == 0)
							newEntry = oldEntry; // keep old entry
					}
					// save new undo entry
					_undoHistory.push(newEntry);
				}
				
				if (debug)
					debugHistory(newEntry);
				
				_syncTime = currentTime; // remember when diff was saved
				cc.triggerCallbacks();
				
				// To avoid unnecessary work, only make a copy of the state if there was a diff.
				// If there was no diff, we don't need to update _prevState.
				_prevState = JS.copyObject(state);
			}
			
			// always reset sync time after undo/redo even if there was no new diff
			if (_undoActive || _redoActive)
				_syncTime = currentTime;
			_undoActive = false;
			_redoActive = false;
			_savePending = false;
			_triggerDelay = -1;
			
			cc.resumeCallbacks();
		}

		/**
		 * This function will save any pending diff in session state.
		 * Use this function only when necessary (for example, when writing a collaboration service that must synchronize).
		 */
		public function synchronizeNow():void
		{
			saveDiff(true);
		}
		
		/**
		 * This will undo a number of steps from the saved history.
		 * @param numberOfSteps The number of steps to undo.
		 */
		public function undo(numberOfSteps:int = 1):void
		{
			applyDiffs(-numberOfSteps);
		}
		
		/**
		 * This will redo a number of steps that have been previously undone.
		 * @param numberOfSteps The number of steps to redo.
		 */
		public function redo(numberOfSteps:int = 1):void
		{
			applyDiffs(numberOfSteps);
		}
		
		/**
		 * This will apply a number of undo or redo steps.
		 * @param delta The number of steps to undo (negative) or redo (positive).
		 */
		private function applyDiffs(delta:int):void
		{
			var stepsRemaining:int = Math.min(Math.abs(delta), delta < 0 ? _undoHistory.length : _redoHistory.length);
			if (stepsRemaining > 0)
			{
				var logEntry:LogEntry;
				var diff:Object;
				var debug:Boolean = SessionStateLog.debug && stepsRemaining == 1;
				
				// if something changed and we're not currently undoing/redoing, save the diff now
				if (_savePending && !_undoActive && !_redoActive)
					synchronizeNow();
				
				var sm:ISessionManager = WeaveAPI.SessionManager;
				var combine:Boolean = stepsRemaining > 2;
				var baseDiff:Object = null;
				sm.getCallbackCollection(_subject).delayCallbacks();
				// when logging is disabled, revert to previous state before applying diffs
				if (!enableLogging.value)
				{
					var state:Object = sm.getSessionState(_subject);
					// baseDiff becomes the change that needs to occur to get back to the previous state
					baseDiff = sm.computeDiff(state, _prevState);
					if (baseDiff != null)
						combine = true;
				}
				while (stepsRemaining-- > 0)
				{
					if (delta < 0)
					{
						logEntry = _undoHistory.pop();
						_redoHistory.unshift(logEntry);
						diff = logEntry.backward;
					}
					else
					{
						logEntry = _redoHistory.shift();
						_undoHistory.push(logEntry);
						diff = logEntry.forward;
					}
					if (debug)
						JS.log('apply', delta < 0 ? 'undo' : 'redo', logEntry.id + ':', diff);
					
					if (stepsRemaining == 0 && enableLogging.value)
					{
						// remember the session state right before applying the last step so we can rewrite the history if necessary
						_prevState = JS.copyObject(sm.getSessionState(_subject));
					}
					
					if (combine)
					{
						baseDiff = sm.combineDiff(baseDiff, diff);
						if (stepsRemaining <= 1)
						{
							sm.setSessionState(_subject, baseDiff, false);
							combine = false;
						}
					}
					else
					{
						sm.setSessionState(_subject, diff, false);
					}
					
					if (debug)
					{
						var newState:Object = sm.getSessionState(_subject);
						var resultDiff:Object = sm.computeDiff(_prevState, newState);
						JS.log('resulting diff:', resultDiff);
					}
				}
				sm.getCallbackCollection(_subject).resumeCallbacks();
				
				_undoActive = delta < 0 && _savePending;
				_redoActive = delta > 0 && _savePending;
				if (!_savePending)
					_prevState = JS.copyObject(sm.getSessionState(_subject));
				sm.getCallbackCollection(this).triggerCallbacks();
			}
		}
		
		/**
		 * @TODO create an interface for the objects in this Array
		 */
		public function get undoHistory():Array
		{
			return _undoHistory;
		}
		
		/**
		 * @TODO create an interface for the objects in this Array
		 */
		public function get redoHistory():Array
		{
			return _redoHistory;
		}

		private function debugHistory(logEntry:LogEntry):void
		{
			var h:Array = _undoHistory.concat();
			for (var i:int = 0; i < h.length; i++)
				h[i] = h[i].id;
			var f:Array = _redoHistory.concat();
			for (i = 0; i < f.length; i++)
				f[i] = f[i].id;
			if (logEntry)
			{
				JS.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
				JS.log('NEW HISTORY (backward) ' + logEntry.id + ':', logEntry.backward);
				JS.log("===============================================================");
				JS.log('NEW HISTORY (forward) ' + logEntry.id + ':', logEntry.forward);
				JS.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
			}
			trace('undo ['+h+']','redo ['+f+']');
		}
		
		/**
		 * This will generate an untyped session state object that contains the session history log.
		 * @return An object containing the session history log.
		 */		
		public function getSessionState():Object
		{
			var cc:ICallbackCollection = WeaveAPI.SessionManager.getCallbackCollection(this);
			cc.delayCallbacks();
			synchronizeNow();
			
			// The "version" property can be used to detect old session state formats and should be incremented whenever the format is changed.
			var state:Object = {
				"version": 0,
				"currentState": _prevState,
				"undoHistory": _undoHistory.concat(),
				"redoHistory": _redoHistory.concat(),
				"nextId": _nextId
				// not including enableLogging
			};
			
			cc.resumeCallbacks();
			return state;
		}
		
		/**
		 * This will load a session state log from an untyped session state object.
		 * @param input The ByteArray containing the output from seralize().
		 */
		public function setSessionState(state:Object):void
		{
			// make sure callbacks only run once while we set the session state
			var cc:ICallbackCollection = WeaveAPI.SessionManager.getCallbackCollection(this);
			cc.delayCallbacks();
			enableLogging.delayCallbacks();
			try
			{
				var version:Number = state.version;
				switch (version)
				{
					case 0:
					{
						// note: some states from version 0 may include enableLogging, but here we ignore it
						
						_prevState = state.currentState;
						_undoHistory = LogEntry.convertGenericObjectsToLogEntries(state.undoHistory, _syncDelay);
						_redoHistory = LogEntry.convertGenericObjectsToLogEntries(state.redoHistory, _syncDelay);
						_nextId = state.nextId;
						
						break;
					}
					default:
						throw new Error("Weave history format version " + version + " is unsupported.");
				}
				
				// reset these flags so nothing unexpected happens in later frames
				_undoActive = false;
				_redoActive = false;
				_savePending = false;
				_saveTime = 0;
				_triggerDelay = -1;
				_syncTime = JS.now();
			
				WeaveAPI.SessionManager.setSessionState(_subject, _prevState);
			}
			finally
			{
				enableLogging.resumeCallbacks();
				cc.triggerCallbacks();
				cc.resumeCallbacks();
			}
		}
	}
}
