import WeaveApp from "./WeaveApp";
import WeaveMenuBar from "./WeaveMenuBar";
import WeaveComponentRenderer from "./WeaveComponentRenderer";
import DynamicComponent from "./ui/DynamicComponent";
import LinkableDynamicComponent from "./ui/LinkableDynamicComponent";
import FlexibleLayout from "./layouts/FlexibleLayout";
import WindowLayout from "./layouts/WindowLayout";
import TabLayout from "./layouts/TabLayout";

import WeaveDataSourceEditor from "./editors/WeaveDataSourceEditor";

import BarChartLegend from "./tools/BarChartLegend";
import BoxWhiskerPlot from "./tools/BoxWhiskerPlot";
import ColorLegend from "./tools/ColorLegend";
import C3BarChart from "./tools/C3BarChart";
import C3Gauge from "./tools/C3Gauge";
import C3Histogram from "./tools/C3Histogram";
import C3ColorHistogram from "./tools/C3ColorHistogram";
import C3LineChart from "./tools/C3LineChart";
import C3ScatterPlot from "./tools/C3ScatterPlot";
import C3PieChart from "./tools/C3PieChart";
import DataFilterTool from "./tools/DataFilterTool/DataFilterTool";
import AttributeMenuTool from "./tools/AttributeMenuTool";
import OpenLayersMapTool from "./tools/OpenLayersMapTool";
import SessionStateMenuTool from "./tools/SessionStateMenuTool";
import Sparkline from "./tools/Sparkline";
import TableTool from "./tools/TableTool";
import TextTool from "./tools/TextTool";
import DataInfoTool from "./tools/DataInfoTool";
import ToolTip from "./tools/ToolTip";

import HSlider from "./react-ui/RCSlider/HSlider";
import VSlider from "./react-ui/RCSlider/VSlider";
import CheckBoxList from "./react-ui/CheckBoxList";
import {HBox, VBox, Section, Label} from "./react-ui/FlexBox";
import List from "./react-ui/List";
import Menu from "./react-ui/Menu";
import MenuBar from "./react-ui/MenuBar";
import PopupWindow from "./react-ui/PopupWindow";

import DataSourceManager from "./ui/DataSourceManager";
import StatefulTextField from "./ui/StatefulTextField";
import WeaveTree from "./ui/WeaveTree";

import MouseUtils from "./utils/MouseUtils";
import MiscUtils from "./utils/MiscUtils";
import DOMUtils from "./utils/DOMUtils";
import ReactUtils from "./utils/ReactUtils";
import JSZip from "./modules/jszip";
import WeaveArchive from "./WeaveArchive";
import * as WeaveReactUtils from "./utils/WeaveReactUtils";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as lodash from "lodash";
import * as moment from "moment";
import * as ol from "openlayers";

weavejs.util.StandardLib.lodash = lodash;
weavejs.util.StandardLib.ol = ol;
weavejs.util.DateUtils.moment = (moment as any)['default'];

import * as jquery from "jquery";
import Div from "./react-ui/Div";
import VendorPrefixer from "./react-ui/VendorPrefixer";
import IAltText from "./accessibility/IAltText";
import {AltTextConfig} from "./accessibility/IAltText";

// global jQuery needed for semantic
(window as any).jQuery = (jquery as any)["default"];
(window as any).$ = (jquery as any)["default"];

var cr = weavejs.WeaveAPI.ClassRegistry;
cr.registerClass(HBox, 'weavejs.ui.HBox');
cr.registerClass(VBox, 'weavejs.ui.VBox');
cr.registerClass(Section, 'weavejs.ui.Section');
cr.registerClass(Label, 'weavejs.ui.Label');
cr.registerClass(MouseUtils, 'weavejs.util.MouseUtils');
cr.registerClass(MiscUtils, 'weavejs.util.MiscUtils');
cr.registerClass(ReactUtils, 'weavejs.util.ReactUtils');
cr.registerClass(DOMUtils, 'weavejs.util.DOMUtils');

export
{
	WeaveApp,
	WeaveMenuBar,
	WeaveComponentRenderer,
	DynamicComponent,
	LinkableDynamicComponent,
	FlexibleLayout,
	WindowLayout,
	TabLayout,
	WeaveDataSourceEditor,
	IAltText,
	AltTextConfig,
	BarChartLegend,
	BoxWhiskerPlot,
	ColorLegend,
	C3BarChart,
	C3Gauge,
	C3Histogram,
	C3ColorHistogram,
	C3LineChart,
	C3ScatterPlot,
	C3PieChart,
	DataFilterTool,
	OpenLayersMapTool,
	AttributeMenuTool,
	SessionStateMenuTool,
	Sparkline,
	TableTool,
	TextTool,
	DataInfoTool,
	ToolTip,
	
	HSlider,
	VSlider,
	CheckBoxList,
	HBox,
	VBox,
	Section,
	Label,
	List,
	Menu,
	MenuBar,
	PopupWindow,
	
	DataSourceManager,
	StatefulTextField,
	WeaveTree,
	
	MouseUtils,
	MiscUtils,
	DOMUtils,
	ReactUtils,
	WeaveReactUtils,
	WeaveArchive,
	Div,
	VendorPrefixer
};
