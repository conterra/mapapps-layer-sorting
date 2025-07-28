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
import { LayerSortingController } from '../controllers/LayerSortingController';

describe('LayerSortingController', () => {
    function createMockMapWidgetModel(view?: any): any {
        return {
            view,
            watch: (prop: string, cb: any) => {
                setTimeout(() => cb({ value: view }), 10);
                return { remove: () => {} };
            },
            $super: () => {},
            get: () => {},
            set: () => {},
            _mutableMembers: {}
        };
    }

    it('should sort root layers by ascending order', async () => {
        // Mock layers
        const layerA = { id: 'group1_new' };
        const layerB = { id: 'koeln2' };
        const layerC = { id: 'koeln3' };
        const mockLayers = [layerA, layerB, layerC];
        const mockMap = {
            layers: {
                flatten: () => mockLayers
            },
            removeAll: () => {},
            add: function(layer: { id: string }) {
                (this._added as string[]).push(layer.id);
            },
            _added: [] as string[]
        };
        const mockView = { map: mockMap };
        const config: { id: string; order: number }[] = [
            { id: 'group1_new', order: 4 },
            { id: 'koeln2', order: 1 },
            { id: 'koeln3', order: 0 }
        ];
        // Provide dummy arguments for LayerSortingController constructor
        const controller = new LayerSortingController(createMockMapWidgetModel(mockView), config, undefined as any, undefined as any);
        await controller.restructureLayers(config);
        expect(mockMap._added).to.deep.equal(['koeln3', 'koeln2', 'group1_new']);
    });

    it('should handle empty layers gracefully', async () => {
        const mockMap = {
            layers: {
                flatten: () => []
            },
            removeAll: () => {},
            add: function(layer: { id: string }) {
                (this._added as string[]).push(layer.id);
            },
            _added: [] as string[]
        };
        const mockView = { map: mockMap };
        const config: { id: string; order?: number }[] = [];
        // Provide dummy arguments for LayerSortingController constructor
        const controller = new LayerSortingController(createMockMapWidgetModel(mockView), config, undefined as any, undefined as any);
        await controller.restructureLayers(config);
        expect(mockMap._added).to.deep.equal([]);
    });
});
