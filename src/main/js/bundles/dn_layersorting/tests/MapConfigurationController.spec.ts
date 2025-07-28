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
import { MapConfigurationController } from '../controllers/MapConfigurationController';

describe('MapConfigurationController', () => {
    function createMockMapWidgetModel(view?: any): any {
        return {
            view,
            watch: (prop: string, cb: any) => {
                // Simulate watcher
                // Always trigger callback immediately for tests
                cb({ value: view });
                return { remove: () => {} };
            },
            $super: () => {},
            get: () => {},
            set: () => {},
            _mutableMembers: {}
        };
    }

    it('should resolve with map layers JSON if view and map are available', async () => {
        const mockLayers = { toJSON: () => [{ id: 'layer1' }] };
        const mockMap = { layers: mockLayers };
        const mockView = { map: mockMap };
        const controller = new MapConfigurationController(createMockMapWidgetModel(mockView));
        const promise = controller.getMapConfiguration();
        const result = await promise;
        expect(result).to.deep.equal([{ id: 'layer1' }]);
    });

    it('should reject if view is not available', async () => {
        const controller = new MapConfigurationController(createMockMapWidgetModel(undefined));
        try {
            await controller.getMapConfiguration();
            throw new Error('Should have thrown');
        } catch (e) {
            expect((e as Error).message).to.equal('Map view is not available.');
        }
    });

    it('should reject if map is not available in the view', async () => {
        const mockView = { map: undefined };
        const controller = new MapConfigurationController(createMockMapWidgetModel(mockView));
        try {
            await controller.getMapConfiguration();
            throw new Error('Should have thrown');
        } catch (e) {
            expect((e as Error).message).to.equal('Map is not available in the view.');
        }
    });
});
