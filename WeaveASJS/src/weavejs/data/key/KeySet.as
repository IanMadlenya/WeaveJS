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

package weavejs.data.key
{
	import weavejs.WeaveAPI;
	import weavejs.api.data.IKeySet;
	import weavejs.api.data.IKeySetCallbackInterface;
	import weavejs.api.data.IQualifiedKey;
	import weavejs.core.LinkableVariable;
	import weavejs.util.JS;
	
	/**
	 * This class contains a set of IQualifiedKeys and functions for adding/removing keys from the set.
	 * 
	 * @author adufilie
	 */
	public class KeySet extends LinkableVariable implements IKeySet
	{
		public function KeySet()
		{
			super(Array, verifySessionState);
			// The first callback will update the keys from the session state.
			addImmediateCallback(this, updateKeys);
		}
		
		/**
		 * An interface for keys added and removed
		 */
		public const keyCallbacks:IKeySetCallbackInterface = Weave.linkableChild(this, KeySetCallbackInterface);
		
		/**
		 * Verifies that the value is a two-dimensional array or null.
		 */		
		private function verifySessionState(value:Array):Boolean
		{
			for each (var row:Object in value)
				if (!(row is Array))
					return false;
			return true;
		}
		
		/**
		 * This flag is used to avoid recursion while the keys are being synchronized with the session state.
		 */		
		private var _currentlyUpdating:Boolean = false;

		/**
		 * This is the first callback that runs when the KeySet changes.
		 * The keys will be updated based on the session state.
		 */
		private function updateKeys():void
		{
			// avoid recursion
			if (_currentlyUpdating)
				return;

			// each row of CSV represents a different keyType (keyType is the first token in the row)
			var newKeys:Array = [];
			for each (var row:Array in _sessionStateInternal)
				newKeys.push.apply(newKeys, WeaveAPI.QKeyManager.getQKeys(row[0], row.slice(1)));
			
			// avoid internal recursion while still allowing callbacks to cause recursion afterwards
			delayCallbacks();
			_currentlyUpdating = true;
			replaceKeys(newKeys);
			keyCallbacks.flushKeys();
			_currentlyUpdating = false;
			resumeCallbacks();
		}
		
		/**
		 * This function will derive the session state from the IQualifiedKey objects in the keys array.
		 */		
		private function updateSessionState():void
		{
			// avoid recursion
			if (_currentlyUpdating)
				return;
			
			// from the IQualifiedKey objects, generate the session state
			var _keyTypeToKeysMap:Object = {};
			for each (var key:IQualifiedKey in _keys)
			{
				if (_keyTypeToKeysMap[key.keyType] == undefined)
					_keyTypeToKeysMap[key.keyType] = [];
				(_keyTypeToKeysMap[key.keyType] as Array).push(key.localName);
			}
			// for each keyType, create a row for the CSV parser
			var keyTable:Array = [];
			for (var keyType:String in _keyTypeToKeysMap)
			{
				var newKeys:Array = _keyTypeToKeysMap[keyType];
				newKeys.unshift(keyType);
				keyTable.push(newKeys);
			}
			
			// avoid internal recursion while still allowing callbacks to cause recursion afterwards
			delayCallbacks();
			_currentlyUpdating = true;
			setSessionState(keyTable);
			keyCallbacks.flushKeys();
			_currentlyUpdating = false;
			resumeCallbacks();
		}
		
		/**
		 * This object maps keys to index values
		 */
		private var map_key_index:Object = new JS.Map();
		/**
		 * This maps index values to IQualifiedKey objects
		 */
		private var _keys:Array = new Array();

		/**
		 * A list of keys included in this KeySet.
		 */
		public function get keys():Array/*/<IQualifiedKey>/*/
		{
			return _keys;
		}

		/**
		 * Overwrite the current set of keys.
		 * @param newKeys An Array of IQualifiedKey objects.
		 * @return true if the set changes as a result of calling this function.
		 */
		public function replaceKeys(newKeys:Array/*/<IQualifiedKey>/*/):Boolean
		{
			if (_locked)
				return false;
			
			WeaveAPI.QKeyManager.convertToQKeys(newKeys);
			if (newKeys == _keys)
				_keys = _keys.concat();
			
			var key:Object;
			var changeDetected:Boolean = false;
			
			// copy the previous key-to-index mapping for detecting changes
			var prevKeyIndex:Object = map_key_index;

			// initialize new key index
			map_key_index = new JS.Map();
			// copy new keys and create new key index
			_keys.length = newKeys.length; // allow space for all keys
			var outputIndex:int = 0; // index to store internally
			for (var inputIndex:int = 0; inputIndex < newKeys.length; inputIndex++)
			{
				key = newKeys[inputIndex] as IQualifiedKey;
				// avoid storing duplicate keys
				if (map_key_index.has(key))
					continue;
				// copy key
				_keys[outputIndex] = key;
				// save key-to-index mapping
				map_key_index.set(key, outputIndex);
				// if the previous key index did not have this key, a change has been detected.
				if (prevKeyIndex.get(key) === undefined)
				{
					changeDetected = true;
					keyCallbacks.keysAdded.push(key);
				}
				// increase stored index
				outputIndex++;
			}
			_keys.length = outputIndex; // trim to actual length
			// loop through old keys and see if any were removed
			var oldKeys:Array = JS.mapKeys(prevKeyIndex);
			for each (key in oldKeys)
			{
				if (!map_key_index.has(key)) // if this previous key is gone now, change detected
				{
					changeDetected = true;
					keyCallbacks.keysRemoved.push(key);
				}
			}

			if (changeDetected)
				updateSessionState();
			
			return changeDetected;
		}

		/**
		 * Clear the current set of keys.
		 * @return true if the set changes as a result of calling this function.
		 */
		public function clearKeys():Boolean
		{
			if (_locked)
				return false;
			
			// stop if there are no keys to remove
			if (_keys.length == 0)
				return false; // set did not change
			
			keyCallbacks.keysRemoved = keyCallbacks.keysRemoved.concat(_keys);

			// clear key-to-index mapping
			map_key_index = new JS.Map();
			_keys = [];
			
			updateSessionState();

			// set changed
			return true;
		}

		/**
		 * @param key A IQualifiedKey object to check.
		 * @return true if the given key is included in the set.
		 */
		public function containsKey(key:IQualifiedKey):Boolean
		{
			// the key is included in the set if it is in the key-to-index mapping.
			return map_key_index.has(key);
		}
		
		/**
		 * Adds a vector of additional keys to the set.
		 * @param additionalKeys A list of keys to add to this set.
		 * @return true if the set changes as a result of calling this function.
		 */
		public function addKeys(additionalKeys:Array/*/<IQualifiedKey>/*/):Boolean
		{
			if (_locked)
				return false;
			
			var changeDetected:Boolean = false;
			WeaveAPI.QKeyManager.convertToQKeys(additionalKeys);
			for each (var key:IQualifiedKey in additionalKeys)
			{
				if (!map_key_index.has(key))
				{
					// add key
					var newIndex:int = _keys.length;
					_keys[newIndex] = key;
					map_key_index.set(key, newIndex);
					
					changeDetected = true;
					keyCallbacks.keysAdded.push(key);
				}
			}
			
			if (changeDetected)
				updateSessionState();

			return changeDetected;
		}

		/**
		 * Removes a vector of additional keys to the set.
		 * @param unwantedKeys A list of keys to remove from this set.
		 * @return true if the set changes as a result of calling this function.
		 */
		public function removeKeys(unwantedKeys:Array/*/<IQualifiedKey>/*/):Boolean
		{
			if (_locked)
				return false;
			
			if (unwantedKeys == _keys)
				return clearKeys();
			
			var changeDetected:Boolean = false;
			WeaveAPI.QKeyManager.convertToQKeys(unwantedKeys);
			for each (var key:IQualifiedKey in unwantedKeys)
			{
				if (map_key_index.has(key))
				{
					// drop key from _keys vector
					var droppedIndex:int = map_key_index.get(key);
					if (droppedIndex < _keys.length - 1) // if this is not the last entry
					{
						// move the last entry to the droppedIndex slot
						var lastKey:IQualifiedKey = _keys[keys.length - 1] as IQualifiedKey;
						_keys[droppedIndex] = lastKey;
						map_key_index.set(lastKey, droppedIndex);
					}
					// update length of vector
					_keys.length--;
					// drop key from object mapping
					map_key_index['delete'](key);

					changeDetected = true;
					keyCallbacks.keysRemoved.push(key);
				}
			}

			if (changeDetected)
				updateSessionState();

			return changeDetected;
		}

		/**
		 * This function sets the session state for the KeySet.
		 * @param value A CSV-formatted String where each row is a keyType followed by a list of key strings of that keyType.
		 */
		override public function setSessionState(value:Object):void
		{
			// backwards compatibility 0.9.6
			if (!(value is String) && !(value is Array) && value != null)
			{
				var keysProperty:String = 'sessionedKeys';
				var keyTypeProperty:String = 'sessionedKeyType';
				if (value.hasOwnProperty(keysProperty) && value.hasOwnProperty(keyTypeProperty))
					if (value[keyTypeProperty] != null && value[keysProperty] != null)
						value = WeaveAPI.CSVParser.createCSVRow([value[keyTypeProperty]]) + ',' + value[keysProperty];
			}
			// backwards compatibility -- parse CSV String
			if (value is String)
				value = WeaveAPI.CSVParser.parseCSV(value as String);
			
			// expecting a two-dimensional Array at this point
			super.setSessionState(value);
		}
		
		//---------------------------------------------------------------------------------
		// test code
		// { test(); }
		private static function test():void
		{
			var k:KeySet = new KeySet();
			var k2:KeySet = new KeySet();
			k.addImmediateCallback(null, function():void { traceKeySet(k); });
			
			testFunction(k, k.replaceKeys, 'create k', 't', ['a','b','c'], 't', ['a', 'b', 'c']);
			testFunction(k, k.addKeys, 'add', 't', ['b','c','d','e'], 't', ['a','b','c','d','e']);
			testFunction(k, k.removeKeys, 'remove', 't', ['d','e','f','g'], 't', ['a','b','c']);
			testFunction(k, k.replaceKeys, 'replace', 't', ['b','x'], 't', ['b','x']);
			
			k2.replaceKeys(WeaveAPI.QKeyManager.getQKeys('t', ['a','b','x','y']));
			trace('copy k2 to k');
			WeaveAPI.SessionManager.copySessionState(k2, k);
			assert(k, WeaveAPI.QKeyManager.getQKeys('t', ['a','b','x','y']));
			
			trace('test deprecated session state');
			WeaveAPI.SessionManager.setSessionState(k, {sessionedKeyType: 't2', sessionedKeys: 'a,b,x,y'}, true);
			assert(k, WeaveAPI.QKeyManager.getQKeys('t2', ['a','b','x','y']));
			
			testFunction(k, k.replaceKeys, 'replace k', 't', ['1'], 't', ['1']);
			testFunction(k, k.addKeys, 'add k', 't2', ['1'], 't', ['1'], 't2', ['1']);
			testFunction(k, k.removeKeys, 'remove k', 't', ['1'], 't2', ['1']);
			testFunction(k, k.addKeys, 'add k', 't2', ['1'], 't2', ['1']);
			
			for each (var t:String in WeaveAPI.QKeyManager.getAllKeyTypes())
				trace('all keys ('+t+'):', getKeyStrings(WeaveAPI.QKeyManager.getAllQKeys(t)));
		}
		private static function getKeyStrings(qkeys:Array):Array
		{
			var keyStrings:Array = [];
			for each (var key:IQualifiedKey in qkeys)
				keyStrings.push(key.keyType + '#' + key.localName);
			return keyStrings;
		}
		private static function traceKeySet(keySet:KeySet):void
		{
			trace(' ->', getKeyStrings(keySet.keys));
			trace('   ', Weave.stringify(WeaveAPI.SessionManager.getSessionState(keySet)));
		}
		private static function testFunction(keySet:KeySet, func:Function, comment:String, keyType:String, keys:Array, expectedResultKeyType:String, expectedResultKeys:Array, expectedResultKeyType2:String = null, expectedResultKeys2:Array = null):void
		{
			trace(comment, keyType, keys);
			func(WeaveAPI.QKeyManager.getQKeys(keyType, keys));
			var keys1:Array = expectedResultKeys ? WeaveAPI.QKeyManager.getQKeys(expectedResultKeyType, expectedResultKeys) : [];
			var keys2:Array = expectedResultKeys2 ? WeaveAPI.QKeyManager.getQKeys(expectedResultKeyType2, expectedResultKeys2) : [];
			assert(keySet, keys1, keys2);
		}
		private static function assert(keySet:KeySet, expectedKeys1:Array, expectedKeys2:Array = null):void
		{
			var qkey:IQualifiedKey;
			var map_key:Object = new JS.Map();
			for each (var keys:Array in [expectedKeys1, expectedKeys2])
			{
				for each (qkey in keys)
				{
					if (!keySet.containsKey(qkey))
						throw new Error("KeySet does not contain expected keys");
					map_key.set(qkey, true);
				}
			}
			
			for each (qkey in keySet.keys)
				if (!map_key.has(qkey))
					throw new Error("KeySet contains unexpected keys");
		}
	}
}
