///
/// Copyright (C) 2025 con terra GmbH (info@conterra.de)
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///         http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import GroupLayer from "esri/layers/GroupLayer";

import type { InjectedReference } from "apprt-core/InjectedReference";
import type { LayerConfig, DomainBundleConfig } from "../api";
import type { MapWidgetModel } from "map-widget/api";
import type { LogNotificationService } from "apprt/api";

export class LayerSortingController {
    private _mapWidgetModel: InjectedReference<MapWidgetModel>;
    private _logService: InjectedReference<LogNotificationService>;
    private successNotification: string;

    private idToLayerMapping?: Map<string, __esri.Layer>;
    private idToGroupMapping?: Map<string, __esri.GroupLayer>;

    constructor(
        _mapWidgetModel: InjectedReference<MapWidgetModel>,
        logService: InjectedReference<LogNotificationService>,
        successNotification: string
    ) {
        this._mapWidgetModel = _mapWidgetModel;
        this._logService = logService;
        this.successNotification = successNotification;
    }

    async restructureLayers(layerConfig: LayerConfig[], domainConfig: DomainBundleConfig): Promise<void> {
        const view = await this.getView();

        if (!view) {
            throw new Error("Map view is not available.");
        }
        try {
            this.handleLayerRestructuring(layerConfig, view);

            if (domainConfig) {
                this.removeFilteredLayersFromMap(domainConfig, view);
            }

            this._logService?.info(this.successNotification);
        }
        catch {
            this._logService?.error("error");
        }
    }

    private handleLayerRestructuring(layerConfig: LayerConfig[], view: __esri.MapView): void {
        const map = view.map;
        const mapLayers = map.layers;

        if (!mapLayers || mapLayers.length === 0) {
            console.error("Map layers are not available.");
            return;
        }

        const availableLayers = this.getFlattenLayers(mapLayers);
        const idToLayerMapping = this.idToLayerMapping = new Map<string, __esri.Layer>();
        const idToGroupMapping = this.idToGroupMapping = new Map<string, __esri.GroupLayer>();
        const rootLayers: __esri.Layer[] = [];

        availableLayers.items.forEach((layer: __esri.Layer | __esri.GroupLayer) => {
            idToLayerMapping.set(layer.id, layer);
            if (layer.type === 'group') {
                idToGroupMapping.set(layer.id, layer as __esri.GroupLayer);
            }
        });

        const createdParentGroupsMapping = this.createParentGroupsMapping(layerConfig);

        layerConfig.forEach(entry => {
            let layer = idToLayerMapping.get(entry.id);

            if (!layer) {
                layer = this.createGroupLayer(entry.id);
            } else if (layer.type === 'group') {
                idToGroupMapping.set(entry.id, layer as __esri.GroupLayer);
            }

            if (entry.newParentId) {
                this.sortLayerToNewParent(layer, entry, map, layerConfig);
            } else {
                if (layer.parent && 'layers' in layer.parent) {
                    (layer.parent as __esri.GroupLayer).layers.remove(layer);
                }
                rootLayers.push(layer);
            }
        });

        this.addNewGroupsWithoutParentToRoot(createdParentGroupsMapping, layerConfig, rootLayers);
        this.handleRootLayers(map, layerConfig, rootLayers);
    }

    private removeFilteredLayersFromMap(domainConfig: DomainBundleConfig, view: __esri.MapView): void {
        const map = view.map;
        console.info(domainConfig);

        this.getFlattenLayers(map.layers).forEach((layer: __esri.Layer) => {
            const extendedLayer = layer as __esri.Layer & {
                wasRestructured?: boolean;
                _sourceDomainBundle?: string;
            };
            if (
                extendedLayer?.wasRestructured ||
                !extendedLayer?._sourceDomainBundle ||
                domainConfig[extendedLayer?._sourceDomainBundle] === true
            ) return;

            map.remove(extendedLayer);
        });
    }

