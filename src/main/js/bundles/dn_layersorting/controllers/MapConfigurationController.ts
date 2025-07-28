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

import type { InjectedReference } from "apprt-core/InjectedReference";
import type { MapWidgetModel } from "map-widget/api";

export class MapConfigurationController {
    private _mapWidgetModel: InjectedReference<MapWidgetModel>;

    constructor(_mapWidgetModel: InjectedReference<MapWidgetModel>) {
        this._mapWidgetModel = _mapWidgetModel;
    }

    getMapConfiguration(): Record<string, any> {
        return this.getView().then((view) => {
            if (!view) {
                throw new Error("Map view is not available.");
            }

            const map = view.map;
            if (!map) {
                throw new Error("Map is not available in the view.");
            }

            // Check if layers has toJSON method (for mock compatibility)
            if (typeof (map.layers as any).toJSON === 'function') {
                return (map.layers as any).toJSON();
            }

            // Fallback for real ArcGIS API layers
            return map.layers.toArray();
        });
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
                mapWidgetModel.watch("view", ({ value: view }) => {
                    resolve(view);
                });
            }
        });
    }
}
