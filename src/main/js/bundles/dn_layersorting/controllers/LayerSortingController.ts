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

import { DomainBundleController } from "./DomainBundleController";
import type { InjectedReference } from "apprt-core/InjectedReference";
import type { LayerConfig, DomainBundleConfig } from "../api";
import type { MapWidgetModel } from "map-widget/api";
import type { LogNotificationService } from "apprt/api";

export class LayerSortingController {
    private _mapWidgetModel: InjectedReference<MapWidgetModel>;
    private _config: LayerConfig[];
    private _logService: InjectedReference<LogNotificationService>;
    private _domainBundleController: DomainBundleController | null = null;
    private successNotification: string;

    constructor(
        _mapWidgetModel: InjectedReference<MapWidgetModel>,
        config: LayerConfig[],
        logService: InjectedReference<LogNotificationService>,
        successNotification: string,
        showRemainingBundleContents?: DomainBundleConfig
    ) {
        this._mapWidgetModel = _mapWidgetModel;
        this._config = config;
        this._logService = logService;
        this.successNotification = successNotification;

        // Initialize domain bundle controller if configuration is provided
        if (showRemainingBundleContents) {
            this._domainBundleController = new DomainBundleController(showRemainingBundleContents);
        }
    }

    async restructureLayers(config: LayerConfig[]): Promise<void> {
        const view = await this.getView();
        const map = view?.map;
        const mapLayers = map?.layers;

        if (!mapLayers) {
            throw new Error("Map layers are not available.");
        }

        // Get sorted layer IDs from config for domain bundle filtering
        const sortedLayerIds = config.map(entry => entry.id);

        // Filter layers based on domain bundle configuration
        if (this._domainBundleController) {
            const filteredLayers = this._domainBundleController.filterLayersBasedOnBundleConfig(
                mapLayers,
                sortedLayerIds
            );

            // Remove layers that should be filtered out
            const currentLayers = mapLayers.toArray();
            for (const layer of currentLayers) {
                if (!filteredLayers.includes(layer)) {
                    mapLayers.remove(layer);
                }
            }
        }

        const availableLayers = this.getFlattenLayers(mapLayers);
        const idToLayer = new Map<string, __esri.Layer>();
        const idToGroup = new Map<string, __esri.GroupLayer>();
        const rootLayers: __esri.Layer[] = [];

        // Build initial layer mappings
        const availableLayersArray = availableLayers.toArray();
        for (const layer of availableLayersArray) {
            idToLayer.set(layer.id, layer);
            if (layer.type === 'group') {
                idToGroup.set(layer.id, layer as __esri.GroupLayer);
            }
        }

        // First pass: ensure all referenced parent groups exist
        const createdParentGroups = new Set<string>();
        for (const entry of config) {
            if (entry.newParentId && !idToGroup.has(entry.newParentId)) {
                // Create parent group if it doesn't exist
                const parentLayer = idToLayer.get(entry.newParentId);
                if (!parentLayer || parentLayer.type !== 'group') {
                    const newGroup = new GroupLayer({
                        id: entry.newParentId,
                        title: entry.newParentId,
                        visible: true,
                        layers: []
                    });
                    idToLayer.set(entry.newParentId, newGroup);
                    idToGroup.set(entry.newParentId, newGroup);
                    createdParentGroups.add(entry.newParentId);
                }
            }
        }

        // Second pass: create missing layers and process hierarchy
        for (const entry of config) {
            let layer = idToLayer.get(entry.id);

            if (!layer) {
                // Create new group layer if it doesn't exist
                layer = new GroupLayer({
                    id: entry.id,
                    title: entry.id,
                    visible: true,
                    layers: []
                });
                idToLayer.set(entry.id, layer);
                idToGroup.set(entry.id, layer as __esri.GroupLayer);
            } else if (layer.type === 'group') {
                idToGroup.set(entry.id, layer as __esri.GroupLayer);
            }

            if (entry.newParentId) {
                const parentGroup = idToGroup.get(entry.newParentId);
                if (parentGroup) {
                    // Remove layer from current parent (if any)
                    if (layer.parent && 'layers' in layer.parent) {
                        (layer.parent as __esri.GroupLayer).layers.remove(layer);
                    } else {
                        // Layer might be at root level
                        map.layers.remove(layer);
                    }

                    // Add to new parent
                    const children = parentGroup.layers.toArray();
                    children.push(layer);
                    parentGroup.layers.removeAll();
                    parentGroup.layers.addMany(
                        children.sort((a, b) => {
                            const orderA = config.find(c => c.id === a.id)?.order ?? 0;
                            const orderB = config.find(c => c.id === b.id)?.order ?? 0;
                            return orderB - orderA; // Descending order for Esri API
                        })
                    );
                } else {
                    throw new Error(`Parent group '${entry.newParentId}' not found for layer '${entry.id}'`);
                }
            } else {
                // Remove from current parent if moving to root
                if (layer.parent && 'layers' in layer.parent) {
                    (layer.parent as __esri.GroupLayer).layers.remove(layer);
                }
                rootLayers.push(layer);
            }
        }

        // Add created parent groups that don't have config entries to root layers
        for (const parentId of createdParentGroups) {
            const hasConfigEntry = config.some(entry => entry.id === parentId);
            if (!hasConfigEntry) {
                const parentGroup = idToLayer.get(parentId);
                if (parentGroup) {
                    rootLayers.push(parentGroup);
                }
            }
        }

        // Add root layers to map (only new ones or ones that need reordering)
        const currentRootLayers = map.layers.toArray();
        for (const layer of currentRootLayers) {
            if (!rootLayers.includes(layer)) {
                map.layers.remove(layer);
            }
        }

        rootLayers.sort((a, b) => {
            const orderA = config.find(c => c.id === a.id)?.order ?? 0;
            const orderB = config.find(c => c.id === b.id)?.order ?? 0;
            return orderB - orderA; // Descending order for Esri API
        });

        for (const layer of rootLayers) {
            if (!map.layers.includes(layer)) {
                map.add(layer);
            }
        }

        this._logService?.info(this.successNotification);
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
