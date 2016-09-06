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
	import weavejs.api.core.IClassRegistry;
	import weavejs.util.JS;
	
	/**
	 * Manages a set of implementations of interfaces.
	 */
	public class ClassRegistryImpl implements IClassRegistry
	{
		public function ClassRegistryImpl()
		{
		}
		
		/**
		 * interface Class -&gt; singleton implementation instance.
		 */
		public const map_interface_singletonInstance:Object = new JS.Map();
		
		/**
		 * interface Class -&gt; Array&lt;implementation Class&gt;
		 */
		public const map_interface_implementations:Object = new JS.Map();
		
		/**
		 * implementation Class -&gt; String
		 */
		public const map_class_displayName:Object = new JS.Map();
		
		/**
		 * qualifiedName:String -> definition:Class
		 */
		public const map_name_class:Object = new JS.Map();
		
		/**
		 * definition:Class -> qualifiedName:String
		 */
		public const map_class_name:Object = new JS.Map();
		
		/**
		 * An Array of default packages to check when looking up a class by name.
		 */
		public const defaultPackages:Array = [];
		
		private static const FLEXJS_CLASS_INFO:String = "FLEXJS_CLASS_INFO";
		private static const NAMES:String = 'names';
		private static const NAME:String = 'name';
		private static const QNAME:String = 'qName';
		private static const INTERFACES:String = 'interfaces';
		
		public function registerClass(definition:Class, qualifiedName:String, interfaces:Array = null, displayName:String = null):void
		{
			// register qualified name
			if (!map_name_class.has(qualifiedName))
				map_name_class.set(qualifiedName, definition);
			if (!map_class_name.has(definition))
				map_class_name.set(definition, qualifiedName);
			
			// register short name
			var shortName:String = qualifiedName.split('.').pop().split(':').pop();
			if (!map_name_class.has(shortName))
				map_name_class.set(shortName, definition);
			
			var info:Object;
			var items:Array;
			var item:*;
			
			// get class info
			if (Object(definition.prototype).hasOwnProperty(FLEXJS_CLASS_INFO))
				info = definition.prototype[FLEXJS_CLASS_INFO];
			else
				info = definition.prototype[FLEXJS_CLASS_INFO] = {};
			
			// add name if not present
			var found:Boolean = false;
			items = info[NAMES] || (info[NAMES] = []);
			for each (item in items)
			{
				if (item[QNAME] == qualifiedName)
				{
					found = true;
					break;
				}
			}
			if (!found)
			{
				item = {};
				item[NAME] = shortName;
				item[QNAME] = qualifiedName;
				items.push(item);
			}
			
			// add interfaces if not present
			items = info[INTERFACES] || (info[INTERFACES] = []);
			for each (item in interfaces)
			{
				if (items.indexOf(item) < 0)
					items.push(item);
				registerImplementation(item, definition, displayName);
			}
		}
		
		public function getClassName(definition:Object):String
		{
			if (!definition)
				return null;
			
			if (!definition.prototype)
				definition = definition.constructor;
			
			if (definition.prototype && definition.prototype[FLEXJS_CLASS_INFO])
				return definition.prototype[FLEXJS_CLASS_INFO].names[0].qName;
			
			if (map_class_name.has(definition))
				return map_class_name.get(definition);
			
			return definition.name;
		}
		
		public function getDefinition(name:String):*
		{
			// check cache
			var def:* = map_name_class.get(name);
			if (def || !name)
				return def;
			
			// try following chain of property names from global scope
			def = evalChain(name);
			
			// check default packages
			if (!def)
			{
				var shortName:String = name.split('.').pop().split('::').pop();
				for each (var pkg:String in defaultPackages)
				{
					var qName:String = pkg ? pkg + '.' + shortName : shortName;
					def = map_name_class.get(qName) || evalChain(qName);
					if (def)
						break;
				}
			}
			
			// save in cache
			if (def)
				map_name_class.set(name, def);
			
			return def;
		}
		
		private function evalChain(name:String):*
		{
			var chain:Array = name.split('.');
			var def:* = JS.global;
			for each (var key:String in chain)
			{
				if (!def)
					break;
				
				try
				{
					def = def[key];
				}
				catch (e:Error)
				{
					def = undefined;
				}
			}
			return def;
		}
		
		public function getClassInfo(class_or_instance:Object):/*/{
			variables: {[name:string]:{type: string}}[],
			accessors: {[name:string]:{type: string, declaredBy: string}}[],
			methods: {[name:string]:{type: string, declaredBy: string}}[]
			}/*/Object
		{
			if (!class_or_instance)
				return null;
			if (!class_or_instance.prototype)
				class_or_instance = class_or_instance.constructor;
			var info:* = class_or_instance && class_or_instance.prototype && class_or_instance.prototype.FLEXJS_REFLECTION_INFO;
			if (info is Function)
			{
				info = info();
				info.variables = info.variables();
				info.accessors = info.accessors();
				info.methods = info.methods();
			}
			return info;
		}
		
		public function getSingletonInstance(theInterface:Class):*
		{
			if (!map_interface_singletonInstance.get(theInterface))
			{
				var classDef:Class = getImplementations(theInterface)[0];
				if (classDef)
					map_interface_singletonInstance.set(theInterface, new classDef());
			}
			
			return map_interface_singletonInstance.get(theInterface);
		}
		
		public function registerImplementation(theInterface:Class, theImplementation:Class, displayName:String = null):void
		{
			verifyImplementation(theInterface, theImplementation);
			
			var array:Array = map_interface_implementations.get(theInterface);
			if (!array)
				map_interface_implementations.set(theInterface, array = []);
			
			// overwrite existing displayName if specified
			if (displayName || !map_class_displayName.get(theImplementation))
				map_class_displayName.set(theImplementation, displayName || getClassName(theImplementation).split(':').pop());
			
			if (array.indexOf(theImplementation) < 0)
			{
				array.push(theImplementation);
				// sort by displayName
				array.sort(compareDisplayNames);
			}
		}
		
		public function getImplementations(theInterface:Class):Array
		{
			var array:Array = map_interface_implementations.get(theInterface);
			return array ? array.concat() : [];
		}
		
		public function getDisplayName(theImplementation:Class):String
		{
			var str:String = map_class_displayName.get(theImplementation);
			return str;// && lang(str);
		}
		
		/**
		 * @private
		 * sort by displayName
		 */
		private function compareDisplayNames(impl1:Class, impl2:Class):int
		{
			var name1:String = map_class_displayName.get(impl1);
			var name2:String = map_class_displayName.get(impl2);
			if (name1 < name2)
				return -1;
			if (name1 > name2)
				return 1;
			return 0;
		}
		
		/**
		 * Verifies that a Class implements an interface.
		 */
		public function verifyImplementation(theInterface:Class, theImplementation:Class):void
		{
			if (!theInterface)
				throw new Error("interface cannot be " + theInterface);
			if (!theImplementation)
				throw new Error("implementation cannot be " + theImplementation);
			if (!(theImplementation.prototype is theInterface))
				throw new Error(getClassName(theImplementation) + ' does not implement ' + getClassName(theInterface));
		}
		
		/**
		 * Partitions a list of classes based on which interfaces they implement.
		 * @param A list of interfaces.
		 * @return An Array of filtered Arrays corresponding to the given interfaces, including a final
		 *         Array containing the remaining classes that did not implement any of the given interfaces.
		 */
		public static function partitionClassList(classes:Array/*/< new(..._:any[])=>any >/*/, ...interfaces/*/< new()=>any >/*/):Array/*/<typeof classes>/*/
		{
			if (interfaces.length == 1 && interfaces[0] is Array)
				interfaces = interfaces[0];
			var partitions:Array = [];
			for each (var interfaceClass:Class in interfaces)
			{
				var partition:Array = [];
				classes = classes.filter(function(impl:Class, i:int, a:Array):Boolean {
					if (impl.prototype is interfaceClass)
					{
						// include in result, remove from from classes
						partition.push(impl);
						return false;
					}
					return true;
				});
				partitions.push(partition);
			}
			partitions.push(classes);
			return partitions;
		}
	}
}
