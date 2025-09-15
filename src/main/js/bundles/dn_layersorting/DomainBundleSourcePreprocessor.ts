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

import type { ConfigFragment, Disposable, InterpretationOptions, ConfigFragmentInterpreter } from "domains-system/api";

interface LayerConfig {
    [n: string]: any;
    id: string | number;
    layers?: ReadonlyArray<LayerConfig>;
    sublayers?: ReadonlyArray<LayerConfig>;
}

export class DomainBundleSourcePreprocessor implements ConfigFragmentInterpreter {
    async interpret(
        bundleConfig: ConfigFragment,
        { bundle }: InterpretationOptions
    ): Promise<Disposable | void> {
        const bundleLayers: LayerConfig[] | undefined = bundleConfig.getConfig("map-layers");
        if (!bundleLayers || !bundleLayers.length) {
            return;
        }

        const symbolicName = bundle.getSymbolicName();
        bundleLayers.forEach((layerConfig: LayerConfig) => {
            layerConfig["_sourceDomainBundle"] = symbolicName;

            if (layerConfig.layers && layerConfig.layers.length > 0) {
                layerConfig.layers.forEach((subLayerConfig: LayerConfig) => {
                    subLayerConfig["_sourceDomainBundle"] = symbolicName;
                });
            }

            if (layerConfig.sublayers && layerConfig.sublayers.length > 0) {
                layerConfig.sublayers.forEach((subLayerConfig: LayerConfig) => {
                    subLayerConfig["_sourceDomainBundle"] = symbolicName;
                });
            }
        });
    }
}
