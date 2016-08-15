namespace weavejs.tool.oltool
{
	import AbstractFeatureLayer = weavejs.tool.oltool.layer.AbstractFeatureLayer;
	import AbstractLayer = weavejs.tool.oltool.layer.AbstractLayer;
	import IOpenLayersMapTool = weavejs.tool.oltool.IOpenLayersMapTool;
	import IQualifiedKey = weavejs.api.data.IQualifiedKey;
	import KeySet = weavejs.data.key.KeySet;

	enum DragSelectionMode {
		SUBTRACT = -1,
		SET = 0,
		ADD = 1
	};

	export class DragSelection extends ol.interaction.DragBox
	{
		private mode: DragSelectionMode;
		private _probeInteraction: ProbeInteraction;

		constructor()
		{
			super({ boxEndCondition: DragSelection.prototype.boxEndCondition });

			this.on('boxstart', DragSelection.prototype.onBoxStart, this);
			this.on('boxdrag', DragSelection.prototype.onBoxDrag, this);
			this.on('boxend', DragSelection.prototype.onBoxEnd, this);
		}

		private boxEndCondition(mapBrowserEvent: ol.MapBrowserEvent, startPixel: ol.Pixel, endPixel: ol.Pixel):boolean 
		{
			let event = mapBrowserEvent.originalEvent as MouseEvent;
			let width = endPixel[0] - startPixel[0];
			let height = endPixel[1] - startPixel[1];
			let tool = mapBrowserEvent.map.get(IOpenLayersMapTool.MAP_TOOL) as IOpenLayersMapTool;
			this.probeInteraction.setActive(true);
			if (width * width + height * height <= 64)
			{
				let probeLayer: AbstractFeatureLayer = mapBrowserEvent.map.forEachLayerAtPixel(mapBrowserEvent.pixel, (layer) => {
					let weaveLayer = layer.get("layerObject") as AbstractFeatureLayer;
					if (!(weaveLayer instanceof AbstractFeatureLayer))
						return false;
					if (weaveLayer.probeKeySet && weaveLayer.probeKeySet.keys.length)
						return weaveLayer;
				}, this, AbstractFeatureLayer.selectableLayerFilter);

				if (probeLayer instanceof AbstractFeatureLayer)
				{
					AbstractVisTool.handlePointClick(probeLayer, event);
					return false;
				}
				else if (this.mode === DragSelectionMode.SET)
				{
					/* Clear all the selection keysets */
					for (let weaveLayer of tool.layers.getObjects() as AbstractFeatureLayer[])
					{
						if (weaveLayer instanceof AbstractFeatureLayer)
						{
							weaveLayer.selectionKeySet && weaveLayer.selectionKeySet.clearKeys();
						}
					}
				}
			}
		}

		private get probeInteraction():ProbeInteraction
		{
			if (!this._probeInteraction)
			{
				for (let interaction of this.getMap().getInteractions().getArray())
				{
					if (interaction instanceof ProbeInteraction)
					{
						this._probeInteraction = interaction as ProbeInteraction;
						break;
					}
				}
			}

			return this._probeInteraction;
		}

		onBoxStart(event: any)
		{
			if (this.probeInteraction)
				this.probeInteraction.setActive(false);

			let dragBoxEvent: ol.DragBoxEvent = <ol.DragBoxEvent>event;

			let browserEvent: MouseEvent = <MouseEvent>dragBoxEvent.mapBrowserEvent.originalEvent;

			if (browserEvent.ctrlKey && browserEvent.shiftKey)
			{
				this.mode = DragSelectionMode.SUBTRACT;
			}
			else if (browserEvent.ctrlKey)
			{
				this.mode = DragSelectionMode.ADD;
			}
			else
			{
				this.mode = DragSelectionMode.SET;
			}
		}

		updateSelection(extent:any)
		{
			let selectedFeatures: Set<IQualifiedKey> = new Set();
			let selectFeature: Function = (feature: ol.Feature) => { selectedFeatures.add(<IQualifiedKey>feature.getId()); };

			for (let olLayer of this.getMap().getLayers().getArray())
			{
				let selectable: boolean = <boolean>olLayer.get("selectable");
				let weaveLayer: AbstractLayer = olLayer.get("layerObject");

				if (weaveLayer instanceof AbstractFeatureLayer && selectable)
				{
					let source: ol.source.Vector = <ol.source.Vector>(<ol.layer.Vector>olLayer).getSource();
					let keySet: KeySet = weaveLayer.selectionKeySet;

					source.forEachFeatureIntersectingExtent(extent, selectFeature);

					let keys:Array<IQualifiedKey> = Array.from(selectedFeatures);

					switch (this.mode)
					{
						case DragSelectionMode.SET:
							keySet && keySet.replaceKeys(keys);
							break;
						case DragSelectionMode.ADD:
							keySet && keySet.addKeys(keys);
							break;
						case DragSelectionMode.SUBTRACT:
							keySet && keySet.removeKeys(keys);
							break;
					}
				}
			}
		}

		onBoxDrag(event:any)
		{
			let extent:any = this.getGeometry().getExtent();

			this.updateSelection(extent);
		}

		onBoxEnd(event:any)
		{
			let extent:any = this.getGeometry().getExtent();

			this.updateSelection(extent);
			if (this.probeInteraction)
				this.probeInteraction.setActive(true);
		}
	}
}
