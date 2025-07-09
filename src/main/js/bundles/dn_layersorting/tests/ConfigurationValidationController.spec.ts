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

/* eslint-disable @typescript-eslint/no-unused-expressions */

import { expect } from "chai";
import { ConfigurationValidationController } from '../controllers/ConfigurationValidationController';

import type { LayerConfig, LayerDefinition } from '../api';

describe('ConfigurationValidationController.validate', () => {
    const availableLayers: LayerDefinition[] = [
        { id: 'a', type: 'layer' },
        { id: 'b', type: 'layer' },
        { id: 'c', type: 'layer' },
        { id: 'group1', type: 'group' }
    ];

    it('should return valid for unique IDs and valid parents', () => {
        const config: LayerConfig[] = [
            { id: 'a' },
            { id: 'b', newParentId: 'a' },
            { id: 'c', newParentId: 'b' }
        ];
        const controller = new ConfigurationValidationController(config, availableLayers);
        const result = controller.validate();
        expect(result.valid).to.be.true;
        expect(result.errors).to.be.empty;
    });

    it('should detect duplicate IDs', () => {
        const config: LayerConfig[] = [
            { id: 'a' },
            { id: 'a' }
        ];
        const controller = new ConfigurationValidationController(config, availableLayers);
        const result = controller.validate();
        expect(result.valid).to.be.false;
        expect(result.errors.some(e => e.includes('Duplicate ID'))).to.be.true;
    });

    it('should detect invalid parent reference', () => {
        const config: LayerConfig[] = [
            { id: 'a', newParentId: 'b' },
            { id: 'b' }
        ];
        const controller = new ConfigurationValidationController(config, availableLayers);
        const result = controller.validate();
        expect(result.valid).to.be.false;
        expect(result.errors.some(e => e.includes('Invalid parent reference'))).to.be.true;
    });

    it('should detect cycles in hierarchy', () => {
        const config: LayerConfig[] = [
            { id: 'a', newParentId: 'c' },
            { id: 'b', newParentId: 'a' },
            { id: 'c', newParentId: 'b' }
        ];
        const controller = new ConfigurationValidationController(config, availableLayers);
        const result = controller.validate();
        expect(result.valid).to.be.false;
        expect(result.errors.some(e => e.includes('Cycle detected'))).to.be.true;
    });

    it('should detect config ID not matching any available layer', () => {
        const config: LayerConfig[] = [
            { id: 'not_existing' }
        ];
        const controller = new ConfigurationValidationController(config, availableLayers);
        const result = controller.validate();
        expect(result.valid).to.be.false;
        expect(result.errors.some(e => e.includes('does not match any available layer'))).to.be.true;
    });
});
