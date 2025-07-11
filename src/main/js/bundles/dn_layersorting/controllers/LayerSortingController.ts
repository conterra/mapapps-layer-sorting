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
import type { LayerConfig } from "../api";
import type { MapWidgetModel } from "map-widget/api";

export class LayerSortingController {
    private _mapWidgetModel: InjectedReference<MapWidgetModel>;
    private _config: LayerConfig[];

    constructor(_mapWidgetModel: InjectedReference<MapWidgetModel>, config: LayerConfig[]) {
        this._mapWidgetModel = _mapWidgetModel;
        this._config = config;
    }

    async restructureLayers(config: LayerConfig[]): Promise<void> {
        const view = await this.getView();
        const map = view?.map;
        const mapLayers = map?.layers;

        if (!mapLayers) {
            throw new Error("Map layers are not available.");
        }

        const availableLayers = this.getFlattenLayers(mapLayers);
        const idToLayer = new Map<string, __esri.Layer>();
        const idToGroup = new Map<string, __esri.GroupLayer>();
        const rootLayers: __esri.Layer[] = [];

        // Vorab: Mapping Layer-IDs zu tatsächlichen Layer-Objekten
        for (const layer of availableLayers) {
            idToLayer.set(layer.id, layer);
        }

        // Erzeuge Gruppenstrukturen und fülle diese
        for (const entry of config) {
            let layer = idToLayer.get(entry.id);

            if (!layer) {
                // Neue Gruppe erzeugen
                layer = new GroupLayer({
                    id: entry.id,
                    title: entry.id,
                    visible: true,
                    layers: []
                });
                idToGroup.set(entry.id, layer as __esri.GroupLayer);
            } else if (layer.type === 'group') {
                idToGroup.set(entry.id, layer as __esri.GroupLayer);
            }

            // Gruppierung zuweisen
            if (entry.newParentId) {
                const parentGroup = idToGroup.get(entry.newParentId);
                if (parentGroup) {
                    const children = parentGroup.layers.toArray();
                    children.push(layer);
                    parentGroup.layers.removeAll();
                    parentGroup.layers.addMany(
                        children.sort((a, b) => {
                            const orderA = config.find(c => c.id === a.id)?.order ?? 0;
                            const orderB = config.find(c => c.id === b.id)?.order ?? 0;
                            return orderB - orderA;
                        })
                    );
                }
            } else {
                rootLayers.push(layer);
            }
        }

        // Map säubern und neue Struktur einfügen
        map.removeAll();
        // Sort rootLayers by config order before adding
        rootLayers.sort((a, b) => {
            const orderA = config.find(c => c.id === a.id)?.order ?? 0;
            const orderB = config.find(c => c.id === b.id)?.order ?? 0;
            return orderB - orderA;
        });
        for (const layer of rootLayers) {
            map.add(layer);
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
        return layers.flatten(item => item.layers || item.sublayers);
    }
}