    private createParentGroupsMapping(
        layerConfig: LayerConfig[]
    ): Set<string> {
        const idToLayerMapping = this.idToLayerMapping!;
        const idToGroupMapping = this.idToGroupMapping!;

        const createdParentGroups = new Set<string>();

        for (const entry of layerConfig) {
            if (entry.newParentId && idToGroupMapping.has(entry.newParentId)) {
                const parentLayer = idToLayerMapping.get(entry.newParentId);
                if (!parentLayer || parentLayer.type !== 'group') {
                    const newGroup = new GroupLayer({
                        id: entry.newParentId,
                        title: parentLayer?.title || entry.newParentId,
                        visible: true,
                        layers: []
                    });
                    idToLayerMapping.set(entry.newParentId, newGroup);
                    idToGroupMapping.set(entry.newParentId, newGroup);
                    createdParentGroups.add(entry.newParentId);
                }
            }
        }

        return createdParentGroups;
    }

    private createGroupLayer(id: string): __esri.GroupLayer {
        const idToLayerMapping = this.idToLayerMapping!;
        const idToGroupMapping = this.idToGroupMapping!;

        const groupLayer = new GroupLayer({
            id: id,
            title: id,
            visible: true,
            layers: []
        });
        idToLayerMapping.set(id, groupLayer);
        idToGroupMapping.set(id, groupLayer);
        return groupLayer;
    }

    private sortLayerToNewParent(
        layer: __esri.Layer,
        entry: LayerConfig,
        map: __esri.Map,
        layerConfig: LayerConfig[]
    ): void {
        const idToGroupMapping = this.idToGroupMapping!;

        const parentGroup = idToGroupMapping.get(entry?.newParentId);
        if (parentGroup) {
            if (layer.parent && 'layers' in layer.parent) {
                (layer.parent as __esri.GroupLayer).layers.remove(layer);
            } else {
                map.layers.remove(layer);
            }

            const children = parentGroup.layers.toArray();
            children.push(layer);
            parentGroup.layers.removeAll();
            parentGroup.layers.addMany(
                children.sort((a, b) => {
                    const orderA = layerConfig.find(c => c.id === a.id)?.order ?? 0;
                    const orderB = layerConfig.find(c => c.id === b.id)?.order ?? 0;
                    return orderB - orderA;
                })
            );
        } else {
            throw new Error(`Parent group '${entry.newParentId}' not found for layer '${entry.id}'`);
        }
    }

    private addNewGroupsWithoutParentToRoot(
        createdParentGroupsMapping: Set<string>,
        layerConfig: LayerConfig[],
        rootLayers: __esri.GroupLayer[]
    ): void {
        const idToGroupMapping = this.idToGroupMapping!;

        createdParentGroupsMapping.forEach((parentId: string) => {
            const hasConfigEntry = layerConfig.some(entry => entry.id === parentId);
            if (!hasConfigEntry) {
                const parentGroup = idToGroupMapping.get(parentId);
                if (parentGroup) {
                    rootLayers.push(parentGroup);
                }
            }
        });
    }

    private handleRootLayers(map: __esri.Map, layerConfig: LayerConfig[], rootLayers: __esri.GroupLayer[]) {
        // Add root layers to map (only new ones or ones that need reordering)
        const currentRootLayers = map.layers.toArray();
        for (const layer of currentRootLayers) {
            if (!rootLayers.includes(layer)) {
                map.layers.remove(layer);
            }
        }

        rootLayers.sort((a, b) => {
            const orderA = layerConfig.find(c => c.id === a.id)?.order ?? 0;
            const orderB = layerConfig.find(c => c.id === b.id)?.order ?? 0;
            return orderB - orderA; // Descending order for Esri API
        });

        for (const layer of rootLayers) {
            if (!map.layers.includes(layer)) {
                map.add(layer);
            }
        }
    }

    private getView(): Promise<__esri.MapView | __esri.SceneView | undefined> {
        const mapWidgetModel = this._mapWidgetModel;
        if (!mapWidgetModel) {
            return Promise.reject("MapWidgetModel is not set.");
        }
        return new Promise((resolve) => {
            if (mapWidgetModel.view) {
                resolve(mapWidgetModel.view);
            } else {
                const watcher = mapWidgetModel.watch("view", ({ value: view }) => {
                    watcher.remove();
                    resolve(view);
                });
            }
        });
    }

    private getFlattenLayers(layers: __esri.Collection<__esri.Layer>): __esri.Collection<__esri.Layer> {
        return layers.flatten(item => {
            if ('layers' in item) {
                return (item as any).layers;
            }
            if ('sublayers' in item) {
                return (item as any).sublayers;
            }
            return null;
        });
    }
}
