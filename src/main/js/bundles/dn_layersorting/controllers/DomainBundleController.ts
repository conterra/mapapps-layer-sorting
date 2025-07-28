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

import type { DomainBundleConfig } from "../api";

export class DomainBundleController {
    private _domainBundles: Set<string>;
    private _showRemainingBundleContents: DomainBundleConfig;

    constructor(showRemainingBundleContents: DomainBundleConfig) {
        this._showRemainingBundleContents = showRemainingBundleContents;
        this._domainBundles = new Set(Object.keys(showRemainingBundleContents));
    }

    /**
     * Identifies which layers come from domain bundles by checking layer metadata
     */
    identifyDomainBundleLayers(layers: __esri.Collection<__esri.Layer>): Map<string, string[]> {
        const bundleLayerMap = new Map<string, string[]>();

        // Initialize maps for known domain bundles
        this._domainBundles.forEach(bundleId => {
            bundleLayerMap.set(bundleId, []);
        });

        // Flatten all layers to check each one
        const allLayers = this.getFlattenLayers(layers);

        allLayers.forEach(layer => {
            // Check if layer has domain bundle metadata
            const bundleId = this.getBundleIdFromLayer(layer);
            if (bundleId && this._domainBundles.has(bundleId)) {
                const layerIds = bundleLayerMap.get(bundleId) || [];
                layerIds.push(layer.id);
                bundleLayerMap.set(bundleId, layerIds);
            }
        });

        return bundleLayerMap;
    }

    /**
     * Filters out layers from domain bundles that should not be shown
     * based on the showRemainingBundleContents configuration
     */
    filterLayersBasedOnBundleConfig(
        layers: __esri.Collection<__esri.Layer>,
        sortedLayerIds: string[]
    ): __esri.Layer[] {
        const allLayers = this.getFlattenLayers(layers).toArray();
        const layersToKeep: __esri.Layer[] = [];

        for (const layer of allLayers) {
            const bundleId = this.getBundleIdFromLayer(layer);

            // If layer is not from a domain bundle, keep it
            if (!bundleId || !this._domainBundles.has(bundleId)) {
                layersToKeep.push(layer);
                continue;
            }

            // If layer is explicitly sorted, keep it
            if (sortedLayerIds.includes(layer.id)) {
                layersToKeep.push(layer);
                continue;
            }

            // If remaining content should be shown for this bundle, keep it
            if (this._showRemainingBundleContents[bundleId] === true) {
                layersToKeep.push(layer);
            }
            // Otherwise, filter it out (don't add to layersToKeep)
        }

        return layersToKeep;
    }

    /**
     * Gets the bundle ID from a layer's metadata
     * This is a simplified implementation - in a real scenario, you might need to check
     * layer properties, custom metadata, or use other mechanisms to identify the source bundle
     */
    private getBundleIdFromLayer(layer: __esri.Layer): string | null {
        // Method 1: Check if layer has custom properties indicating bundle origin
        if ((layer as any).bundleId) {
            return (layer as any).bundleId;
        }

        // Method 2: Check layer source URL patterns or other identifiers
        // This is where you would implement domain-specific logic to identify
        // which bundle a layer comes from based on its properties

        // For the sample data, we can identify layers by their IDs or URLs
        if (layer.id === 'layer_domain_1') {
            return 'domain-sample_1';
        }

        if (layer.id === 'grouplayer_2') {
            return 'domain-sample_2';
        }

        // Method 3: Check layer URL patterns
        if ('url' in layer) {
            const url = (layer as any).url as string;
            if (url?.includes('Hamburg_Schulen')) {
                return 'domain-sample_1';
            }
            if (url?.includes('services.conterra.de')) {
                return 'domain-sample_2';
            }
        }

        return null;
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
