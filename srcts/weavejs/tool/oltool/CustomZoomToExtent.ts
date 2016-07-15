	import * as ol from "openlayers";
	import * as jquery from "jquery";
	import OpenLayersMapTool from "./OpenLayersMapTool";

	// loads jquery from the es6 default module.
	var $:JQueryStatic = (jquery as any)["default"];

	export default class CustomZoomToExtent extends ol.control.Control
	{
		private extent: ol.Extent;
		constructor(opt_options?: olx.control.ZoomToExtentOptions)
		{
			let options: olx.control.ZoomToExtentOptions = opt_options ? opt_options : {};

			let className: string = options.className ? options.className : 'ol-zoom-extent';

			let label: string|HTMLElement = options.label ? options.label : 'E';

			let tipLabel: string = options.tipLabel ? options.tipLabel : 'Zoom to extent';

			let button = $("<button>").addClass(className).prop("title", tipLabel).append(label);
			let div = $("<div>").addClass("ol-unselectable ol-control ol-zoom-extent").append(button);
			super({ target: options.target, element: div[0] });

			this.extent = options.extent ? options.extent : null;

			button.click(this.handleClick.bind(this));
		}

		private handleClick(event:MouseEvent)
		{
			event.preventDefault();
			this.handleZoomToExtent();
		}

		private handleZoomToExtent()
		{
			let map: ol.Map = this.getMap();
			let view: ol.View = map.getView();
			let tool = this.getMap().get("mapTool") as OpenLayersMapTool;
			let toolBounds = tool.getExtent();
			let extent: ol.Extent;
			if (!toolBounds.isEmpty())
			{
				extent = toolBounds.getCoords();
			}
			else
			{
				extent = view.get("extent") || view.getProjection().getExtent();
			}
			if (extent)
				view.fit(extent, map.getSize());
		}

	}
