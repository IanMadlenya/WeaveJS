import * as React from "react";
import * as FileSaver from "filesaver.js";
import {MenuBarItemProps} from "../ui/menu/MenuBar";
import {MenuItemProps} from "../ui/menu/Menu";
import DataSourceManager from "../editor/manager/DataSourceManager";
import WeaveMenus from "./WeaveMenus";
import IDataSource = weavejs.api.data.IDataSource;
import IDataSource_File = weavejs.api.data.IDataSource_File;
import IDataSource_Service = weavejs.api.data.IDataSource_Service;

export default class DataMenu implements MenuBarItemProps
{
	constructor(owner:WeaveMenus)
	{
		this.owner = owner;
	}

	owner:WeaveMenus;
	label:string = "Data";

	get menu():MenuItemProps[]
	{
		return [].concat(
			{
				enabled: this.owner.enableDataManagerItem(),
				label: Weave.lang('Manage data...'),
				click: this.owner.openDataManager
			},
			{},
//			{
//				shown: Weave.beta,
//				label: <FileInput onChange={(()=>alert('Not implemented yet')) || this.fileMenu.openFile} accept={this.fileMenu.getSupportedFileTypes(true).join(',')}>{Weave.lang("Import data file(s)... (not implemented yet)")}</FileInput>
//			},
//			{},
			this.getExportItems()
		);
	}
			
	getExportItems():MenuItemProps[]
	{
		return [
			{
				enabled: this.getColumnsToExport().length > 0,
				label: Weave.lang("Export CSV"),
				click: this.exportCSV
			}
		];
	}

	static getDataSourceItems(weave:Weave, onCreateItem?:(dataSource:IDataSource)=>void)
	{
		var registry = weavejs.WeaveAPI.ClassRegistry;
		var impls = registry.getImplementations(IDataSource);
		
		// filter out those data sources without editors
		impls = impls.filter(impl => DataSourceManager.editorRegistry.has(impl));
	
		var items:MenuItemProps[] = [];
		for (var partition of weavejs.core.ClassRegistryImpl.partitionClassList(impls, IDataSource_File, IDataSource_Service))
		{
			if (items.length)
				items.push({});
			partition.forEach(impl => {
				var label = Weave.lang(registry.getDisplayName(impl));
				items.push({
					get shown() {
						return Weave.beta || !DataMenu.isBeta(impl);
					},
					get label() {
						if (DataMenu.isBeta(impl))
							return label + " (beta)";
						return label;
					},
					click: () => {
						var baseName = weavejs.WeaveAPI.ClassRegistry.getDisplayName(impl);
						var path = [weave.root.generateUniqueName(baseName)];
						var dataSource = weave.requestObject(path, impl);
						if (onCreateItem)
							onCreateItem(dataSource);
					}
				});
			});
		}
		
		return items;
	}

	static isBeta(impl:new()=>IDataSource):boolean
	{
		return impl == weavejs.data.source.CensusDataSource
			|| impl == weavejs.data.source.GroupedDataTransform
			|| impl == weavejs.data.source.SpatialJoinTransform;
	}
	
	getColumnsToExport=()=>
	{
		var columnSet = new Set<weavejs.api.data.IAttributeColumn>();
		for (var rc of Weave.getDescendants(this.owner.weave.root, weavejs.data.column.ReferencedColumn))
		{
			var col = rc.getInternalColumn();
			if (col && col.getMetadata(weavejs.api.data.ColumnMetadata.DATA_TYPE) != weavejs.api.data.DataType.GEOMETRY)
				columnSet.add(col)
		}
		return weavejs.util.JS.toArray(columnSet.values());
	}

	exportCSV=()=>
	{
		var columns = this.getColumnsToExport();
		var filter = Weave.AS(this.owner.weave.getObject('defaultSubsetKeyFilter'), weavejs.api.data.IKeyFilter);
		var csv = weavejs.data.ColumnUtils.generateTableCSV(columns, filter);	
		FileSaver.saveAs(new Blob([csv]), "Weave-data-export.csv");
	}
}
