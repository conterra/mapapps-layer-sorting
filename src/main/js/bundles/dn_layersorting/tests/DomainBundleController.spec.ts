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

    it("should set up layer filtering with watchers", () => {
        const config: DomainBundleConfig = {
            "domain-sample_1": true,   // Show remaining content
            "domain-sample_2": false   // Hide remaining content
        };

        const controller = new DomainBundleController(config);

        // Mock map with layers
        const mockMap = {
            layers: {
                toArray: () => [
                    { id: "layer_domain_1", bundleId: "domain-sample_1" },
                    { id: "grouplayer_2", bundleId: "domain-sample_2" },
                    { id: "koeln1" },
                    { id: "unsorted_domain_1", url: "https://services2.arcgis.com/jUpNdisbWqRpMo35/arcgis/rest/services/Hamburg_Schulen/FeatureServer/0" },
                    { id: "unsorted_domain_2", url: "https://services.conterra.de/arcgis/rest/services/test/FeatureServer/0" }
                ],
                flatten: () => {
                    return {
                        toArray: () => [
                            { id: "layer_domain_1", bundleId: "domain-sample_1" },
                            { id: "grouplayer_2", bundleId: "domain-sample_2" },
                            { id: "koeln1" },
                            { id: "unsorted_domain_1", url: "https://services2.arcgis.com/jUpNdisbWqRpMo35/arcgis/rest/services/Hamburg_Schulen/FeatureServer/0" },
                            { id: "unsorted_domain_2", url: "https://services.conterra.de/arcgis/rest/services/test/FeatureServer/0" }
                        ],
                        forEach: (callback: any) => {
                            const layers = [
                                { id: "layer_domain_1", bundleId: "domain-sample_1" },
                                { id: "grouplayer_2", bundleId: "domain-sample_2" },
                                { id: "koeln1" },
                                { id: "unsorted_domain_1", url: "https://services2.arcgis.com/jUpNdisbWqRpMo35/arcgis/rest/services/Hamburg_Schulen/FeatureServer/0" },
                                { id: "unsorted_domain_2", url: "https://services.conterra.de/arcgis/rest/services/test/FeatureServer/0" }
                            ];
                            layers.forEach(callback);
                        }
                    };
                },
                on: () => {}, // Mock event handler
                remove: () => {} // Mock remove method
            }
        } as any;

        const sortedLayerIds = ["layer_domain_1", "grouplayer_2"];

        // This should not throw an error and should set up the filtering
        expect(() => {
            controller.setupLayerFiltering(mockMap, sortedLayerIds);
        }).to.not.throw();
    });
});
