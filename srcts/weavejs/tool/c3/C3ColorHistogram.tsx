import * as React from "react";
import C3Histogram from "./C3Histogram";
import {IVisToolProps} from "../../api/ui/IVisTool";
import IAltText from "../../api/ui/IAltText";

export default class C3ColorHistogram extends C3Histogram
{
	constructor(props:IVisToolProps)
	{
		super(props);
		this.fill.color.internalDynamicColumn.targetPath = ["defaultColorColumn"];
	}
	
    get defaultPanelTitle():string
    {
	    if (this.binnedColumn.numberOfBins)
		    return Weave.lang("Color Histogram of {0}", weavejs.data.ColumnUtils.getTitle(this.binnedColumn));

	    return Weave.lang("Color Histogram");
    }
}

Weave.registerClass(
	C3ColorHistogram,
	["weavejs.tool.C3ColorHistogram", "weave.visualization.tools::ColormapHistogramTool"],
	[
		weavejs.api.ui.IVisTool_Basic,
		weavejs.api.core.ILinkableObjectWithNewProperties,
		weavejs.api.data.ISelectableAttributes,
		IAltText
	],
	"Color Histogram"
);
