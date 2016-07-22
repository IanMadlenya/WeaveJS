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
	import weavejs.api.core.ILinkableHashMap;
	import weavejs.util.JS;
	import weavejs.util.StandardLib;
	
	/**
	 * LinkableFunction allows a function to be defined by a String that can use macros defined in the static macros hash map.
	 * Libraries listed in macroLibraries variable will be included when compiling the function.
	 * 
	 * @author adufilie
	 */
	public class LinkableFunction extends LinkableString
	{
		/**
		 * Debug mode. 
		 */		
		public static var debug:Boolean = false;
		
		/**
		 * @param defaultValue The default function definition.
		 * @param ignoreRuntimeErrors If this is true, errors thrown during evaluation of the function will be caught and values of undefined will be returned.
		 * @param useThisScope When true, variable lookups will be evaluated as if the function were in the scope of the thisArg passed to the apply() function.
		 * @param paramNames An Array of parameter names that can be used in the function definition.
		 */
		public function LinkableFunction(defaultValue:String = null, ignoreRuntimeErrors:Boolean = false, paramNames:Array = null)
		{
			super(StandardLib.unIndent(defaultValue));
			_ignoreRuntimeErrors = ignoreRuntimeErrors;
			_paramNames = paramNames ? paramNames.concat() : [];
		}
		
		private var _catchErrors:Boolean = false;
		private var _ignoreRuntimeErrors:Boolean = false;
		private var _compiledMethod:Function = null;
		private var _paramNames:Array = null;
		private var _isFunctionDefinition:Boolean = false;
		private var _triggerCount:uint = 0;

		/**
		 * This is used as a placeholder to prevent re-compiling erroneous code.
		 */
		private static function RETURN_UNDEFINED(..._):* { return undefined; }
		
		/**
		 * This will attempt to compile the function.  An Error will be thrown if this fails.
		 */
		public function validate():void
		{
			if (_triggerCount != triggerCounter)
			{
				// in case compile fails, set variables now to prevent re-compiling erroneous code
				_triggerCount = triggerCounter;
				_compiledMethod = RETURN_UNDEFINED;
				_isFunctionDefinition = false;
				_compiledMethod = JS.compile(value, _paramNames, errorHandler);
			}
		}
		
		private function errorHandler(e:*):void
		{
			var root:ILinkableHashMap = Weave.getRoot(this);
			if (root)
				e.message = "In LinkableFunction " + JSON.stringify(Weave.findPath(root, this)) + ":\n" + e.message;
			
			if (debug)
				JS.error(e);
			
			if (_ignoreRuntimeErrors || debug)
				return;
			
			throw e;
		}
		
		/**
		 * This will evaluate the function with the specified parameters.
		 * @param thisArg The value of 'this' to be used when evaluating the function.
		 * @param argArray An Array of arguments to be passed to the compiled function.
		 * @return The result of evaluating the function.
		 */
		public function apply(thisArg:* = null, argArray:Array = null):*
		{
			if (_triggerCount != triggerCounter)
				validate();
			return _compiledMethod.apply(thisArg, argArray);
		}
		
		/**
		 * This will evaluate the function with the specified parameters.
		 * @param thisArg The value of 'this' to be used when evaluating the function.
		 * @param args Arguments to be passed to the compiled function.
		 * @return The result of evaluating the function.
		 */
		public function call(thisArg:* = null, ...args):*
		{
			if (_triggerCount != triggerCounter)
				validate();
			return _compiledMethod.apply(thisArg, args);
		}
	}
}
