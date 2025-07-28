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

import { expect } from "chai";
import { DomainBundleController } from "../controllers/DomainBundleController";
import type { DomainBundleConfig } from "../api";

describe("DomainBundleController", () => {

    it("should initialize with correct domain bundles", () => {
        const config: DomainBundleConfig = {
            "domain-sample_1": true,
            "domain-sample_2": false
        };

        const controller = new DomainBundleController(config);
        expect(controller).to.be.instanceOf(DomainBundleController);
    });

    it("should filter layers based on bundle configuration", () => {
        const config: DomainBundleConfig = {
            "domain-sample_1": true,   // Show remaining content
            "domain-sample_2": false   // Hide remaining content
        };

        const controller = new DomainBundleController(config);

        // Mock layers with bundle information
        const mockLayers = {
            toArray: () => [
                { id: "layer_domain_1", bundleId: "domain-sample_1" }, // This has bundleId property
                { id: "grouplayer_2", bundleId: "domain-sample_2" }, // This has bundleId property
                { id: "koeln1" }, // Regular layer, not from domain bundle
                { id: "unsorted_domain_1", url: "https://services2.arcgis.com/jUpNdisbWqRpMo35/arcgis/rest/services/Hamburg_Schulen/FeatureServer/0" }, // From domain-sample_1 by URL
                { id: "unsorted_domain_2", url: "https://services.conterra.de/arcgis/rest/services/test/FeatureServer/0" } // From domain-sample_2 by URL
            ],
            flatten: () => {
                return {
                    toArray: () => [
                        { id: "layer_domain_1", bundleId: "domain-sample_1" },
                        { id: "grouplayer_2", bundleId: "domain-sample_2" },
                        { id: "koeln1" },
                        { id: "unsorted_domain_1", url: "https://services2.arcgis.com/jUpNdisbWqRpMo35/arcgis/rest/services/Hamburg_Schulen/FeatureServer/0" },
                        { id: "unsorted_domain_2", url: "https://services.conterra.de/arcgis/rest/services/test/FeatureServer/0" }
                    ]
                };
            }
        } as any;

        const sortedLayerIds = ["layer_domain_1", "grouplayer_2"]; // These are explicitly sorted

        const result = controller.filterLayersBasedOnBundleConfig(mockLayers, sortedLayerIds);

        // Should include:
        // - koeln1 (regular layer)
        // - layer_domain_1 (sorted from domain-sample_1)
        // - grouplayer_2 (sorted from domain-sample_2)
        // - unsorted_domain_1 (from domain-sample_1, showRemainingBundleContents=true)
        // Should exclude:
        // - unsorted_domain_2 (from domain-sample_2, showRemainingBundleContents=false)

        const resultIds = result.map(layer => layer.id);
        expect(resultIds).to.include("koeln1");
        expect(resultIds).to.include("layer_domain_1");
        expect(resultIds).to.include("grouplayer_2");
        expect(resultIds).to.include("unsorted_domain_1");
        expect(resultIds).to.not.include("unsorted_domain_2");
    });
});
