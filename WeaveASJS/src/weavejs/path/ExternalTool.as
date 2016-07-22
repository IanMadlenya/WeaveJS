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

package weavejs.path
{
	import weavejs.WeaveAPI;
	import weavejs.api.core.ILinkableHashMap;
	import weavejs.api.core.ILinkableObject;
	import weavejs.api.data.IAttributeColumn;
	import weavejs.core.LinkableHashMap;
	import weavejs.core.LinkableString;
	import weavejs.util.JS;
	import weavejs.util.StandardLib;

	public class ExternalTool extends LinkableHashMap //implements ISelectableAttributes
	{
		/**
		 * The name of the global JavaScript variable which is a mapping from a popup's
		 * window.name to an object containing "path" and "window" properties.
		 */
		public static const WEAVE_EXTERNAL_TOOLS:String = 'WeaveExternalTools';
		
		/**
		 * URL for external tool
		 */
		private var toolUrl:LinkableString;
		
		/**
		 * The popup's window.name
		 */
		public const windowName:String = generateWindowName();
		
		public function ExternalTool()
		{
			super();
			
			toolUrl = requestObject("toolUrl", LinkableString, true);
			toolUrl.addGroupedCallback(this, toolPropertiesChanged);
		}
		
		private function toolPropertiesChanged():void
		{
			if (toolUrl.value)
			{
				this.launch();
			}
		}
		
		public function launch():Boolean
		{
			return ExternalTool.launch(this, toolUrl.value, windowName, "menubar=no,status=no,toolbar=no");
		}
		
		public static function generateWindowName():String
		{
			return StandardLib.replace(StandardLib.guid(), '-', '');
		}
		
		public static function launch(owner:ILinkableObject, url:String, windowName:String = '', features:String = null):Boolean
		{
			var path:WeavePath = Weave.getPath(owner);
			if (!JS.global[WEAVE_EXTERNAL_TOOLS]) {
				JS.global[WEAVE_EXTERNAL_TOOLS] = {};
			    // when we close this window, close all popups
			    if (JS.global.addEventListener)
			        JS.global.addEventListener("unload", function():void {
			            for (var key:String in JS.global[WEAVE_EXTERNAL_TOOLS])
						{
			                try
							{
								JS.global[WEAVE_EXTERNAL_TOOLS][key].window.close();
							}
							catch (e:Error)
							{
								// ignore error
							}
						}
			        });
			}
			var popup:Object = JS.global.open(url, windowName, features);
			JS.global[WEAVE_EXTERNAL_TOOLS][windowName] = {"path": path, "window": popup};
				
			if (!popup)
				JS.error("External tool popup was blocked by the web browser.");
			
			return !!popup;
		}
		
		override public function dispose():void
		{
			super.dispose();
			try
			{
				JS.global[WEAVE_EXTERNAL_TOOLS][windowName].window.close();
				delete JS.global[WEAVE_EXTERNAL_TOOLS][windowName];
			}
			catch (e:Error)
			{
				// ignore error
			}
		}
		
		/**
		 * @inheritDoc
		 */
		public function getSelectableAttributeNames():Array
		{
			return getSelectableAttributes().map(getLabel);
		}
		
		private function getLabel(obj:ILinkableObject, i:int, a:Array):String
		{
			var label:String = WeaveAPI.EditorManager.getLabel(obj);
			if (!label)
			{
				var path:Array = Weave.findPath(this, obj);
				if (path)
					label = path.join('/');
			}
			return label;
		}

		/**
		 * @inheritDoc
		 */
		public function getSelectableAttributes():Array
		{
			var hashMaps:Array = [this].concat(Weave.getDescendants(this, ILinkableHashMap));
			var flatList:Array = Array.prototype.concat.apply([], hashMaps.map(function(hm:ILinkableHashMap, i:*, a:*):* { return hm.getObjects(IAttributeColumn); }));
			return flatList.filter(function(item:ILinkableObject, i:*, a:*):Boolean { return getLabel(item, i, a) && true; });
			
			//return getObjects(IAttributeColumn);
		}
	}
}
