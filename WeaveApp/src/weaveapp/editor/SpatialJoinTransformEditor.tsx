import * as React from "react";
import * as weavejs from "weavejs";

import StatefulTextField = weavejs.ui.StatefulTextField;
import WeaveReactUtils = weavejs.util.WeaveReactUtils
import HBox = weavejs.ui.flexbox.HBox;
import VBox = weavejs.ui.flexbox.VBox;
import HelpIcon = weavejs.ui.HelpIcon;

import SpatialJoinTransform from "weaveapp/data/source/SpatialJoinTransform";
import IWeaveTreeNode = weavejs.api.data.IWeaveTreeNode;
import ILinkableHashMap = weavejs.api.core.ILinkableHashMap;
import LinkableHashMap = weavejs.core.LinkableHashMap;
import IColumnWrapper = weavejs.api.data.IColumnWrapper;
import DataSourceEditor from "weaveapp/editor/DataSourceEditor";
import {IDataSourceEditorState} from "weaveapp/editor/DataSourceEditor";
import SelectableAttributeComponent from "weaveapp/ui/SelectableAttributeComponent";

export default class SpatialJoinTransformEditor extends DataSourceEditor<IDataSourceEditorState>
{
	get editorFields(): [React.ReactChild, React.ReactChild][] {
		let ds = (this.props.dataSource as SpatialJoinTransform);

		let attributes = new Map<string, (IColumnWrapper | LinkableHashMap)>();
		attributes.set("X", ds.xColumn);
		attributes.set("Y", ds.yColumn);
		attributes.set("Geometry", ds.geometryColumn);

		let editorFields: [React.ReactChild, React.ReactChild][] = [
			this.getLabelEditor(ds.label),
			[
				<HBox className="weave-padded-hbox" style={{ alignItems: "center", justifyContent: "flex-end" }}>
					{Weave.lang("X Coordinate") }
					<HelpIcon>
						{Weave.lang('The keyType of the "X Coordinate" and "Y Coordinate" columns should match.') }
					</HelpIcon>
				</HBox>,
				<SelectableAttributeComponent attributeName="X" attributes={attributes}/>
			],
			[
				<HBox className="weave-padded-hbox" style={{ alignItems: "center", justifyContent: "flex-end" }}>
					{Weave.lang("Y Coordinate") }
					<HelpIcon>
						{Weave.lang('The keyType of the "X Coordinate" and "Y Coordinate" columns should match.') }
					</HelpIcon>
				</HBox>,
				<SelectableAttributeComponent attributeName="Y" attributes={attributes}/>
			],
			[
				<HBox className="weave-padded-hbox" style={{ alignItems: "center", justifyContent: "flex-end" }}>
					{Weave.lang("Geometry to group by") }
					<HelpIcon>
						{Weave.lang('Specifies the geometry column to use for grouping the supplied points.') }
					</HelpIcon>
				</HBox>,
				<SelectableAttributeComponent attributeName="Geometry" attributes={attributes}/>
			],
			[
				Weave.lang("Point Data Projection"),
				<StatefulTextField style={{ width: "100%" }}
					selectOnFocus={true}
					placeholder={Weave.lang("Example: EPSG:4326") }
					ref={WeaveReactUtils.linkReactStateRef(this, { value: ds.pointProjection }) }/>
			]
		];
		return super.editorFields.concat(editorFields)
	}
}
