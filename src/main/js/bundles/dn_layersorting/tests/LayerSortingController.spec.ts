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

    function createMockLogService(): any {
        return {
            info: (_message: string) => {},
            error: (_message: string) => {},
            warn: (_message: string) => {}
        };
    }

    function createMockCollection(items: any[] = []): any {
        return {
            _items: [...items],
            get length() {
                return this._items.length;
            },
            get items() {
                return this._items;
            },
            flatten: function(fn: any) {
                const result: any[] = [];
                for (const item of this._items) {
                    result.push(item);
                    const children = fn ? fn(item) : null;
                    if (children && children._items) {
                        result.push(...children._items);
                    }
                }
                return createMockCollection(result);
            },
            toArray: function() {
                return [...this._items];
            },
            remove: function(layer: any) {
                const index = this._items.findIndex((item: any) => item.id === layer.id);
                if (index > -1) {
                    this._items.splice(index, 1);
                }
            },
            removeAll: function() {
                this._items.length = 0;
            },
            add: function(layer: any) {
                this._items.push(layer);
            },
            addMany: function(layers: any[]) {
                this._items.push(...layers);
            },
            includes: function(layer: any) {
                return this._items.includes(layer);
            },
            forEach: function(callback: any) {
                this.items.forEach(callback);
            }
        };
    }

    function createMockLayer(id: string, type: string = 'layer', parent?: any): any {
        const layer: any = {
            id,
            type,
            parent: parent || { parent: null }
        };

        if (type === 'group') {
            layer.layers = createMockCollection();
        }

        return layer;
    }

    it('should sort root layers by descending order (Esri API convention)', async () => {
        // Mock layers
        const layerA = createMockLayer('group1_new');
        const layerB = createMockLayer('koeln2');
        const layerC = createMockLayer('koeln3');

        const mockLayers = createMockCollection([layerA, layerB, layerC]);
        const mockMap = {
            layers: mockLayers,
            add: function(layer: any) {
                this.layers.add(layer);
            },
            remove: function(layer: any) {
                this.layers.remove(layer);
            }
        };

        const mockView = { map: mockMap };
        const config = [
            { id: 'group1_new', order: 4 },
            { id: 'koeln2', order: 1 },
            { id: 'koeln3', order: 0 }
        ];

        const controller = new LayerSortingController(
            createMockMapWidgetModel(mockView), createMockLogService(), "Success");

        await controller.restructureLayers(config, {});

        // Check that layers are sorted in descending order (higher order first)
        const layerOrder = mockMap.layers.toArray().map((l: any) => l.id);
        expect(layerOrder).to.deep.equal(['group1_new', 'koeln2', 'koeln3']);
    });

    it('should handle empty layers gracefully', async () => {
        const mockLayers = createMockCollection([]);
        const mockMap = {
            layers: mockLayers,
            add: function(layer: any) {
                this.layers.add(layer);
            },
            remove: function(layer: any) {
                this.layers.remove(layer);
            }
        };

        const mockView = { map: mockMap };
        const config: any[] = [];

        const controller = new LayerSortingController(
            createMockMapWidgetModel(mockView), createMockLogService(), "Success");

        await controller.restructureLayers(config, {});

        expect(mockMap.layers.toArray()).to.deep.equal([]);
    });

    it('should create missing layers as group layers', async () => {
        // Start with some existing layers to ensure the controller processes correctly
        const existingLayer = createMockLayer('existing', 'layer');
        const mockLayers = createMockCollection([existingLayer]);
        const mockMap = {
            layers: mockLayers,
            add: function(layer: any) {
                this.layers.add(layer);
            },
            remove: function(layer: any) {
                this.layers.remove(layer);
            }
        };

        const mockView = { map: mockMap };
        const config = [
            { id: 'existing', order: 0 },  // Include existing layer in config
            { id: 'newlayer', order: 1 }   // This should be created
        ];

        const controller = new LayerSortingController(
            createMockMapWidgetModel(mockView), createMockLogService(), "Success");

        await controller.restructureLayers(config, {});

        const addedLayers = mockMap.layers.toArray();
        // Should have both existing and new layer
        expect(addedLayers).to.have.length(2);

        const newLayer = addedLayers.find((l: any) => l.id === 'newlayer');
        expect(newLayer).to.not.equal(undefined);
        expect(newLayer.type).to.equal('group');
    });

    it('should handle parent-child relationships correctly', async () => {
        const parentGroup = createMockLayer('parentgroup', 'group');
        const childLayer = createMockLayer('childlayer');

        const mockLayers = createMockCollection([parentGroup, childLayer]);
        const mockMap = {
            layers: mockLayers,
            add: function(layer: any) {
                this.layers.add(layer);
            },
            remove: function(layer: any) {
                this.layers.remove(layer);
            }
        };

        const mockView = { map: mockMap };
        const config = [
            { id: 'parentgroup', order: 0 },
            { id: 'childlayer', newParentId: 'parentgroup', order: 1 }
        ];

        const controller = new LayerSortingController(
            createMockMapWidgetModel(mockView), createMockLogService(), "Success");

        await controller.restructureLayers(config, {});

        // Parent should be in root layers
        const rootLayers = mockMap.layers.toArray();
        expect(rootLayers.some((l: any) => l.id === 'parentgroup')).to.equal(true);

        // Child should be in parent's layers collection
        const childrenInParent = parentGroup.layers.toArray();
        expect(childrenInParent.some((l: any) => l.id === 'childlayer')).to.equal(true);
    });

    it('should create missing parent groups automatically', async () => {
        const childLayer = createMockLayer('childlayer');

        const mockLayers = createMockCollection([childLayer]);
        const mockMap = {
            layers: mockLayers,
            add: function(layer: any) {
                this.layers.add(layer);
            },
            remove: function(layer: any) {
                this.layers.remove(layer);
            }
        };

        const mockView = { map: mockMap };
        const config = [
            { id: 'childlayer', newParentId: 'missingparent', order: 1 }
        ];

        const controller = new LayerSortingController(
            createMockMapWidgetModel(mockView), createMockLogService(), "Success");

        await controller.restructureLayers(config, {});

        // The missing parent should be created and added to root
        const rootLayers = mockMap.layers.toArray();
        const createdParent = rootLayers.find((l: any) => l.id === 'missingparent');
        expect(createdParent).to.not.equal(undefined);
        expect(createdParent.type).to.equal('group');
    });

    it('should handle complex nested hierarchies with ordering', async () => {
        const groupA = createMockLayer('groupA', 'group');
        const groupB = createMockLayer('groupB', 'group');
        const layer1 = createMockLayer('layer1');
        const layer2 = createMockLayer('layer2');
        const layer3 = createMockLayer('layer3');

        const mockLayers = createMockCollection([groupA, groupB, layer1, layer2, layer3]);
        const mockMap = {
            layers: mockLayers,
            add: function(layer: any) {
                this.layers.add(layer);
            },
            remove: function(layer: any) {
                this.layers.remove(layer);
            }
        };

        const mockView = { map: mockMap };
        const config = [
            { id: 'groupA', order: 3 },
            { id: 'groupB', order: 1 },
            { id: 'layer1', newParentId: 'groupA', order: 2 },
            { id: 'layer2', newParentId: 'groupA', order: 1 },
            { id: 'layer3', newParentId: 'groupB', order: 1 }
        ];

        const controller = new LayerSortingController(
            createMockMapWidgetModel(mockView), createMockLogService(), "Success");

        await controller.restructureLayers(config, {});

        // Check root layer ordering (descending)
        const rootLayers = mockMap.layers.toArray();
        const rootIds = rootLayers.map((l: any) => l.id);
        expect(rootIds).to.deep.equal(['groupA', 'groupB']);

        // Check children ordering within groups (descending)
        const groupAChildren = groupA.layers.toArray().map((l: any) => l.id);
        expect(groupAChildren).to.deep.equal(['layer1', 'layer2']);

        const groupBChildren = groupB.layers.toArray().map((l: any) => l.id);
        expect(groupBChildren).to.deep.equal(['layer3']);
    });
});
